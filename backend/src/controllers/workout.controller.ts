import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import * as workoutService from "../services/workout.service.js";
import { createExerciseSchema } from "./exercise.controller.js";

const createWorkoutWithExercisesSchema = z.object({
  planId: z.string().length(24, "Invalid plan ID"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  exercises: z
    .array(createExerciseSchema)
    .min(1, "At least one exercise is required"),
});

const createWorkoutSchema = z.object({
  planId: z.string().length(24, "Invalid plan ID"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  exercises: z
    .array(
      z.object({
        exercise: z.string().length(24, "Invalid exercise ID"),
        restTime: z.number().int().positive(),
        isActive: z.boolean().default(true),
        order: z.number().int().positive().optional(),
      }),
    )
    .default([]),
});

const updateWorkoutSchema = z.object({
  planId: z.string().length(24).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  exercises: z
    .array(
      z.object({
        exercise: z.string().length(24, "Invalid exercise ID"),
        restTime: z.number().int().positive(),
        isActive: z.boolean().default(true),
        order: z.number().int().positive().nullable().optional(),
      }),
    )
    .optional(),
});

const reorderWorkoutExercisesSchema = z.object({
  exerciseIds: z
    .array(z.string().length(24, "Invalid exercise ID"))
    .min(1, "At least one exercise ID is required"),
});

const idParamSchema = z.object({
  id: z.string().min(24).max(24),
});

const getWorkoutsQuerySchema = z.object({
  plan_id: z.string().min(24).max(24).optional(),
  active: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

export async function getWorkouts(c: Context) {
  const userId = c.get("user").id;
  const query = await getWorkoutsQuerySchema.safeParseAsync(c.req.query());

  if (!query.success) {
    throw new BadRequestError(query.error);
  }

  const workouts = await workoutService.getAllWorkoutsService(
    userId,
    query.data,
  );

  return c.json(
    {
      success: true,
      data: workouts,
    },
    StatusCodes.OK,
  );
}

export async function getWorkout(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const workout = await workoutService.getWorkoutByIdService(
    params.data.id,
    userId,
  );
  return c.json(
    {
      success: true,
      data: workout,
    },
    StatusCodes.OK,
  );
}

export async function createWorkout(c: Context) {
  const body = await c.req.json();
  const validation = await createWorkoutSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const userId = c.get("user").id;
  const workout = await workoutService.createWorkoutService(
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: workout,
    },
    StatusCodes.CREATED,
  );
}

export async function createWorkoutWithExercises(c: Context) {
  const body = await c.req.json();
  const validation =
    await createWorkoutWithExercisesSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const workout = await workoutService.createWorkoutWithExercisesService(
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: workout,
    },
    StatusCodes.CREATED,
  );
}

export async function updateWorkout(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const body = await c.req.json();
  const validation = await updateWorkoutSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const workout = await workoutService.updateWorkoutService(
    params.data.id,
    validation.data,
    userId,
  );

  return c.json(
    {
      success: true,
      data: workout,
    },
    StatusCodes.OK,
  );
}

export async function deleteWorkout(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  await workoutService.deleteWorkoutService(params.data.id, userId);

  return c.json(
    {
      success: true,
      message: "Workout deleted successfully",
    },
    StatusCodes.OK,
  );
}

export async function reorderWorkoutExercises(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const body = await c.req.json();
  const validation = await reorderWorkoutExercisesSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const workout = await workoutService.reorderWorkoutExercisesService(
    params.data.id,
    validation.data.exerciseIds,
    userId,
  );

  return c.json(
    {
      success: true,
      data: workout,
    },
    StatusCodes.OK,
  );
}
