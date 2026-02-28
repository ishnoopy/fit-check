import type { IConversation, IMessage } from "../models/conversation.model.js";
import * as conversationRepository from "../repositories/conversation.repository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import { toSnakeCase } from "../utils/transformer.js";

const MAX_CONVERSATIONS_PER_USER = 50;
const DEFAULT_CONVERSATION_TITLE = "New conversation";
const SUMMARY_MESSAGE_THRESHOLD = 10;

/**
 * Get all conversations for a user (list view, no messages included).
 */
export async function getConversationsService(
  userId: string,
  options?: { page?: number; limit?: number },
): Promise<{ data: IConversation[]; total: number }> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const skip = (page - 1) * limit;
  const [conversations, total] = await Promise.all([
    conversationRepository.findByUserId(userId, { limit, skip }),
    conversationRepository.countByUserId(userId),
  ]);
  return { data: conversations, total };
}

/**
 * Get a single conversation with all messages.
 */
export async function getConversationByIdService(
  conversationId: string,
  userId: string,
): Promise<IConversation> {
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }
  if ((conversation.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to conversation");
  }
  return conversation;
}

/**
 * Create a new conversation with an initial pair of messages.
 */
export async function createConversationService(
  userId: string,
  title?: string,
  initialMessages?: IMessage[],
): Promise<IConversation> {
  const count = await conversationRepository.countByUserId(userId);
  if (count >= MAX_CONVERSATIONS_PER_USER) {
    throw new BadRequestError(
      `Maximum of ${MAX_CONVERSATIONS_PER_USER} conversations reached. Please delete old conversations.`,
    );
  }
  return conversationRepository.createConversation({
    userId,
    title: title ?? DEFAULT_CONVERSATION_TITLE,
    messages: initialMessages ?? [],
  });
}

/**
 * Append a user message and coach response to an existing conversation.
 * Also builds a running summary for LLM context when the conversation grows.
 */
export async function appendMessagesService(
  conversationId: string,
  userId: string,
  messages: IMessage[],
): Promise<IConversation> {
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }
  if ((conversation.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to conversation");
  }
  const snakeMessages = toSnakeCase(messages);
  const updated = await conversationRepository.appendMessages(
    conversationId,
    snakeMessages,
  );
  if (!updated) {
    throw new NotFoundError("Failed to update conversation");
  }
  // Auto-generate summary when conversation grows past threshold
  const totalMessages = (conversation.messages?.length ?? 0) + messages.length;
  if (totalMessages >= SUMMARY_MESSAGE_THRESHOLD && totalMessages % 4 === 0) {
    const summary = buildConversationSummary(updated.messages);
    await conversationRepository.updateSummary(conversationId, summary);
  }
  return updated;
}

/**
 * Delete a conversation.
 */
export async function deleteConversationService(
  conversationId: string,
  userId: string,
): Promise<void> {
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }
  if ((conversation.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to conversation");
  }
  await conversationRepository.deleteConversation(conversationId);
}

/**
 * Build a lightweight summary of the conversation for LLM context.
 * Takes the full message array and produces a condensed text.
 */
function buildConversationSummary(messages: IMessage[]): string {
  if (!messages || messages.length === 0) return "";
  // Keep first exchange for topic context, summarize the rest
  const firstExchange = messages.slice(0, 2);
  const remaining = messages.slice(2);
  const topicLine = firstExchange
    .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${truncate(m.content, 80)}`)
    .join(" | ");
  if (remaining.length === 0) return topicLine;
  // Extract unique topics/intents from remaining messages
  const userQuestions = remaining
    .filter((m) => m.role === "user")
    .map((m) => truncate(m.content, 60));
  const questionsLine =
    userQuestions.length > 0
      ? `Topics discussed: ${userQuestions.slice(-5).join("; ")}`
      : "";
  return [topicLine, questionsLine].filter(Boolean).join("\n");
}

/** Truncate a string to a max length with ellipsis */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}
