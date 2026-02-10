import _ from "lodash";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { ILog } from "../models/log.model.js";
import * as conversationRepository from "../repositories/conversation.repository.js";
import * as logRepository from "../repositories/log.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  getExerciseNamesFromLogs,
  matchExerciseDeterministic,
} from "../utils/exercise-matcher.js";
import {
  INTENT_CONTEXT_CONFIG,
  type ChatHistoryMessage,
  type CoachContext,
  type CoachIntent,
  type CoachProfile,
  type ExerciseMatchResult,
  type ExerciseSummary,
  type ExerciseTrend,
  type SessionData,
  type WorkoutSummary
} from "../utils/types/coach.types.js";
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
const FATIGUE_THRESHOLD_HIGH = 6;
const FATIGUE_THRESHOLD_MEDIUM = 4;
const TREND_SESSIONS_COUNT = 3;
const TREND_THRESHOLD_PERCENT = 5;
const MILLISECONDS_IN_DAY = 86_400_000;
const MAX_PERSISTED_HISTORY_MESSAGES = 10;
const EXERCISE_MATCH_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Build a coach profile from the user's stored data and recent workout history.
 */
export async function buildCoachProfile(
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
export async function buildMinimalCoachProfile(
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
export async function buildWorkoutSummary(
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
export async function matchExerciseFromMessage(
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
export async function classifyIntent(
  message: string,
): Promise<CoachIntent> {
  return openaiService.classifyIntent(message);
}

/**
 * Load chat history from a persisted conversation and format it
 * as ChatHistoryMessage[] for the LLM context builder.
 * Uses the conversation summary + last N messages to stay token-efficient.
 */
export async function buildChatHistoryFromConversation(
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
export async function buildChatMessages(
  userId: string,
  userMessage: string,
  intent: CoachIntent,
  chatHistory?: ChatHistoryMessage[],
): Promise<ChatCompletionMessageParam[]> {
  const config = INTENT_CONTEXT_CONFIG[intent];
  // Fetch logs first to get known exercise names for matching
  const allLogs = config.needsWorkoutSummary
    ? await fetchRecentLogs(userId, config.workoutSummaryDepthDays)
    : [];
  // Try to detect if user is asking about a specific exercise
  let exerciseFilter: string | undefined;
  let matchResult: ExerciseMatchResult | undefined;
  if (config.needsWorkoutSummary && allLogs.length > 0) {
    const knownExercises = getExerciseNamesFromLogs(allLogs);
    matchResult = await matchExerciseFromMessage(userMessage, knownExercises);
    if (matchResult.matchedExercise) {
      exerciseFilter = matchResult.matchedExercise;
    }
  }
  const [profile, workoutSummary] = await Promise.all([
    config.needsFullProfile
      ? buildCoachProfile(userId)
      : buildMinimalCoachProfile(userId),
    config.needsWorkoutSummary
      ? buildWorkoutSummaryFromLogs(allLogs, exerciseFilter)
      : Promise.resolve(undefined),
  ]);
  const chatSummary = config.needsChatHistory
    ? summarizeChatHistory(chatHistory, config.maxChatHistoryPairs)
    : undefined;
  const coachContext: CoachContext = {
    coachProfile: profile,
    intent,
    workoutSummary,
    chatSummary,
    focusedExercise: exerciseFilter,
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

function calculateBestSetVolume(log: ILog): number {
  if (_.isEmpty(log.sets)) return 0;
  return _.max(_.map(log.sets, (set) => set.reps * set.weight)) ?? 0;
}

function formatBestSet(log: ILog): string {
  if (_.isEmpty(log.sets)) return "N/A";
  const bestSet = _.maxBy(log.sets, (set) => set.reps * set.weight);
  if (!bestSet) return "N/A";
  return `${bestSet.reps}x${bestSet.weight}kg`;
}

function calculateVolumeChangePercent(exerciseLogs: ILog[]): number | null {
  if (exerciseLogs.length < TREND_SESSIONS_COUNT) return null;
  const sorted = _.sortBy(exerciseLogs, (log) => new Date(log.createdAt ?? 0).getTime());
  const recent = _.takeRight(sorted, TREND_SESSIONS_COUNT);
  const volumes = _.map(recent, calculateBestSetVolume);
  const firstVolume = _.first(volumes) ?? 0;
  const lastVolume = _.last(volumes) ?? 0;
  if (firstVolume === 0) return null;
  return _.round(((lastVolume - firstVolume) / firstVolume) * 100, 1);
}

function calculateTrend(exerciseLogs: ILog[]): ExerciseTrend {
  const changePercent = calculateVolumeChangePercent(exerciseLogs);
  if (changePercent === null) return "flat";
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
    const latest = _.first(sortedDesc);
    const rpeValues = _.compact(_.map(sortedDesc, "rateOfPerceivedExertion"));
    const avgRPE = _.isEmpty(rpeValues) ? null : _.round(_.mean(rpeValues), 1);
    const sessions: SessionData[] = _.map(sortedDesc, (log) => ({
      date: new Date(log.createdAt ?? 0),
      bestSet: formatBestSet(log),
      volume: calculateBestSetVolume(log),
      notes: log?.notes,
    }));
    const exerciseSummary: ExerciseSummary = {
      lastBestSet: formatBestSet(latest!),
      rpe: avgRPE,
      trend: calculateTrend(exerciseLogs),
      volumeChangePercent: calculateVolumeChangePercent(exerciseLogs),
      sessions,
    };

    return exerciseSummary;
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
You are a professional strength and fitness coach with a science-based approach.

Your role is to interpret training data and give practical, evidence-informed guidance that helps the user train consistently and recover well.

Communication style:
- Calm, confident, and supportive — never dramatic or judgmental
- Evidence-based and objective, avoiding fitness myths or hype
- Clear and concise (3–5 sentences when possible)
- Practical and actionable, focused on what to do next
- Use simple, plain language; explain concepts briefly if needed

Coaching principles:
- Training effort near failure is normal and productive when managed well
- Progress is non-linear; short-term plateaus and fatigue are expected
- Emphasize sustainability, recovery, and long-term consistency
- Avoid absolutes (e.g., never say “always” or “never”)

Safety and scope:
- Do NOT provide medical advice or diagnose injuries
- If pain, injury, or medical concerns are mentioned, recommend consulting a qualified professional
- Respond ONLY to fitness, training, recovery, and general nutrition topics
- Politely decline unrelated or out-of-scope questions

Your goal is to sound like a knowledgeable, trustworthy coach who explains the “why” briefly and guides the user toward smarter training decisions.
Do not repeat prior coaching responses verbatim. Each response should be a fresh interpretation of the data.
`;

function formatMessagesForLLM(
  context: CoachContext,
  userMessage: string,
): ChatCompletionMessageParam[] {
  const contextBlock = JSON.stringify(context, null, 0);
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
