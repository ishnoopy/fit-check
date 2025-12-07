import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IExercise } from "../models/exercise.model.js";
import type { IWorkout } from "../models/workout.model.js";
import * as planRepository from "../repositories/plan.repository.js";
import * as workoutRepository from "../repositories/workout.repository.js";
import * as exerciseService from "./exercise.service.js";

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

export async function createWorkoutWithExercisesService(
  payload: Omit<Partial<IWorkout>, "exercises"> & {
    exercises: Array<Partial<IExercise>>;
  },
  userId: string
) {
  const workout = await workoutRepository.createWorkout({
    ...payload,
    user_id: userId,
    exercises: [], // Always initialize empty since we're handling them separately
  });

  // Type guard to check if exercises are objects
  if (payload.exercises && typeof payload.exercises[0] !== 'string') {
    const exerciseObjects = payload.exercises as Array<Partial<IExercise>>;
    for (const exercise of exerciseObjects) {
      await exerciseService.createExerciseService({
        ...exercise,
        workout_id: workout._id.toString(),
      }, userId);
    }

  }

  return await workoutRepository.findById(workout._id.toString());
}

export async function createWorkoutService(payload: Partial<IWorkout>, userId: string) {
  const workoutData = {
    ...payload,
    user_id: userId,
    exercises: payload.exercises || [],
  };

  // Create the workout first to get the _id
  const newWorkout = await workoutRepository.createWorkout(workoutData);

  // Then update the plan with the new workout's _id
  if (payload.plan_id) {
    const plan = await planRepository.findById(String(payload.plan_id));
    if (plan) {
      const updatedWorkouts = [...plan.workouts, newWorkout._id.toString()];
      await planRepository.updatePlan(String(payload.plan_id), {
        workouts: updatedWorkouts,
      });
    }
  }

  return newWorkout;
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

