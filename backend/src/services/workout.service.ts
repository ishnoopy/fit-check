import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IWorkout } from "../models/workout.model.js";
import * as workoutRepository from "../repositories/workout.repository.js";

export async function getAllWorkoutsService(userId: string, planId?: string) {
  const filter: any = { user_id: userId };

  if (planId) {
    filter.plan_id = planId;
  }

  return await workoutRepository.findAll(filter);
}

export async function getWorkoutByIdService(id: string, userId: string) {
  const workout = await workoutRepository.findById(id);

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if (workout.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return workout;
}

export async function createWorkoutService(payload: Partial<IWorkout>, userId: string) {
  const workoutData = {
    ...payload,
    user_id: userId,
    exercises: payload.exercises || [],
  };

  return await workoutRepository.createWorkout(workoutData);
}

export async function updateWorkoutService(id: string, payload: Partial<IWorkout>, userId: string) {
  const existingWorkout = await workoutRepository.findById(id);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if (existingWorkout.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return await workoutRepository.updateWorkout(id, payload);
}

export async function deleteWorkoutService(id: string, userId: string) {
  const existingWorkout = await workoutRepository.findById(id);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if (existingWorkout.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return await workoutRepository.deleteWorkout(id);
}

