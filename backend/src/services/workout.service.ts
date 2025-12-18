import type { FilterQuery } from "mongoose";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IExercise } from "../models/exercise.model.js";
import type { IPlan } from "../models/plan.model.js";
import type { IWorkout } from "../models/workout.model.js";
import * as planRepository from "../repositories/plan.repository.js";
import * as workoutRepository from "../repositories/workout.repository.js";
import * as exerciseService from "./exercise.service.js";

export async function getAllWorkoutsService(userId: string, planId?: string) {
  const filter: FilterQuery<IWorkout> = { userId };

  if (planId) {
    filter.planId = planId;
  }

  return await workoutRepository.findAll(filter);
}

export async function getWorkoutByIdService(id: string, userId: string) {
  const workout = await workoutRepository.findById(id);

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if (workout.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return workout;
}

export async function createWorkoutWithExercisesService(
  payload: Omit<IWorkout, "exercises" | "userId"> & { exercises: Array<Omit<IExercise, "userId">> },
  userId: string
) {
  const workout = await workoutRepository.createWorkout({
    ...payload,
    userId: userId,
    exercises: [], // Always initialize empty since we're handling them separately
  });

  // Type guard to check if exercises are objects
  if (payload.exercises && typeof payload.exercises[0] !== 'string') {
    const exerciseObjects = payload.exercises as Array<IExercise>;
    for (const exercise of exerciseObjects) {
      await exerciseService.createExerciseService({
        ...exercise,
        workoutId: workout.id,
      }, userId);
    }

  }

  return await workoutRepository.findById(workout.id as string);
}

export async function createWorkoutService(payload: Omit<IWorkout, "userId">, userId: string) {
  // Create the workout first to get the _id
  const newWorkout = await workoutRepository.createWorkout({ ...payload, userId: userId });

  // Then update the plan with the new workout's _id
  if (payload.planId) {
    const plan = await planRepository.findById(payload.planId as string);
    if (plan) {
      const updatedWorkouts = [...plan.workouts, newWorkout.id as string];
      await planRepository.updatePlan(payload.planId as string, {
        workouts: updatedWorkouts,
      } as IPlan);
    }
  }
  return newWorkout;
}

export async function updateWorkoutService(
  id: string,
  payload: Partial<Omit<IWorkout, "userId">>,
  userId: string
) {
  const existingWorkout = await workoutRepository.findById(id);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if (existingWorkout.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  const payloadWithUserId = { ...payload, userId: userId };

  return await workoutRepository.updateWorkout(id, payloadWithUserId);
}

export async function deleteWorkoutService(id: string, userId: string) {
  const existingWorkout = await workoutRepository.findById(id);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if (existingWorkout.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return await workoutRepository.deleteWorkout(id);
}

