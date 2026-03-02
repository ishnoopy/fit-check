import _ from "lodash";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { IMessage } from "../models/conversation.model.js";
import type { ILog } from "../models/log.model.js";
import * as coachAdviceRepository from "../repositories/coach-advice.repository.js";
import * as conversationRepository from "../repositories/conversation.repository.js";
import * as logRepository from "../repositories/log.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  matchExerciseDeterministic,
} from "../utils/exercise-matcher.js";
import {
  COACH_INTENT,
  INTENT_CONTEXT_CONFIG,
  type ChatHistoryMessage,
  type CoachAdviceItem,
  type CoachContext,
  type CoachIntent,
  type CoachProfile,
  type ExerciseMatchResult,
  type ExerciseSummary,
  type ExerciseTrend,
  type SessionData,
  type WorkoutSummary
} from "../utils/types/coach.types.js";
import * as conversationService from "./conversation.service.js";
import * as openaiService from "./openai.service.js";

const GOAL_MAP: Record<string, string> = {
  strength: "strength",
  hypertrophy: "hypertrophy",
  fat_loss: "fat_loss",
  endurance: "endurance",
  general_fitness: "general_fitness",
  gain_muscle: "hypertrophy",
  lose_weight: "fat_loss",
  maintain: "general_fitness",
  improve_endurance: "endurance",
};

const EXPERIENCE_MAP: Record<string, string> = {
  sedentary: "beginner",
  lightly_active: "beginner",
  moderately_active: "intermediate",
  very_active: "advanced",
  extremely_active: "advanced",
};

const DAYS_TO_FETCH_RECENT_LOGS = 45;
const DAYS_TO_FETCH_RECENT_ADVICE = 14;
const MAX_ADVICE_ITEMS_FOR_LLM = 4;
const FATIGUE_THRESHOLD_HIGH = 6;
const FATIGUE_THRESHOLD_MEDIUM = 4;
const TREND_SESSIONS_COUNT = 3;
const TREND_THRESHOLD_PERCENT = 5;
const MILLISECONDS_IN_DAY = 86_400_000;
const MAX_PERSISTED_HISTORY_MESSAGES = 10;
const EXERCISE_MATCH_CONFIDENCE_THRESHOLD = 0.6;
const MAX_CONVERSATION_TITLE_LENGTH = 50;
const MAX_SESSIONS_PER_EXERCISE_FOR_LLM = 6;
const MAX_EXERCISES_FOR_LLM_WHEN_FOCUSED = 8;
const MAX_EXERCISES_FOR_LLM_BROAD = 14;
const MAX_NOTE_LENGTH_FOR_LLM = 120;
const MAX_CHAT_MESSAGE_LENGTH_FOR_LLM = 180;
const MAX_ADVICE_TEXT_LENGTH_FOR_LLM = 200;
const EFFORT_LABELS = [
  { min: 9, label: "max effort" },
  { min: 8, label: "very hard" },
  { min: 7, label: "hard but controlled" },
  { min: 6, label: "moderate" },
  { min: 0, label: "light" },
];

interface PrepareChatSessionInput {
  userId: string;
  message: string;
  intent?: CoachIntent;
  conversationId?: string;
  chatHistory?: ChatHistoryMessage[];
}

interface PrepareChatSessionResult {
  intent: CoachIntent;
  chatHistory?: ChatHistoryMessage[];
}

interface PersistChatExchangeInput {
  userId: string;
  conversationId?: string;
  userMessage: string;
  coachResponse: string;
  intent: CoachIntent;
  focusedExercise?: string;
}

interface BuildChatMessagesResult {
  messages: ChatCompletionMessageParam[];
  focusedExercise?: string;
}

interface StreamCoachResponseResult {
  stream: AsyncIterable<string>;
  focusedExercise?: string;
}

/**
 * Build a coach profile from the user's stored data and recent workout history.
 */
