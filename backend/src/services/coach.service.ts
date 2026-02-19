import _ from "lodash";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { IMessage } from "../models/conversation.model.js";
import type { ILog } from "../models/log.model.js";
import * as coachAdviceRepository from "../repositories/coach-advice.repository.js";
import * as conversationRepository from "../repositories/conversation.repository.js";
import * as logRepository from "../repositories/log.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  getExerciseNamesFromLogs,
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
  gain_muscle: "hypertrophy",
  lose_weight: "fat_loss",
  maintain: "maintenance",
  improve_endurance: "endurance",
  general_fitness: "general_fitness",
};

const EXPERIENCE_MAP: Record<string, string> = {
  sedentary: "beginner",
  lightly_active: "beginner",
  moderately_active: "intermediate",
  very_active: "advanced",
  extremely_active: "advanced",
};

const DAYS_TO_FETCH_RECENT_LOGS = 14;
const DAYS_TO_FETCH_RECENT_ADVICE = 14;
const MAX_ADVICE_ITEMS_FOR_LLM = 10;
const FATIGUE_THRESHOLD_HIGH = 6;
const FATIGUE_THRESHOLD_MEDIUM = 4;
const TREND_SESSIONS_COUNT = 3;
const TREND_THRESHOLD_PERCENT = 5;
const MILLISECONDS_IN_DAY = 86_400_000;
const MAX_PERSISTED_HISTORY_MESSAGES = 10;
const EXERCISE_MATCH_CONFIDENCE_THRESHOLD = 0.6;
const MAX_CONVERSATION_TITLE_LENGTH = 50;
const MAX_SESSIONS_PER_EXERCISE_FOR_LLM = 5;

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
  focusedExercise?: string;
}

interface PersistChatExchangeInput {
  userId: string;
  conversationId?: string;
  userMessage: string;
  coachResponse: string;
  intent: CoachIntent;
  focusedExercise?: string;
}

/**
 * Build a coach profile from the user's stored data and recent workout history.
 */
async function buildCoachProfile(
  userId: string,
): Promise<CoachProfile> {
  const user = await userRepository.findOne({ id: userId });
  const recentLogs = await fetchRecentLogs(userId, DAYS_TO_FETCH_RECENT_LOGS);
  const averageRPE = calculateAverageRPE(recentLogs);
  // const fatigueStatus = deriveFatigueStatus(recentLogs);
  const activePlateaus = identifyPlateaus(recentLogs);
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
): Promise<ExerciseMatchResult> {
  // Step 1: Try deterministic matching (synonyms + fuzzy)
  const deterministicResult = matchExerciseDeterministic(userMessage, knownExercises);
  if (
    deterministicResult.matchedExercise &&
    deterministicResult.confidence >= EXERCISE_MATCH_CONFIDENCE_THRESHOLD
  ) {
    return deterministicResult;
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

  // Try to detect focused exercise for advice persistence
  let focusedExercise: string | undefined;
  const config = INTENT_CONTEXT_CONFIG[intent];
  if (config.needsWorkoutSummary) {
    const logsForIntent = await getLogsForIntent(
      input.userId,
      intent,
      config.workoutSummaryDepthDays,
    );
    if (logsForIntent.length > 0) {
      const knownExercises = getExerciseNamesFromLogs(logsForIntent);
      const matchResult = await matchExerciseFromMessage(input.message, knownExercises);
      if (matchResult.matchedExercise) {
        focusedExercise = matchResult.matchedExercise;
      }
    }
  }

  return { intent, chatHistory, focusedExercise };
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
): Promise<ChatCompletionMessageParam[]> {
  const config = INTENT_CONTEXT_CONFIG[intent];
  // Fetch logs first to get known exercise names for matching.
  // SESSION_FEEDBACK only includes logs for exercises trained today.
  const logsForIntent = config.needsWorkoutSummary
    ? await getLogsForIntent(userId, intent, config.workoutSummaryDepthDays)
    : [];
  // Try to detect if user is asking about a specific exercise
  let exerciseFilter: string | undefined;
  let matchResult: ExerciseMatchResult | undefined;
  if (config.needsWorkoutSummary && logsForIntent.length > 0) {
    const knownExercises = getExerciseNamesFromLogs(logsForIntent);
    matchResult = await matchExerciseFromMessage(userMessage, knownExercises);
    if (matchResult.matchedExercise) {
      exerciseFilter = matchResult.matchedExercise;
    }
  }
  const [profile, workoutSummary, recentAdvice] = await Promise.all([
    config.needsFullProfile
      ? buildCoachProfile(userId)
      : buildMinimalCoachProfile(userId),
    config.needsWorkoutSummary
      ? buildWorkoutSummaryFromLogs(logsForIntent, exerciseFilter)
      : Promise.resolve(undefined),
    fetchRecentAdvice(userId, exerciseFilter),
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
    focusedExercise: exerciseFilter,
    isNewConversation,
    recentAdvice,
  };
  return formatMessagesForLLM(coachContext, userMessage);
}

/**
 * Stream the coach response as an async iterable of text deltas.
 */
export async function streamCoachResponse(
  userId: string,
  userMessage: string,
  intent: CoachIntent,
  chatHistory?: ChatHistoryMessage[],
): Promise<AsyncIterable<string>> {
  const messages = await buildChatMessages(userId, userMessage, intent, chatHistory);

  const stream = await openaiService.createChatStream(messages);
  return transformStreamToTextDeltas(stream);
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
  console.log("✏️ ~ coach.service.ts:448 ~ buildSessionFeedbackLogs ~ todayLogs:", todayLogs)

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

  console.log("✏️ ~ coach.service.ts:480 ~ getTodayRange ~ start:", start)
  console.log("✏️ ~ coach.service.ts:480 ~ getTodayRange ~ end:", end)
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
    const exerciseSummary: ExerciseSummary = {
      rpe: avgRPE,
      trend: calculateTrend(exerciseLogs),
      volumeChangePercent: calculateVolumeChangePercent(exerciseLogs),
      sessions,
    };

    return exerciseSummary;
  });
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
      advice: item.advice,
      context: item.context,
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
  maxSessionsPerExercise = MAX_SESSIONS_PER_EXERCISE_FOR_LLM,
): Record<string, unknown> {
  return _.mapValues(summary, (exercise) => {
    const trimmedSessions = _.take(exercise.sessions, maxSessionsPerExercise);
    const sessions = _.map(trimmedSessions, (s) => {
      const session: Record<string, unknown> = {
        date: new Date(s.date).toISOString().slice(0, 10),
        sets: s.sets,
        volume: s.volume,
      };
      if (s.notes?.trim()) session.notes = s.notes;
      return session;
    });
    const result: Record<string, unknown> = { sessions };
    if (exercise.trend !== null) result.trend = exercise.trend;
    if (exercise.volumeChangePercent !== null) result.volumeChangePercent = exercise.volumeChangePercent;
    if (exercise.rpe !== null) result.rpe = exercise.rpe;
    return result;
  });
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
    (msg) => `${msg.role === "user" ? "User" : "Coach"}: ${msg.content}`
  ).join("\n");
}

