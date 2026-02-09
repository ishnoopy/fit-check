import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { BadRequestError } from "../lib/errors.js";
import type { IMessage } from "../models/conversation.model.js";
import * as coachService from "../services/coach.service.js";
import * as conversationService from "../services/conversation.service.js";
import {
  MAX_MESSAGE_LENGTH,
  VALID_INTENTS,
  type CoachChatRequest,
  type CoachIntent,
} from "../utils/types/coach.types.js";

/**
 * POST /api/coach/chat
 * Streams an AI coach response via Server-Sent Events.
 * Persists the message pair to a conversation (creates one if needed).
 */
export async function chat(c: Context) {
  const body = await c.req.json<CoachChatRequest>();
  validateChatRequest(body);
  const userId: string = c.get("user").id;
  const { message, conversationId } = body;
  const intent: CoachIntent = body.intent
    ? body.intent
    : await coachService.classifyIntent(message);
  // Load persisted chat history from conversation if available
  const chatHistory = conversationId
    ? await coachService.buildChatHistoryFromConversation(conversationId, userId)
    : body.chatHistory;
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
      const savedConversationId = await persistMessages(
        userId,
        conversationId,
        message,
        fullResponse,
        intent,
      );
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

/**
 * Persist the user message and coach response to a conversation.
 * Creates a new conversation if no conversationId is provided.
 */
async function persistMessages(
  userId: string,
  conversationId: string | undefined,
  userMessage: string,
  coachResponse: string,
  intent: CoachIntent,
): Promise<string> {
  const userMsg: IMessage = {
    role: "user",
    content: userMessage,
    intent,
    createdAt: new Date(),
  };
  const coachMsg: IMessage = {
    role: "coach",
    content: coachResponse,
    intent,
    createdAt: new Date(),
  };
  if (conversationId) {
    await conversationService.appendMessagesService(
      conversationId,
      userId,
      [userMsg, coachMsg],
    );
    return conversationId;
  }
  // Create a new conversation with the first exchange
  const title = generateTitle(userMessage);
  const conversation = await conversationService.createConversationService(
    userId,
    title,
    [userMsg, coachMsg],
  );
  return conversation.id as string;
}

/** Generate a short title from the user's first message */
function generateTitle(message: string): string {
  const maxTitleLength = 50;
  const trimmed = message.trim();
  if (trimmed.length <= maxTitleLength) return trimmed;
  return `${trimmed.slice(0, maxTitleLength - 3)}...`;
}

/** Validate the incoming chat request body */
function validateChatRequest(body: CoachChatRequest): void {
  if (!body.message || typeof body.message !== "string") {
    throw new BadRequestError("Message is required and must be a string");
  }
  const trimmed = body.message.trim();
  if (trimmed.length === 0) {
    throw new BadRequestError("Message cannot be empty");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new BadRequestError(
      `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
    );
  }
  if (body.intent && !VALID_INTENTS.has(body.intent)) {
    throw new BadRequestError(`Invalid intent: ${body.intent}`);
  }
  if (body.conversationId && body.conversationId.length !== 24) {
    throw new BadRequestError("Invalid conversation ID");
  }
}