async function buildCoachProfile(
  userId: string,
  recentLogs?: ILog[],
): Promise<CoachProfile> {
  const user = await userRepository.findOne({ id: userId });
  const logs = recentLogs ?? await fetchRecentLogs(userId, DAYS_TO_FETCH_RECENT_LOGS);
  const averageRPE = calculateAverageRPE(logs);
  // const fatigueStatus = deriveFatigueStatus(recentLogs);
  const activePlateaus = identifyPlateaus(logs);
  return {
    goal: mapGoal(user?.fitnessGoal),
    experienceLevel: mapExperienceLevel(user?.activityLevel),
    preferredIntensityRPE: averageRPE,
    // fatigueStatus,
    activePlateaus,
  };
}

/**
 * Build a minimal coach profile with only goal and experience level.
 */
async function buildMinimalCoachProfile(
  userId: string,
): Promise<Partial<CoachProfile>> {
  const user = await userRepository.findOne({ id: userId });
  return {
    goal: mapGoal(user?.fitnessGoal),
    experienceLevel: mapExperienceLevel(user?.activityLevel),
  };
}

/**
 * Build a workout summary for the given intent's time window.
 * Optionally filters to a specific exercise if provided.
 */
async function buildWorkoutSummary(
  userId: string,
  depthDays: number,
  exerciseFilter?: string,
): Promise<WorkoutSummary> {
  const logs = await fetchRecentLogs(userId, depthDays);
  return buildWorkoutSummaryFromLogs(logs, exerciseFilter);
}

/**
 * Build a workout summary from pre-fetched logs.
 * Optionally filters to a specific exercise if provided.
 */
function buildWorkoutSummaryFromLogs(
  logs: ILog[],
  exerciseFilter?: string,
): WorkoutSummary {
  const filteredLogs = exerciseFilter
    ? filterLogsByExercise(logs, exerciseFilter)
    : logs;
  return aggregateExerciseSummaries(filteredLogs);
}

/**
 * Match an exercise from user message using deterministic parsing + LLM fallback.
 * Returns the matched exercise name or null if no confident match.
 */
async function matchExerciseFromMessage(
  userMessage: string,
  knownExercises: string[],
  allowLLMFallback = true,
): Promise<ExerciseMatchResult> {
  // Step 1: Try deterministic matching (synonyms + fuzzy)
  const deterministicResult = matchExerciseDeterministic(userMessage, knownExercises);
  if (
    deterministicResult.matchedExercise &&
    deterministicResult.confidence >= EXERCISE_MATCH_CONFIDENCE_THRESHOLD
  ) {
    return deterministicResult;
  }
  if (!allowLLMFallback) {
    return {
      matchedExercise: null,
      confidence: 0,
      method: "none",
    };
  }
  // Step 2: Fall back to LLM if deterministic matching is not confident
  const llmMatch = await openaiService.extractExerciseFromMessage(
    userMessage,
    knownExercises,
  );
  if (llmMatch) {
    return {
      matchedExercise: llmMatch,
      confidence: 0.85,
      method: "llm",
    };
  }
  return {
    matchedExercise: null,
    confidence: 0,
    method: "none",
  };
}

/**
 * Classify a free-text message's intent via OpenAI.
 */
async function classifyIntent(
  message: string,
): Promise<CoachIntent> {
  return openaiService.classifyIntent(message);
}

/**
 * Resolve chat session inputs required by the coach workflow.
 * Classifies intent when not provided and resolves persisted chat history.
 * Also detects if the message is about a specific exercise.
 */
export async function prepareChatSession(
  input: PrepareChatSessionInput,
): Promise<PrepareChatSessionResult> {
  let intent = input.intent ?? (await classifyIntent(input.message));
  let chatHistory = input.conversationId
    ? await buildChatHistoryFromConversation(input.conversationId, input.userId)
    : input.chatHistory;

  // If there are no logs for exercises done today, fallback from session feedback
  // to past-session feedback with a short continuity hint for better UX.
  if (intent === COACH_INTENT.SESSION_FEEDBACK) {
    const sessionFeedbackLogs = await buildSessionFeedbackLogs(
      input.userId,
      INTENT_CONTEXT_CONFIG[COACH_INTENT.SESSION_FEEDBACK].workoutSummaryDepthDays,
    );
    if (_.isEmpty(sessionFeedbackLogs)) {
      intent = COACH_INTENT.PAST_SESSION_FEEDBACK;
      chatHistory = [
        ...(chatHistory ?? []),
        {
          role: "coach",
          content:
            "No workout was logged today. Explain this briefly and offer to review the most recent session instead.",
        },
      ];
    }
  }

  return { intent, chatHistory };
}

