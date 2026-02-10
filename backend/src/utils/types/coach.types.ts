/** Intent categories for the AI coach */
export const COACH_INTENT = {
  NEXT_WORKOUT: "NEXT_WORKOUT",
  SESSION_FEEDBACK: "SESSION_FEEDBACK",
  PAST_SESSION_FEEDBACK: "PAST_SESSION_FEEDBACK",
  PROGRESS_CHECK: "PROGRESS_CHECK",
  DIFFICULTY_ANALYSIS: "DIFFICULTY_ANALYSIS",
  TIPS: "TIPS",
  GENERAL_COACHING: "GENERAL_COACHING",
} as const;

export type CoachIntent = (typeof COACH_INTENT)[keyof typeof COACH_INTENT];

/** Valid coach intents as a set for runtime validation */
export const VALID_INTENTS = new Set<string>(Object.values(COACH_INTENT));

/** Trend direction for exercise progression */
export type ExerciseTrend = "up" | "down" | "flat";

/** Fatigue status derived from recent workout frequency */
export type FatigueStatus = "fresh" | "normal" | "fatigued" | "overtrained";

/** Session data with best set and date */
export interface SessionData {
  date: Date;
  bestSet: string;
  volume: number;
  notes?: string;
}

/** Summary of a single exercise's recent performance */
export interface ExerciseSummary {
  lastBestSet: string;
  rpe: number | null;
  trend: ExerciseTrend;
  volumeChangePercent: number | null;
  sessions: SessionData[];
}

/** Aggregated workout summary keyed by exercise name */
export type WorkoutSummary = Record<string, ExerciseSummary>;

/** Coach profile assembled from user data and workout history */
export interface CoachProfile {
  goal: string;
  experienceLevel: string;
  preferredIntensityRPE: number;
  // fatigueStatus: FatigueStatus;
  activePlateaus: string[];
}

/** Chat message in the conversation history */
export interface ChatHistoryMessage {
  role: "user" | "coach";
  content: string;
}

/** Incoming request body for the coach chat endpoint */
export interface CoachChatRequest {
  message: string;
  intent?: CoachIntent;
  conversationId?: string;
  chatHistory?: ChatHistoryMessage[];
}

/** Structured context sent to the LLM */
export interface CoachContext {
  coachProfile: CoachProfile | Partial<CoachProfile>;
  intent: CoachIntent;
  workoutSummary?: WorkoutSummary;
  chatSummary?: string;
  focusedExercise?: string;
}

/** Configuration for which data each intent needs */
export interface IntentContextConfig {
  needsFullProfile: boolean;
  needsWorkoutSummary: boolean;
  workoutSummaryDepthDays: number;
  needsChatHistory: boolean;
  maxChatHistoryPairs: number;
}

/** Intent-specific context configuration map */
export const INTENT_CONTEXT_CONFIG: Record<CoachIntent, IntentContextConfig> = {
  NEXT_WORKOUT: {
    needsFullProfile: true,
    needsWorkoutSummary: true,
    workoutSummaryDepthDays: 14,
    needsChatHistory: false,
    maxChatHistoryPairs: 0,
  },
  SESSION_FEEDBACK: {
    needsFullProfile: false,
    needsWorkoutSummary: true,
    workoutSummaryDepthDays: 1,
    needsChatHistory: true,
    maxChatHistoryPairs: 2,
  },
  PAST_SESSION_FEEDBACK: {
    needsFullProfile: false,
    needsWorkoutSummary: true,
    workoutSummaryDepthDays: 14,
    needsChatHistory: true,
    maxChatHistoryPairs: 2,
  },
  PROGRESS_CHECK: {
    needsFullProfile: true,
    needsWorkoutSummary: true,
    workoutSummaryDepthDays: 14,
    needsChatHistory: false,
    maxChatHistoryPairs: 0,
  },
  DIFFICULTY_ANALYSIS: {
    needsFullProfile: false,
    needsWorkoutSummary: true,
    workoutSummaryDepthDays: 7,
    needsChatHistory: true,
    maxChatHistoryPairs: 1,
  },
  TIPS: {
    needsFullProfile: false,
    needsWorkoutSummary: false,
    workoutSummaryDepthDays: 0,
    needsChatHistory: true,
    maxChatHistoryPairs: 3,
  },
  GENERAL_COACHING: {
    needsFullProfile: false,
    needsWorkoutSummary: true,
    workoutSummaryDepthDays: 7,
    needsChatHistory: true,
    maxChatHistoryPairs: 5,
  },
};

/** Maximum character length for free-text user messages */
export const MAX_MESSAGE_LENGTH = 300;

/** Result of exercise matching attempt */
export interface ExerciseMatchResult {
  matchedExercise: string | null;
  confidence: number;
  method: "deterministic" | "llm" | "none";
}
