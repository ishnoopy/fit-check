import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import * as conversationService from "../services/conversation.service.js";

const idParamSchema = z.object({
  id: z.string().length(24, "Invalid conversation ID"),
});

const getConversationsQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      return isNaN(num) || num < 1 ? 1 : num;
    })
    .optional(),
  limit: z
    .string()
    .transform((val) => {
      const num = parseInt(val, 10);
      return isNaN(num) || num < 1 ? 20 : Math.min(num, 50);
    })
    .optional(),
});

/** GET /api/coach/conversations */
export async function getConversations(c: Context) {
  const params = await getConversationsQuerySchema.safeParseAsync(
    c.req.query(),
  );
  if (!params.success) {
    throw new BadRequestError(params.error);
  }
  const userId: string = c.get("user").id;
  const result = await conversationService.getConversationsService(
    userId,
    params.data,
  );
  return c.json(
    { success: true, data: result.data, total: result.total },
    StatusCodes.OK,
  );
}

/** GET /api/coach/conversations/:id */
export async function getConversation(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());
  if (!params.success) {
    throw new BadRequestError(params.error);
  }
  const userId: string = c.get("user").id;
  const conversation = await conversationService.getConversationByIdService(
    params.data.id,
    userId,
  );
  return c.json(
    { success: true, data: conversation },
    StatusCodes.OK,
  );
}

/** DELETE /api/coach/conversations/:id */
export async function deleteConversation(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());
  if (!params.success) {
    throw new BadRequestError(params.error);
  }
  const userId: string = c.get("user").id;
  await conversationService.deleteConversationService(
    params.data.id,
    userId,
  );
  return c.json(
    { success: true, message: "Conversation deleted successfully" },
    StatusCodes.OK,
  );
}
