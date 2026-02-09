import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { ILog } from "../models/log.model.js";
import type { IUser } from "../models/user.model.js";
import * as conversationRepository from "../repositories/conversation.repository.js";
import * as logRepository from "../repositories/log.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  INTENT_CONTEXT_CONFIG,
  type ChatHistoryMessage,
  type CoachContext,
  type CoachIntent,
  type CoachProfile,
  type ExerciseSummary,
  type ExerciseTrend,
  type FatigueStatus,
  type WorkoutSummary,
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

const DAYS_IN_WEEK = 7;
const FATIGUE_THRESHOLD_HIGH = 6;
const FATIGUE_THRESHOLD_MEDIUM = 4;
const TREND_SESSIONS_COUNT = 3;
const TREND_THRESHOLD_PERCENT = 5;
const MILLISECONDS_IN_DAY = 86_400_000;
const MAX_PERSISTED_HISTORY_MESSAGES = 10;

/**
 * Build a coach profile from the user's stored data and recent workout history.
 */
export async function buildCoachProfile(
  userId: string,
): Promise<CoachProfile> {
  const user = await userRepository.findOne({ id: userId });
  const recentLogs = await fetchRecentLogs(userId, DAYS_IN_WEEK);
  const averageRPE = calculateAverageRPE(recentLogs);
  const fatigueStatus = deriveFatigueStatus(recentLogs);
  const activePlateaus = identifyPlateaus(recentLogs);
  return {
    goal: mapGoal(user?.fitnessGoal),
    experienceLevel: mapExperienceLevel(user?.activityLevel),
    preferredIntensityRPE: averageRPE,
    fatigueStatus,
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
 */
export async function buildWorkoutSummary(
  userId: string,
  depthDays: number,
): Promise<WorkoutSummary> {
  const logs = await fetchRecentLogs(userId, depthDays);
  return aggregateExerciseSummaries(logs);
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
  if (messages.length === 0) return [];
  // Take only the last few message pairs to keep tokens low
  const maxMessages = MAX_PERSISTED_HISTORY_MESSAGES;
  const recentMessages = messages.slice(-maxMessages);
  const history: ChatHistoryMessage[] = recentMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  // Prepend the conversation summary if it exists (older context condensed)
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
 */
export async function buildChatMessages(
  userId: string,
  userMessage: string,
  intent: CoachIntent,
  chatHistory?: ChatHistoryMessage[],
): Promise<ChatCompletionMessageParam[]> {
  const config = INTENT_CONTEXT_CONFIG[intent];
  const [profile, workoutSummary] = await Promise.all([
    config.needsFullProfile
      ? buildCoachProfile(userId)
      : buildMinimalCoachProfile(userId),
    config.needsWorkoutSummary
      ? buildWorkoutSummary(userId, config.workoutSummaryDepthDays)
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
  const rpeValues = logs
    .map((log) => log.rateOfPerceivedExertion)
    .filter((rpe): rpe is number => rpe !== undefined && rpe !== null);
  if (rpeValues.length === 0) return 7;
  const sum = rpeValues.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / rpeValues.length) * 10) / 10;
}

function deriveFatigueStatus(recentLogs: ILog[]): FatigueStatus {
  const uniqueDays = new Set(
    recentLogs.map((log) => {
      const date = new Date(log.createdAt ?? Date.now());
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }),
  );
  const workoutDays = uniqueDays.size;
  if (workoutDays >= FATIGUE_THRESHOLD_HIGH) return "overtrained";
  if (workoutDays >= FATIGUE_THRESHOLD_MEDIUM) return "fatigued";
  if (workoutDays >= 2) return "normal";
  return "fresh";
}

function identifyPlateaus(logs: ILog[]): string[] {
  const exerciseGroups = groupLogsByExercise(logs);
  const plateaus: string[] = [];
  for (const [exerciseName, exerciseLogs] of Object.entries(exerciseGroups)) {
    const trend = calculateTrend(exerciseLogs);
    if (trend === "flat") {
      plateaus.push(exerciseName);
    }
  }
  return plateaus;
}

function groupLogsByExercise(logs: ILog[]): Record<string, ILog[]> {
  const groups: Record<string, ILog[]> = {};
  for (const log of logs) {
    const name = getExerciseName(log);
    if (!groups[name]) {
      groups[name] = [];
    }
    groups[name].push(log);
  }
  return groups;
}

function getExerciseName(log: ILog): string {
  const exerciseId = log.exerciseId as unknown;
  if (exerciseId && typeof exerciseId === "object" && "name" in exerciseId) {
    return ((exerciseId as Record<string, unknown>).name as string) ?? "unknown";
  }
  return "unknown";
}

function calculateBestSetVolume(log: ILog): number {
  if (!log.sets || log.sets.length === 0) return 0;
  return Math.max(...log.sets.map((set) => set.reps * set.weight));
}

function formatBestSet(log: ILog): string {
  if (!log.sets || log.sets.length === 0) return "N/A";
  let bestVolume = 0;
  let bestSet = log.sets[0];
  for (const set of log.sets) {
    const volume = set.reps * set.weight;
    if (volume > bestVolume) {
      bestVolume = volume;
      bestSet = set;
    }
  }
  return `${bestSet.reps}x${bestSet.weight}kg`;
}

function calculateTrend(exerciseLogs: ILog[]): ExerciseTrend {
  if (exerciseLogs.length < TREND_SESSIONS_COUNT) return "flat";
  const sorted = [...exerciseLogs].sort((a, b) => {
    const dateA = new Date(a.createdAt ?? 0).getTime();
    const dateB = new Date(b.createdAt ?? 0).getTime();
    return dateA - dateB;
  });
  const recent = sorted.slice(-TREND_SESSIONS_COUNT);
  const volumes = recent.map(calculateBestSetVolume);
  const firstVolume = volumes[0];
  const lastVolume = volumes[volumes.length - 1];
  if (firstVolume === 0) return "flat";
  const changePercent = ((lastVolume - firstVolume) / firstVolume) * 100;
  if (changePercent > TREND_THRESHOLD_PERCENT) return "up";
  if (changePercent < -TREND_THRESHOLD_PERCENT) return "down";
  return "flat";
}

function aggregateExerciseSummaries(logs: ILog[]): WorkoutSummary {
  const groups = groupLogsByExercise(logs);
  const summary: WorkoutSummary = {};
  for (const [exerciseName, exerciseLogs] of Object.entries(groups)) {
    const sorted = [...exerciseLogs].sort((a, b) => {
      const dateA = new Date(a.createdAt ?? 0).getTime();
      const dateB = new Date(b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
    const latest = sorted[0];
    const rpeValues = sorted
      .map((l) => l.rateOfPerceivedExertion)
      .filter((r): r is number => r !== undefined && r !== null);
    const avgRPE =
      rpeValues.length > 0
        ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
        : null;
    const exerciseSummary: ExerciseSummary = {
      lastBestSet: formatBestSet(latest),
      rpe: avgRPE,
      trend: calculateTrend(exerciseLogs),
    };
    summary[exerciseName] = exerciseSummary;
  }
  return summary;
}

function summarizeChatHistory(
  chatHistory?: ChatHistoryMessage[],
  maxPairs?: number,
): string | undefined {
  if (!chatHistory || chatHistory.length === 0) return undefined;
  const limit = (maxPairs ?? 3) * 2;
  const trimmed = chatHistory.slice(-limit);
  return trimmed
    .map((msg) => `${msg.role === "user" ? "User" : "Coach"}: ${msg.content}`)
    .join("\n");
}

const SYSTEM_PROMPT = `You are a professional, empathetic fitness coach. Your responses should be:
- Objective and evidence-based
- Warm and supportive, never dismissive
- Concise and actionable (aim for 3-5 sentences)
- Use simple language, avoid jargon unless the user is advanced

Never prescribe medical advice. If asked about injuries or pain, recommend seeing a professional.
Respond ONLY about fitness, nutrition, and recovery topics. Politely decline unrelated questions.`;

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
