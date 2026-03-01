import FeedbackModel, { type IFeedback } from "../models/feedback.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

export async function createFeedback(feedback: IFeedback) {
  const payload = toSnakeCase(feedback);
  const doc = await FeedbackModel.create(payload);
  return toCamelCase(doc.toObject()) as IFeedback;
}

export async function findByUserId(userId: string) {
  const feedbacks = await FeedbackModel.find({ user_id: userId })
    .sort({ created_at: -1 })
    .lean();

  return toCamelCase(feedbacks) as IFeedback[];
}

export async function findAll() {
  const feedbacks = await FeedbackModel.find().sort({ created_at: -1 }).lean();
  return toCamelCase(feedbacks) as IFeedback[];
}
