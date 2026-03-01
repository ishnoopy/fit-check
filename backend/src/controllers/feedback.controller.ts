import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as userRepository from "../repositories/user.repository.js";
import * as feedbackService from "../services/feedback.service.js";
import { BadRequestError } from "../utils/errors.js";

const createFeedbackSchema = z.object({
  category: z.enum(["general", "bug", "feature"]).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Please share a bit more detail (at least 10 characters).")
    .max(1000, "Feedback is too long (max 1000 characters)."),
});

export async function createFeedback(c: Context) {
  const body = await c.req.json();
  const validation = await createFeedbackSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const feedback = await feedbackService.createFeedbackService(
    {
      category: validation.data.category ?? "general",
      message: validation.data.message,
    },
    userId,
  );

  return c.json(
    {
      success: true,
      data: feedback,
      message: "Thank you for sharing your feedback.",
    },
    StatusCodes.CREATED,
  );
}

export async function getMyFeedback(c: Context) {
  const userId = c.get("user").id;
  const user = await userRepository.findOne({ id: userId });
  const feedbacks = user?.isPioneer
    ? await feedbackService.getAllFeedbackService()
    : await feedbackService.getFeedbackByUserIdService(userId);

  return c.json(
    {
      success: true,
      data: feedbacks,
    },
    StatusCodes.OK,
  );
}
