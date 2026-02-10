import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import {
  COACH_INTENT,
  VALID_INTENTS,
  type CoachIntent,
} from "../utils/types/coach.types.js";

const CLASSIFICATION_MODEL = "gpt-4o-mini";
const CHAT_MODEL = "gpt-4o-mini";
const CLASSIFICATION_MAX_TOKENS = 20;
const EXERCISE_EXTRACTION_MAX_TOKENS = 50;
const CHAT_MAX_TOKENS = 500;

let openaiClient: OpenAI | null = null;

/** Lazily initialize the OpenAI client */
function getClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

const INTENT_CLASSIFICATION_PROMPT = `Classify the user's fitness coaching question into exactly ONE of these intents:
- NEXT_WORKOUT: Asking what to do in upcoming workout, next session planning
- SESSION_FEEDBACK: Asking about today's performance, how they did
- PAST_SESSION_FEEDBACK: Asking about past performance, how they did
- PROGRESS_CHECK: Asking about long-term progress, trends, improvements
- DIFFICULTY_ANALYSIS: Asking why something was hard, fatigue, struggle
- TIPS: Asking for general advice, form tips, recovery tips
- GENERAL_COACHING: Any other fitness question that doesn't fit above

Respond with ONLY the intent name, nothing else.`;

/**
 * Classify a free-text user message into a coach intent.
 * Uses gpt-4o-mini for cost efficiency (~20 tokens output).
 */
export async function classifyIntent(message: string): Promise<CoachIntent> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: CLASSIFICATION_MODEL,
    max_tokens: CLASSIFICATION_MAX_TOKENS,
    temperature: 0,
    messages: [
      { role: "system", content: INTENT_CLASSIFICATION_PROMPT },
      { role: "user", content: message },
    ],
  });
  const rawIntent = response.choices[0]?.message?.content?.trim() ?? "";
  if (VALID_INTENTS.has(rawIntent)) {
    return rawIntent as CoachIntent;
  }
  return COACH_INTENT.GENERAL_COACHING;
}

/**
 * Create a streaming chat completion and return the raw OpenAI stream.
 * The caller is responsible for piping the stream to the HTTP response.
 */
export async function createChatStream(
  messages: ChatCompletionMessageParam[],
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const client = getClient();
  return client.chat.completions.create({
    model: CHAT_MODEL,
    max_tokens: CHAT_MAX_TOKENS,
    temperature: 0.7,
    stream: true,
    messages,
  });
}

const EXERCISE_EXTRACTION_PROMPT = `You are an exercise name extractor. Given a user message and a list of known exercises, identify if the user is asking about a specific exercise.

Rules:
- Return ONLY the exact exercise name from the known list if the user is clearly referring to it
- Return "NONE" if no specific exercise is mentioned or the reference is ambiguous
- Match common abbreviations and variations (e.g., "db" = dumbbell, "bb" = barbell, "ohp" = overhead press)
- Be conservative: only match if confident

Respond with ONLY the exercise name or "NONE", nothing else.`;

/**
 * Extract a specific exercise name from user message using LLM.
 * Used as fallback when deterministic matching fails.
 */
export async function extractExerciseFromMessage(
  userMessage: string,
  knownExercises: string[],
): Promise<string | null> {
  if (knownExercises.length === 0) return null;
  const client = getClient();
  const exerciseList = knownExercises.join(", ");
  const response = await client.chat.completions.create({
    model: CLASSIFICATION_MODEL,
    max_tokens: EXERCISE_EXTRACTION_MAX_TOKENS,
    temperature: 0,
    messages: [
      { role: "system", content: EXERCISE_EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Known exercises: ${exerciseList}\n\nUser message: "${userMessage}"`,
      },
    ],
  });
  const result = response.choices[0]?.message?.content?.trim() ?? "";
  if (result === "NONE" || result === "") return null;
  // Verify the result is in the known exercises list (case-insensitive)
  const matched = knownExercises.find(
    (ex) => ex.toLowerCase() === result.toLowerCase()
  );
  return matched ?? null;
}
