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
