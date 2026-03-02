import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as coachService from "../services/coach.service.js";
import * as coachAccessService from "../services/coach-access.service.js";
import { BadRequestError, ForbiddenError } from "../utils/errors.js";
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

  const quota = await coachAccessService.getCoachQuota(userId);
  if (!coachAccessService.canUseCoach(quota)) {
    throw new ForbiddenError(
      "Weekly AI coach request limit reached. Refer a friend who logs their first workout to unlock 10 more requests.",
    );
  }

  const { intent, chatHistory } = await coachService.prepareChatSession({
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
      const { stream: textStream, focusedExercise: responseFocusedExercise } = await coachService.streamCoachResponse(
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
        focusedExercise: responseFocusedExercise,
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

/**
 * GET /api/coach/quota
 * Returns weekly quota usage and referral invitation details.
 */
export async function getQuota(c: Context) {
  const userId: string = c.get("user").id;
  const referralCode = await coachAccessService.ensureUserReferralCode(userId);
  const quota = await coachAccessService.getCoachQuota(userId);

  return c.json(
    {
      success: true,
      data: {
        ...quota,
        referralCode,
        invitationLink: coachAccessService.buildInvitationLink(referralCode),
      },
    },
    StatusCodes.OK,
  );
}
