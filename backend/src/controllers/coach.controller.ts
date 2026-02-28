import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import * as coachService from "../services/coach.service.js";
import { BadRequestError } from "../utils/errors.js";
import {
  COACH_INTENT,
  MAX_MESSAGE_LENGTH,
} from "../utils/types/coach.types.js";

const chatRequestSchema = z.object({
  message: z
    .string({ required_error: "Message is required and must be a string" })
    .trim()
    .min(1, "Message cannot be empty")
    .max(MAX_MESSAGE_LENGTH, {
      message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
    }),
  intent: z.nativeEnum(COACH_INTENT).optional(),
  conversationId: z.string().length(24, "Invalid conversation ID").optional(),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "coach"]),
        content: z.string(),
      }),
    )
    .optional(),
});

/**
 * POST /api/coach/chat
 * Streams an AI coach response via Server-Sent Events.
 * Persists the message pair to a conversation (creates one if needed).
 */
export async function chat(c: Context) {
  const params = await chatRequestSchema.safeParseAsync(await c.req.json());
  if (!params.success) {
    throw new BadRequestError(params.error);
  }
  const body = params.data;
  const userId: string = c.get("user").id;
  const { message, conversationId } = body;
  const { intent, chatHistory, focusedExercise } = await coachService.prepareChatSession({
    userId,
    message,
    intent: body.intent,
    conversationId,
    chatHistory: body.chatHistory,
  });
  let eventId = 0;
  return streamSSE(c, async (stream) => {
    let fullResponse = "";
    try {
      await stream.writeSSE({
        data: JSON.stringify({ intent }),
        event: "intent",
        id: String(eventId++),
      });
      const textStream = await coachService.streamCoachResponse(
        userId,
        message,
        intent,
        chatHistory,
      );
      for await (const delta of textStream) {
        fullResponse += delta;
        await stream.writeSSE({
          data: JSON.stringify({ content: delta }),
          event: "delta",
          id: String(eventId++),
        });
      }
      // Persist messages to conversation
      const savedConversationId = await coachService.persistChatExchange({
        userId,
        conversationId,
        userMessage: message,
        coachResponse: fullResponse,
        intent,
        focusedExercise,
      });
      await stream.writeSSE({
        data: JSON.stringify({ done: true, conversationId: savedConversationId }),
        event: "done",
        id: String(eventId++),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      await stream.writeSSE({
        data: JSON.stringify({ error: errorMessage }),
        event: "error",
        id: String(eventId++),
      });
    }
  });
}
