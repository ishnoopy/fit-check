import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import type { ISetData } from "../models/log.model.js";
import * as logService from "../services/log.service.js";
import { toCamelCase } from "../utils/transformer.js";

const setDataSchema: z.ZodType<ISetData> = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().nonnegative(),
  notes: z.string().optional(),
});

const createLogSchema = z.object({
  planId: z.string().length(24, "Invalid plan ID"),
  workoutId: z.string().length(24, "Invalid workout ID"),
  exerciseId: z.string().length(24, "Invalid exercise ID"),
  sets: z.array(setDataSchema).min(1, "At least one set is required"),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const updateLogSchema = z.object({
  planId: z.string().length(24).optional(),
  workoutId: z.string().length(24).optional(),
  exerciseId: z.string().length(24).optional(),
  sets: z.array(setDataSchema).min(1).optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().length(24),
});

const getLatestLogsQuerySchema = z.object({
  exercise_ids: z.array(z.string().length(24)).optional(),
});

// query params are in snake_case
const getLogsQuerySchema = z.object({
  id: z.string().length(24).optional(),
  start_date: z.string().datetime().optional(), //e.g. 2025-12-28T00:00:00.000Z
  end_date: z.string().datetime().optional(),
  exercise_id: z.string().length(24).optional(),
  plan_id: z.string().length(24).optional(),
  workout_id: z.string().length(24).optional(),
  latest: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  sort_by: z.enum(["created_at", "updated_at", "workout_date"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  llm_message: z.string().transform((val) => val === "true").optional(),
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
      return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
    })
    .optional(),
});

export type ICreateLogPayload = z.infer<typeof createLogSchema>;


export async function getLogs(c: Context) {
  const params = await getLogsQuerySchema.safeParseAsync(c.req.query());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const query = toCamelCase(params.data);

  const userId = c.get("user").id;
  const result = await logService.getLogsByQueryService(query, userId);

  if (typeof result === "string") {
    return c.json({
      success: true,
      data: result,
    }, StatusCodes.OK);
  }

  return c.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  }, StatusCodes.OK);
}

export async function createLog(c: Context) {
  const body = await c.req.json();
  const validation = await createLogSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }


  const userId = c.get("user").id;

  const log = await logService.createLogService(validation.data, userId);

  return c.json({
    success: true,
    data: log,
  }, StatusCodes.CREATED);
}

export async function updateLog(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const body = await c.req.json();
  const validation = await updateLogSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;


  const log = await logService.updateLogService(params.data.id, validation.data, userId);

  return c.json({
    success: true,
    data: log,
  }, StatusCodes.OK);
}

export async function deleteLog(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  await logService.deleteLogService(params.data.id, userId);

  return c.json({
    success: true,
    message: "Log deleted successfully",
  }, StatusCodes.OK);
}

export async function getExerciseHistory(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const history = await logService.getExerciseHistoryService(userId, params.data.id);

  return c.json({
    success: true,
    data: history,
  }, StatusCodes.OK);
}

export async function getLogStats(c: Context) {
  const userId = c.get("user").id;
  const stats = await logService.getLogStatsService(userId);

  return c.json({
    success: true,
    data: stats,
  }, StatusCodes.OK);
}

export async function getLatestLogs(c: Context) {
  const params = await getLatestLogsQuerySchema.safeParseAsync(c.req.queries());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const logs = await logService.getLatestLogsService(userId, params.data.exercise_ids || []);
  return c.json({
    success: true,
    data: logs,
  }, StatusCodes.OK);
}
