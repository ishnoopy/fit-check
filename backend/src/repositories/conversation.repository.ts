import ConversationModel, {
  type IConversation,
  type IMessageModel,
} from "../models/conversation.model.js";
import { Types } from "mongoose";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

/** Create a new conversation */
export async function createConversation(
  conversation: Pick<IConversation, "userId" | "title" | "messages">,
): Promise<IConversation> {
  const payload = toSnakeCase(conversation);
  const doc = await ConversationModel.create(payload);
  return toCamelCase(doc.toObject()) as IConversation;
}

/** Find all conversations for a user, ordered by most recent */
export async function findByUserId(
  userId: string,
  options?: { limit?: number; skip?: number },
): Promise<IConversation[]> {
  const query = ConversationModel.find({ user_id: userId })
    .select("_id title summary updated_at created_at")
    .sort({ updated_at: -1 });
  if (options?.skip) query.skip(options.skip);
  if (options?.limit) query.limit(options.limit);
  const docs = await query.lean();
  return toCamelCase(docs) as IConversation[];
}

/** Find a single conversation by ID */
export async function findById(id: string): Promise<IConversation | null> {
  const doc = await ConversationModel.findById(id).lean();
  return doc ? (toCamelCase(doc) as IConversation) : null;
}

/** Append messages to an existing conversation */
export async function appendMessages(
  conversationId: string,
  messages: IMessageModel[],
): Promise<IConversation | null> {
  const doc = await ConversationModel.findByIdAndUpdate(
    conversationId,
    { $push: { messages: { $each: messages } } },
    { new: true, lean: true },
  );
  return doc ? (toCamelCase(doc) as IConversation) : null;
}

/** Update the conversation summary */
export async function updateSummary(
  conversationId: string,
  summary: string,
): Promise<IConversation | null> {
  const doc = await ConversationModel.findByIdAndUpdate(
    conversationId,
    { summary },
    { new: true, lean: true },
  );
  return doc ? (toCamelCase(doc) as IConversation) : null;
}

/** Update the conversation title */
export async function updateTitle(
  conversationId: string,
  title: string,
): Promise<IConversation | null> {
  const doc = await ConversationModel.findByIdAndUpdate(
    conversationId,
    { title },
    { new: true, lean: true },
  );
  return doc ? (toCamelCase(doc) as IConversation) : null;
}

/** Delete a conversation */
export async function deleteConversation(
  id: string,
): Promise<IConversation | null> {
  const doc = await ConversationModel.findByIdAndDelete(id).lean();
  return doc ? (toCamelCase(doc) as IConversation) : null;
}

/** Count conversations for a user */
export async function countByUserId(userId: string): Promise<number> {
  return ConversationModel.countDocuments({ user_id: userId });
}

/** Count user-authored messages for a conversation owner in a time range */
export async function countUserMessagesByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  if (!Types.ObjectId.isValid(userId)) {
    return 0;
  }

  const result = await ConversationModel.aggregate([
    { $match: { user_id: new Types.ObjectId(userId) } },
    { $unwind: "$messages" },
    {
      $match: {
        "messages.role": "user",
        "messages.created_at": { $gte: startDate, $lte: endDate },
      },
    },
    { $count: "count" },
  ]);

  return result[0]?.count ?? 0;
}