/**
 * Load chat history from a persisted conversation and format it
 * as ChatHistoryMessage[] for the LLM context builder.
 * Uses the conversation summary + last N messages to stay token-efficient.
 */
async function buildChatHistoryFromConversation(
  conversationId: string,
  userId: string,
): Promise<ChatHistoryMessage[]> {
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation || (conversation.userId as string) !== userId) {
    return [];
  }
  const messages = conversation.messages ?? [];
  if (_.isEmpty(messages)) return [];
  const maxMessages = MAX_PERSISTED_HISTORY_MESSAGES;
  const recentMessages = _.takeRight(messages, maxMessages);
  const history: ChatHistoryMessage[] = _.map(recentMessages, (m) => ({
    role: m.role,
    content: m.content,
  }));
  if (conversation.summary && messages.length > maxMessages) {
    history.unshift({
      role: "coach",
      content: `[Previous conversation summary: ${conversation.summary}]`,
    });
  }
  return history;
}

/**
 * Assemble full context and return OpenAI-ready messages for streaming.
 * Automatically detects if user is asking about a specific exercise and filters context.
 */
async function buildChatMessages(
  userId: string,
  userMessage: string,
  intent: CoachIntent,
  chatHistory?: ChatHistoryMessage[],
): Promise<BuildChatMessagesResult> {
  const config = INTENT_CONTEXT_CONFIG[intent];
  // Fetch logs first to get known exercise names for matching.
  // SESSION_FEEDBACK only includes logs for exercises trained today.
  const logsForIntent = config.needsWorkoutSummary
    ? await getLogsForIntent(userId, intent, config.workoutSummaryDepthDays)
    : [];
  // Try to detect if user is asking about a specific exercise.
  // Keep broad context by default; only narrow when confidently appropriate.
  let focusedExercise: string | undefined;
  let shouldNarrowToExercise = false;
  if (config.needsWorkoutSummary && logsForIntent.length > 0) {
    const knownExercisesForMatch = getCandidateExerciseNames(logsForIntent);
    const matchResult = await matchExerciseFromMessage(
      userMessage,
      knownExercisesForMatch,
      true,
    );
    if (matchResult.matchedExercise) {
      focusedExercise = matchResult.matchedExercise;
      shouldNarrowToExercise = await openaiService.shouldNarrowExerciseContext(
        userMessage,
        focusedExercise,
        intent,
      );
    }
  }
  const exerciseFilter = shouldNarrowToExercise ? focusedExercise : undefined;
  const profileLogs = config.needsFullProfile &&
    config.needsWorkoutSummary &&
    config.workoutSummaryDepthDays >= DAYS_TO_FETCH_RECENT_LOGS
    ? logsForIntent
    : undefined;
  const [profile, workoutSummary, recentAdvice] = await Promise.all([
    config.needsFullProfile
      ? buildCoachProfile(userId, profileLogs)
      : buildMinimalCoachProfile(userId),
    config.needsWorkoutSummary
      ? buildWorkoutSummaryFromLogs(logsForIntent, exerciseFilter)
      : Promise.resolve(undefined),
    fetchRecentAdvice(userId, shouldNarrowToExercise ? focusedExercise : undefined),
  ]);
  const maxPairs = config.needsChatHistory
    ? config.maxChatHistoryPairs
    : 2;
  const chatSummary = summarizeChatHistory(chatHistory, maxPairs);
  const isNewConversation = !chatHistory || chatHistory.length === 0;
  const coachContext: CoachContext = {
    coachProfile: profile,
    intent,
    workoutSummary,
    chatSummary,
    focusedExercise,
    isNewConversation,
    recentAdvice,
  };
  return {
    messages: formatMessagesForLLM(coachContext, userMessage),
    focusedExercise,
  };
}

