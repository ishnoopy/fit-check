import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import * as settingService from "../services/setting.service.js";

const createSettingSchema = z.object({
  settings: z.object({
    restDays: z.number().int().nonnegative().optional(),
    timezone: z.string().optional(),
  }),
});

const updateSettingSchema = z.object({
  settings: z
    .object({
      restDays: z.number().int().nonnegative().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export async function getSetting(c: Context) {
  const userId = c.get("user").id;
  const setting = await settingService.getSettingByUserIdService(userId);

  return c.json(
    {
      success: true,
      data: setting,
    },
    StatusCodes.OK,
  );
}

export async function createSetting(c: Context) {
  const body = await c.req.json();
  const validation = await createSettingSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const setting = await settingService.createSettingService(
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: setting,
    },
    StatusCodes.CREATED,
  );
}

export async function updateSetting(c: Context) {
  const body = await c.req.json();
  const validation = await updateSettingSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const setting = await settingService.updateSettingService(
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: setting,
    },
    StatusCodes.OK,
  );
}

export async function upsertSetting(c: Context) {
  const body = await c.req.json();
  const validation = await updateSettingSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const setting = await settingService.upsertSettingService(
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: setting,
    },
    StatusCodes.OK,
  );
}

export async function deleteSetting(c: Context) {
  const userId = c.get("user").id;
  await settingService.deleteSettingService(userId);

  return c.json(
    {
      success: true,
      message: "Setting deleted successfully",
    },
    StatusCodes.OK,
  );
}
