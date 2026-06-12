import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as buddyService from "../services/buddy.service.js";
import { BadRequestError } from "../utils/errors.js";

// ─── Schemas ────────────────────────────────────────────────────────────

const buddyIdParamSchema = z.object({
  id: z.string().length(24, "Invalid buddy ID"),
});

const establishBuddySchema = z.object({
  userId: z.string().length(24, "Invalid user ID"),
});

// ─── Controllers ────────────────────────────────────────────────────────

export async function establishBuddy(c: Context) {
  const body = await c.req.json();
  const validation = await establishBuddySchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const buddy = await buddyService.establishBuddy(userId, validation.data.userId);

  return c.json(
    { success: true, data: buddy },
    StatusCodes.CREATED,
  );
}

export async function listBuddies(c: Context) {
  const userId = c.get("user").id;
  const buddies = await buddyService.listBuddies(userId);

  return c.json(
    { success: true, data: buddies },
    StatusCodes.OK,
  );
}

export async function getBuddyDetail(c: Context) {
  const params = await buddyIdParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const buddy = await buddyService.getBuddyDetail(params.data.id, userId);

  return c.json(
    { success: true, data: buddy },
    StatusCodes.OK,
  );
}

export async function endBuddy(c: Context) {
  const params = await buddyIdParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const result = await buddyService.endBuddy(params.data.id, userId);

  return c.json(
    { success: true, data: result },
    StatusCodes.OK,
  );
}

export async function sendNudge(c: Context) {
  const params = await buddyIdParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const result = await buddyService.sendNudge(params.data.id, userId);

  return c.json(
    { success: true, data: result },
    StatusCodes.OK,
  );
}

export async function getNudgeStatus(c: Context) {
  const params = await buddyIdParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const status = await buddyService.getNudgeStatus(params.data.id, userId);

  return c.json(
    { success: true, data: status },
    StatusCodes.OK,
  );
}
