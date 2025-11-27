import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import type { ILog } from "../models/log.model.js";
import * as logService from "../services/log.service.js";

const setDataSchema = z.object({
  set_number: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().nonnegative(),
  notes: z.string().optional(),
});

const createLogSchema = z.object({
  plan_id: z.string().length(24, "Invalid plan ID"),
  workout_id: z.string().length(24, "Invalid workout ID"),
  exercise_id: z.string().length(24, "Invalid exercise ID"),
  sets: z.array(setDataSchema).min(1, "At least one set is required"),
  workout_date: z.string().datetime().optional(),
  duration_minutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const updateLogSchema = z.object({
  plan_id: z.string().length(24).optional(),
  workout_id: z.string().length(24).optional(),
  exercise_id: z.string().length(24).optional(),
  sets: z.array(setDataSchema).min(1).optional(),
  workout_date: z.string().datetime().optional(),
  duration_minutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().min(24).max(24),
});

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

export async function getLog(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error.errors[0].message);
  }

  const userId = c.get("user").id;
  const log = await logService.getLogByIdService(params.data.id, userId);

  return c.json({
    success: true,
    data: log,
  }, StatusCodes.OK);
}

export async function createLog(c: Context) {
  const body = await c.req.json();
  const validation = await createLogSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const userId = c.get("user").id;

  // Convert workout_date string to Date if provided
  const logData = {
    ...validation.data,
    workout_date: validation.data.workout_date
      ? new Date(validation.data.workout_date)
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
    throw new BadRequestError(params.error.errors[0].message);
  }

  const body = await c.req.json();
  const validation = await updateLogSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const userId = c.get("user").id;

  // Convert workout_date string to Date if provided
  const { workout_date, ...restData } = validation.data;
  const logData: Partial<ILog> = {
    ...restData,
    ...(workout_date && { workout_date: new Date(workout_date) }),
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
    throw new BadRequestError(params.error.errors[0].message);
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
    throw new BadRequestError(params.error.errors[0].message);
  }

  const userId = c.get("user").id;
  const history = await logService.getExerciseHistoryService(userId, params.data.id);

  return c.json({
    success: true,
    data: history,
  }, StatusCodes.OK);
}

