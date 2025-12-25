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
  workoutDate: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const updateLogSchema = z.object({
  planId: z.string().length(24).optional(),
  workoutId: z.string().length(24).optional(),
  exerciseId: z.string().length(24).optional(),
  sets: z.array(setDataSchema).min(1).optional(),
  workoutDate: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().length(24),
});

// query params are in snake_case
const getLogsQuerySchema = z.object({
  id: z.string().length(24).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  exercise_id: z.string().length(24).optional(),
  plan_id: z.string().length(24).optional(),
  workout_id: z.string().length(24).optional(),
  latest: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  sort_by: z.enum(["created_at", "updated_at"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export type ICreateLogPayload = z.infer<typeof createLogSchema>;

export async function getLogs(c: Context) {
  const userId = c.get("user").id;

  // Extract query parameters for filtering
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");
  const exerciseId = c.req.query("exercise_id");

  const filters = {
    startDate,
    endDate,
    exerciseId,
  };

  const logs = await logService.getAllLogsService(userId, filters);

  return c.json({
    success: true,
    data: logs,
  }, StatusCodes.OK);
}

export async function getLogsByQuery(c: Context) {
  const params = await getLogsQuerySchema.safeParseAsync(c.req.query());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const query = toCamelCase(params.data);

  const userId = c.get("user").id;
  const logs = await logService.getLogsByQueryService(query, userId);

  return c.json({
    success: true,
    data: logs,
  }, StatusCodes.OK);
}

export async function createLog(c: Context) {
  const body = await c.req.json();
  const validation = await createLogSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }


  const userId = c.get("user").id;

  // Convert workout_date string to Date if provided
  const logData = {
    ...validation.data,
    workoutDate: validation.data.workoutDate
      ? new Date(validation.data.workoutDate)
      : new Date(),
  };

  const log = await logService.createLogService(logData, userId);

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

  // Convert workout_date string to Date if provided
  const { workoutDate, ...restData } = validation.data;
  const logData = {
    ...restData,
    ...(workoutDate && { workoutDate: new Date(workoutDate) }),
  };

  const log = await logService.updateLogService(params.data.id, logData, userId);

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