/**
 * Stream the coach response as an async iterable of text deltas.
 */
export async function streamCoachResponse(
  userId: string,
  userMessage: string,
  intent: CoachIntent,
  chatHistory?: ChatHistoryMessage[],
): Promise<StreamCoachResponseResult> {
  const { messages, focusedExercise } = await buildChatMessages(
    userId,
    userMessage,
    intent,
    chatHistory,
  );

  const stream = await openaiService.createChatStream(messages);
  return {
    stream: transformStreamToTextDeltas(stream),
    focusedExercise,
  };
}

/**
 * Persist a user and coach message pair to an existing or new conversation.
 * Extracts and saves actionable advice after persistence.
 */
export async function persistChatExchange(
  input: PersistChatExchangeInput,
): Promise<string> {
  const messages = buildMessagePair(
    input.userMessage,
    input.coachResponse,
    input.intent,
  );
  let conversationId: string;
  if (input.conversationId) {
    await conversationService.appendMessagesService(
      input.conversationId,
      input.userId,
      messages,
    );
    conversationId = input.conversationId;
  } else {
    const conversation = await conversationService.createConversationService(
      input.userId,
      generateConversationTitle(input.userMessage),
      messages,
    );
    conversationId = conversation.id as string;
  }

  // // Extract and save advice (non-blocking, errors logged but don't fail the request)
  // extractAndSaveAdvice(
  //   input.userId,
  //   input.coachResponse,
  //   input.intent,
  //   input.focusedExercise,
  // ).catch((err) => {
  //   console.error("Failed to extract/save advice:", err);
  // });

  return conversationId;
}

/**
 * Extract actionable advice from coach response and persist to database.
 */
async function extractAndSaveAdvice(
  userId: string,
  coachResponse: string,
  intent: CoachIntent,
  focusedExercise?: string,
): Promise<void> {
  const adviceItems = await openaiService.extractActionableAdvice(
    coachResponse,
    focusedExercise,
  );

  if (_.isEmpty(adviceItems)) return;

  const savePromises = _.map(adviceItems, (item) =>
    coachAdviceRepository.createAdvice(
      userId,
      item.exerciseName,
      item.advice,
      intent,
      item.context,
    ),
  );

  await Promise.all(savePromises);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function mapGoal(fitnessGoal?: string): string {
  return GOAL_MAP[fitnessGoal ?? ""] ?? "general_fitness";
}

function mapExperienceLevel(activityLevel?: string): string {
  return EXPERIENCE_MAP[activityLevel ?? ""] ?? "beginner";
}

async function fetchRecentLogs(
  userId: string,
  days: number,
): Promise<ILog[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * MILLISECONDS_IN_DAY);
  return logRepository.findByDateRange(userId, startDate, endDate);
}

async function getLogsForIntent(
  userId: string,
  intent: CoachIntent,
  depthDays: number,
): Promise<ILog[]> {
  if (intent === COACH_INTENT.SESSION_FEEDBACK) {
    return buildSessionFeedbackLogs(userId, depthDays);
  }
  return fetchRecentLogs(userId, depthDays);
}

async function buildSessionFeedbackLogs(
  userId: string,
  depthDays: number,
): Promise<ILog[]> {
  const recentLogs = await fetchRecentLogs(userId, depthDays);
  if (_.isEmpty(recentLogs)) return [];

  const todayLogs = filterLogsByDateRange(recentLogs, getTodayRange());

  if (_.isEmpty(todayLogs)) return [];

  const todayExerciseNames = new Set(
    _.filter(
      _.map(todayLogs, getExerciseName),
      (name) => !!name && name !== "unknown",
    ),
  );
  if (todayExerciseNames.size === 0) return [];

  return _.filter(recentLogs, (log) => todayExerciseNames.has(getExerciseName(log)));
}

