import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import * as exerciseService from "../services/exercise.service.js";

const createExerciseSchema = z.object({
  workoutId: z.string().min(24).max(24).optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  restTime: z.number().int().positive(),
});

const updateExerciseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  restTime: z.number().int().positive().optional(),
});

const idParamSchema = z.object({
  id: z.string().min(24).max(24),
});

export async function getExercises(c: Context) {
  const userId = c.get("user").id;

  const exercises = await exerciseService.getAllExercisesService(userId);

  return c.json(
    {
      success: true,
      data: exercises,
    },
    StatusCodes.OK,
  );
}

export async function getExercise(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const exercise = await exerciseService.getExerciseByIdService(
    params.data.id,
    userId,
  );

  return c.json(
    {
      success: true,
      data: exercise,
    },
    StatusCodes.OK,
  );
}

export async function createExercise(c: Context) {
  const body = await c.req.json();
  const validation = await createExerciseSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const exercise = await exerciseService.createExerciseService(
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: exercise,
    },
    StatusCodes.CREATED,
  );
}

export async function updateExercise(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const body = await c.req.json();
  const validation = await updateExerciseSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const exercise = await exerciseService.updateExerciseService(
    params.data.id,
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: exercise,
    },
    StatusCodes.OK,
  );
}

export async function deleteExercise(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  await exerciseService.deleteExerciseService(params.data.id, userId);

  return c.json(
    {
      success: true,
      message: "Exercise deleted successfully",
    },
    StatusCodes.OK,
  );
}