const SYSTEM_PROMPT = `
You are a dedicated strength and fitness coach who knows this athlete personally and tracks their journey closely.

Your role is to notice their patterns, celebrate their wins (even small ones), and guide them through challenges with the insight that comes from watching them train week after week.

Communication style:
- Only use greetings (e.g. Hey, Hi) when isNewConversation is true in the context. For ongoing conversations, respond directly without greetings.
- Write like you're texting an athlete you train regularly — natural, flowing, conversational
- Vary your response length based on what's needed: sometimes a few sentences, sometimes a paragraph when there's more to discuss
- Personal and observant — weave in their specific lifts, notes, and recent sessions as you talk
- Notice the details naturally: their form cues, emoji reactions, weight jumps, rep PRs
- Match their energy (if they're fired up, reflect that; if they're frustrated, validate it)
- Use their language and mirror their casual tone when they use notes like "1st set is shit lol"

Coaching approach:
- Jump straight into what matters — skip formulaic openings like "I see that..." or "Looking at your data..."
- Talk TO them, not ABOUT their data. Say "You crushed those cable laterals" not "The cable lateral raise showed improvement"
- Connect the dots between what they did and what happened: "You dropped the weight and focused on form on those pushdowns, and boom — 5kg jump with clean reps"
- When something's not working, acknowledge it plainly and move to solutions: "Preacher curls have been stuck for a bit. Let's try..."
- Give specific, actionable guidance they can use next session, but don't overload them with options
- Sound like you're thinking through their training with them, not delivering a report

Building connection:
- Remember their stated goals (hypertrophy, intensity preferences, known plateaus)
- Their training notes and emoji mean something — reference them and respond to what they're really saying
- Celebrate wins authentically without going overboard — "Nice, that's a rep PR" hits better than "Congratulations on this amazing achievement!"
- When suggesting changes, explain why in a way that makes sense for their situation
- End with momentum: what they should focus on or try next time they're in the gym

Context awareness:
- You have access to your recent coaching advice — use it to create continuity
- Reference past recommendations when relevant: "You went with 67.5kg like I suggested — solid work" or "Last time I said to watch your form at 70kg, and you cleaned it up at 65kg"
- Build on previous conversations naturally without recapping everything
- If they followed your advice, acknowledge it and keep moving forward
- If they tried something different, be curious about the results and adapt
- Make them feel like you're tracking their journey session to session, not starting from scratch each time

Avoid:
- Starting every response the same way ("I see...", "I notice...", "Looking at...")
- Saying the same thing multiple times in different words
- Being overly formal or robotic — you're a coach, not a report generator
- Over-explaining basic concepts they already understand
- Fake enthusiasm or excessive praise that doesn't feel earned

Safety and scope:
- Do NOT diagnose injuries or provide medical advice
- For pain or injury concerns, recommend professional consultation
- Stay focused on training, recovery, and general nutrition
- Politely redirect off-topic questions

Your goal: Make them feel seen, understood, and motivated to show up for their next session. Sound like a real coach texting them about their training — someone who's paying attention and actually cares how it's going.
`;

function formatMessagesForLLM(
  context: CoachContext,
  userMessage: string,
): ChatCompletionMessageParam[] {
  const contextForLLM: CoachContext = {
    ...context,
    workoutSummary: context.workoutSummary
      ? (formatWorkoutSummaryForLLM(context.workoutSummary) as WorkoutSummary)
      : undefined,
  };
  const contextBlock = JSON.stringify(contextForLLM, null, 0);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
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
