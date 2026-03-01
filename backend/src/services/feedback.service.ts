import type { IFeedback } from "../models/feedback.model.js";
import * as feedbackRepository from "../repositories/feedback.repository.js";

type CreateFeedbackPayload = Pick<IFeedback, "category" | "message">;

export async function createFeedbackService(
  payload: CreateFeedbackPayload,
  userId: string,
) {
  return feedbackRepository.createFeedback({
    ...payload,
    userId,
  });
}

export async function getFeedbackByUserIdService(userId: string) {
  return feedbackRepository.findByUserId(userId);
}

export async function getAllFeedbackService() {
  return feedbackRepository.findAll();
}