function filterLogsByDateRange(
  logs: ILog[],
  range: { start: Date; end: Date },
): ILog[] {
  return _.filter(logs, (log) => {
    const createdAt = new Date(log.createdAt ?? 0).getTime();
    return createdAt >= range.start.getTime() && createdAt <= range.end.getTime();
  });
}

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function calculateAverageRPE(logs: ILog[]): number {
  const rpeValues = _.compact(_.map(logs, "rateOfPerceivedExertion"));
  if (_.isEmpty(rpeValues)) return 7;
  return _.round(_.mean(rpeValues), 1);
}

//todo: implement this
// function deriveFatigueStatus(recentLogs: ILog[]): FatigueStatus {

//   /*
//   1.
//   */
// }

function identifyPlateaus(logs: ILog[]): string[] {
  const exerciseGroups = groupLogsByExercise(logs);
  return _.keys(
    _.pickBy(exerciseGroups, (exerciseLogs) => calculateTrend(exerciseLogs) === "flat")
  );
}

function groupLogsByExercise(logs: ILog[]): Record<string, ILog[]> {
  return _.groupBy(logs, getExerciseName);
}

function filterLogsByExercise(logs: ILog[], exerciseName: string): ILog[] {
  const normalizedFilter = _.toLower(exerciseName);
  return _.filter(logs, (log) => {
    const logExerciseName = getExerciseName(log);
    return _.toLower(logExerciseName) === normalizedFilter;
  });
}

function getExerciseName(log: ILog): string {
  const exerciseId = log.exerciseId as unknown;
  if (exerciseId && typeof exerciseId === "object" && "name" in exerciseId) {
    return ((exerciseId as Record<string, unknown>).name as string) ?? "unknown";
  }
  return "unknown";
}

function calculateTotalSessionVolume(log: ILog): number {
  if (_.isEmpty(log.sets)) return 0;
  return _.sumBy(log.sets, (set) => set.reps * set.weight);
}

function formatAllSets(log: ILog): string {
  if (_.isEmpty(log.sets)) return "N/A";
  return _.map(log.sets, (set) => `${set.reps}×${set.weight}`).join(",");
}

function calculateVolumeChangePercent(exerciseLogs: ILog[]): number | null {
  if (exerciseLogs.length < TREND_SESSIONS_COUNT) return null;
  const sorted = _.sortBy(exerciseLogs, (log) => new Date(log.createdAt ?? 0).getTime());
  const recent = _.takeRight(sorted, TREND_SESSIONS_COUNT);
  const volumes = _.map(recent, calculateTotalSessionVolume);
  const firstVolume = _.first(volumes) ?? 0;
  const lastVolume = _.last(volumes) ?? 0;
  if (firstVolume === 0) return null;
  return _.round(((lastVolume - firstVolume) / firstVolume) * 100, 1);
}

function calculateTrend(exerciseLogs: ILog[]): ExerciseTrend | null {
  const changePercent = calculateVolumeChangePercent(exerciseLogs);
  if (changePercent === null) return null;
  if (changePercent > TREND_THRESHOLD_PERCENT) return "up";
  if (changePercent < -TREND_THRESHOLD_PERCENT) return "down";
  return "flat";
}

function aggregateExerciseSummaries(logs: ILog[]): WorkoutSummary {
  const groups = groupLogsByExercise(logs);
  return _.mapValues(groups, (exerciseLogs) => {
    const sortedDesc = _.orderBy(
      exerciseLogs,
      [(log) => new Date(log.createdAt ?? 0).getTime()],
      ["desc"]
    );
    const rpeValues = _.compact(_.map(sortedDesc, "rateOfPerceivedExertion"));
    const avgRPE = _.isEmpty(rpeValues) ? null : _.round(_.mean(rpeValues), 1);
    const sessions: SessionData[] = _.map(sortedDesc, (log) => ({
      date: new Date(log.createdAt ?? 0),
      sets: formatAllSets(log),
      volume: calculateTotalSessionVolume(log),
      notes: log?.notes,
    }));
    const volumeChangePercent = calculateVolumeChangePercent(exerciseLogs);
    const exerciseSummary: ExerciseSummary = {
      rpe: avgRPE,
      trend: resolveTrend(volumeChangePercent),
      volumeChangePercent,
      sessions,
    };

    return exerciseSummary;
  });
}

function resolveTrend(changePercent: number | null): ExerciseTrend | null {
  if (changePercent === null) return null;
  if (changePercent > TREND_THRESHOLD_PERCENT) return "up";
  if (changePercent < -TREND_THRESHOLD_PERCENT) return "down";
  return "flat";
}

function getCandidateExerciseNames(logs: ILog[]): string[] {
  // Keep only the most recently seen unique names to reduce extractor tokens.
  const sortedDesc = _.orderBy(
    logs,
    [(log) => new Date(log.createdAt ?? 0).getTime()],
    ["desc"],
  );
  const names = _.filter(
    _.map(sortedDesc, getExerciseName),
    (name) => !!name && name !== "unknown",
  );
  return _.take(_.uniq(names), 30);
}

/**
 * Fetch recent coach advice for context.
 */
async function fetchRecentAdvice(
  userId: string,
  exerciseFilter?: string,
): Promise<CoachAdviceItem[] | undefined> {
  try {
    const adviceList = exerciseFilter
      ? await coachAdviceRepository.findRecentByExercise(
        userId,
        exerciseFilter,
        DAYS_TO_FETCH_RECENT_ADVICE,
        5,
      )
      : await coachAdviceRepository.findRecentByUserId(
        userId,
        DAYS_TO_FETCH_RECENT_ADVICE,
        MAX_ADVICE_ITEMS_FOR_LLM,
      );

    if (_.isEmpty(adviceList)) return undefined;

    return _.map(adviceList, (item) => ({
      exercise: item.exerciseName,
      date: new Date(item.createdAt ?? 0).toISOString().slice(0, 10),
      advice: trimText(item.advice, MAX_ADVICE_TEXT_LENGTH_FOR_LLM),
      context: item.context ? trimText(item.context, 80) : undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch recent advice:", error);
    return undefined;
  }
}

/**
 * Format workout summary for LLM context: compact dates, trim sessions, omit empty fields.
 */
function formatWorkoutSummaryForLLM(
  summary: WorkoutSummary,
  focusedExercise?: string,
  maxSessionsPerExercise = MAX_SESSIONS_PER_EXERCISE_FOR_LLM,
): Record<string, unknown> {
  const maxExercises = focusedExercise
    ? MAX_EXERCISES_FOR_LLM_WHEN_FOCUSED
    : MAX_EXERCISES_FOR_LLM_BROAD;
  const selectedExercises = selectExercisesForLLM(summary, focusedExercise, maxExercises);
  return _.mapValues(selectedExercises, (exercise, exerciseName) => {
    const trimmedSessions = _.take(exercise.sessions, maxSessionsPerExercise);
    const sessions = _.map(trimmedSessions, (s) => {
      const session: Record<string, unknown> = {
        date: new Date(s.date).toISOString().slice(0, 10),
        sets: s.sets,
        volume: s.volume,
      };
      if (s.notes?.trim() && exerciseName === focusedExercise) {
        session.notes = trimText(s.notes, MAX_NOTE_LENGTH_FOR_LLM);
      }
      return session;
    });
    const allSessionDates = _.map(exercise.sessions, (s) =>
      new Date(s.date).toISOString().slice(0, 10)
    );
    const latestSessionDate = _.first(allSessionDates);
    const earliestSessionDate = _.last(allSessionDates);
    const result: Record<string, unknown> = {
      sessionCount: exercise.sessions.length,
      latestSessionDate,
      earliestSessionDate,
      sessions,
    };
    if (exercise.trend !== null) result.trend = exercise.trend;
    if (exercise.volumeChangePercent !== null) result.volumeChangePercent = exercise.volumeChangePercent;
    if (exercise.rpe !== null) {
      result.effort = {
        scoreOutOf10: exercise.rpe,
        label: mapEffortLabel(exercise.rpe),
      };
    }
    return result;
  });
}

function mapEffortLabel(rpe: number): string {
  const match = EFFORT_LABELS.find((entry) => rpe >= entry.min);
  return match?.label ?? "moderate";
}

function selectExercisesForLLM(
  summary: WorkoutSummary,
  focusedExercise?: string,
  maxExercises = MAX_EXERCISES_FOR_LLM_BROAD,
): WorkoutSummary {
  const entries = _.entries(summary);
  if (entries.length <= maxExercises) return summary;

  const sortedByRecency = _.orderBy(
    entries,
    ([, exercise]) => new Date(exercise.sessions[0]?.date ?? 0).getTime(),
    ["desc"],
  );
  const prioritized: Array<[string, ExerciseSummary]> = [];

  if (focusedExercise) {
    const focusedEntry = _.find(
      entries,
      ([exerciseName]) => _.toLower(exerciseName) === _.toLower(focusedExercise),
    );
    if (focusedEntry) prioritized.push(focusedEntry);
  }

  for (const entry of sortedByRecency) {
    if (prioritized.length >= maxExercises) break;
    if (!prioritized.some(([name]) => name === entry[0])) {
      prioritized.push(entry);
    }
  }

  return Object.fromEntries(prioritized);
}

function summarizeChatHistory(
  chatHistory?: ChatHistoryMessage[],
  maxPairs?: number,
): string | undefined {
  if (_.isEmpty(chatHistory)) return undefined;
  const limit = (maxPairs ?? 3) * 2;
  const trimmed = _.takeRight(chatHistory, limit);
  return _.map(
    trimmed,
    (msg) => `${msg.role === "user" ? "User" : "Coach"}: ${trimText(msg.content, MAX_CHAT_MESSAGE_LENGTH_FOR_LLM)}`
  ).join("\n");
}

function trimText(value: string, maxLength: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}

const COACH_SYSTEM_PROMPT = `
Identity:
You are "Fit Check Coach": an elite but human strength coach who sounds warm, calm, and clear.
Your goal is to help this specific athlete improve safely and consistently over time.

Core behavior:
- Personalize every response to the athlete's profile, recent sessions, and conversation continuity.
- Sound natural and grounded, like a thoughtful coach texting a real person.
- Lead with what matters most right now, then give the smallest high-impact next steps.
- Explain the "why" briefly so advice feels intelligent, not generic.
- Give one best path by default; mention alternatives only when they materially change outcomes.

Personalization priorities (highest to lowest):
1. Direct user request in the current message.
2. Focused exercise in context, if present.
3. Recent performance patterns (trend, effort, consistency, notes).
4. Athlete profile (goal, experience, preferred effort).
5. Recent coach advice to preserve continuity and avoid contradiction.

Coaching quality bar:
- Be specific: include clear targets (sets/reps/load/effort/rest/form cue) when context allows.
- Be adaptive: if trend is down or effort is high, reduce complexity and adjust load/volume.
- Be progressive: if trend is up and effort is controlled, suggest a realistic progression.
- Be practical: recommendations must be doable in the next session.
- Be honest: if data is thin/ambiguous, say so briefly and give a safe default.

Tone and language:
- Use greeting only if isNewConversation is true; otherwise continue naturally.
- Match the user's tone and energy; supportive, never cheesy.
- Use plain language; avoid jargon overload.
- Prefer "effort" language. Only use "RPE" if the user used it first.
- Never mention internal mechanics like "context block", "JSON", "intent classifier", or "the system".

Safety and scope:
- Stay within training, recovery, and general nutrition guidance.
- If the user mentions pain, injury, dizziness, chest pain, or red-flag symptoms:
  provide conservative guidance, stop-gap modifications, and suggest professional evaluation.
- Do not diagnose conditions, prescribe medication, or give dangerous instructions.

Response contract for UI:
- Default length: 70-170 words unless the user asks for deep detail.
- Structure for most coaching responses:
  1) One-line personalized takeaway.
  2) "Next session" with 1-3 bullet actions.
  3) Optional short rationale line.
- Ask at most one focused follow-up question, and only if it changes the recommendation.
- If user asks for a plan/program, return a compact step-by-step format with clear progression logic.
`;

function getIntentSpecificGuidance(intent: CoachIntent): string {
  switch (intent) {
    case COACH_INTENT.NEXT_WORKOUT:
      return "Intent focus: Build the best next-session plan from recent sessions. Prioritize concrete execution targets.";
    case COACH_INTENT.SESSION_FEEDBACK:
      return "Intent focus: Evaluate today's session with clear wins, one limiter, and next-session adjustments.";
    case COACH_INTENT.PAST_SESSION_FEEDBACK:
      return "Intent focus: Review past performance with continuity and show what should change now.";
    case COACH_INTENT.PROGRESS_CHECK:
      return "Intent focus: Summarize trend quality over time (up/down/flat), interpret it, and propose the next lever.";
    case COACH_INTENT.DIFFICULTY_ANALYSIS:
      return "Intent focus: Explain why it felt hard (load, fatigue, pacing, recovery, technique) and provide fixes.";
    case COACH_INTENT.TIPS:
      return "Intent focus: Give practical, high-value tips tailored to the athlete's current level and goals.";
    case COACH_INTENT.GENERAL_COACHING:
      return "Intent focus: Provide actionable coaching with clear prioritization and minimal fluff.";
    case COACH_INTENT.GENERAL_CONVERSATION:
    default:
      return "Intent focus: Keep it human and conversational while still useful; avoid over-coaching if not requested.";
  }
}

function buildContextInstruction(context: CoachContext): string {
  const goal = context.coachProfile.goal ?? "general_fitness";
  const experienceLevel = context.coachProfile.experienceLevel ?? "beginner";
  const preferredEffort = context.coachProfile.preferredIntensityRPE;
  const effortLine = typeof preferredEffort === "number"
    ? `Preferred effort tendency: ${preferredEffort}/10.`
    : "Preferred effort tendency: unknown.";
  const plateauLine = "activePlateaus" in context.coachProfile &&
    Array.isArray(context.coachProfile.activePlateaus) &&
    context.coachProfile.activePlateaus.length > 0
    ? `Possible plateaus: ${context.coachProfile.activePlateaus.join(", ")}.`
    : "Possible plateaus: none detected.";

  return [
    `Athlete profile: goal=${goal}, experience=${experienceLevel}. ${effortLine} ${plateauLine}`,
    `Focused exercise: ${context.focusedExercise ?? "none"}.`,
    `Conversation state: ${context.isNewConversation ? "new conversation" : "ongoing conversation"}.`,
    getIntentSpecificGuidance(context.intent),
    "Use workout summary and recent advice below as hard context when present.",
  ].join("\n");
}

function formatMessagesForLLM(
  context: CoachContext,
  userMessage: string,
): ChatCompletionMessageParam[] {
  const contextForLLM: CoachContext = {
    ...context,
    workoutSummary: context.workoutSummary
      ? (formatWorkoutSummaryForLLM(context.workoutSummary, context.focusedExercise) as WorkoutSummary)
      : undefined,
  };
  const contextBlock = JSON.stringify(contextForLLM, null, 0);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: COACH_SYSTEM_PROMPT },
    {
      role: "system",
      content: buildContextInstruction(context),
    },
    {
      role: "system",
      content: `Here is the user's context:\n${contextBlock}`,
    },
  ];
  if (context.chatSummary) {
    messages.push({
      role: "system",
      content: `Recent conversation:\n${context.chatSummary}`,
    });
  }
  messages.push({ role: "user", content: userMessage });
  return messages;
}

async function* transformStreamToTextDeltas(
  stream: AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>,
): AsyncGenerator<string> {
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

function buildMessagePair(
  userMessage: string,
  coachResponse: string,
  intent: CoachIntent,
): IMessage[] {
  return [
    {
      role: "user",
      content: userMessage,
      intent,
      createdAt: new Date(),
    },
    {
      role: "coach",
      content: coachResponse,
      intent,
      createdAt: new Date(),
    },
  ];
}

function generateConversationTitle(message: string): string {
  const trimmedMessage = message.trim();
  if (trimmedMessage.length <= MAX_CONVERSATION_TITLE_LENGTH) {
    return trimmedMessage;
  }
  return `${trimmedMessage.slice(0, MAX_CONVERSATION_TITLE_LENGTH - 3)}...`;
}
