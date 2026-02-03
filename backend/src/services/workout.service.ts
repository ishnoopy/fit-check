import type { FilterQuery } from "mongoose";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IExercise } from "../models/exercise.model.js";
import type { IPlan } from "../models/plan.model.js";
import type { IWorkout } from "../models/workout.model.js";
import * as planRepository from "../repositories/plan.repository.js";
import * as workoutRepository from "../repositories/workout.repository.js";
import * as exerciseService from "./exercise.service.js";

export async function getAllWorkoutsService(
  userId: string,
  filters?: { planId?: string; active?: boolean },
) {
  const filter: FilterQuery<IWorkout> = { userId, ...filters };
  return await workoutRepository.findAll(filter);
}

export async function getWorkoutByIdService(id: string, userId: string) {
  const workout = await workoutRepository.findById(id);

  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if ((workout.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return workout;
}

export async function createWorkoutWithExercisesService(
  payload: Omit<IWorkout, "exercises" | "userId"> & {
    exercises: Array<Omit<IExercise, "userId">>;
  },
  userId: string,
) {
  const exercises = await exerciseService.createExercisesBulkService(
    payload.exercises.map((exercise) => ({
      name: exercise.name,
      description: exercise.description,
      notes: exercise.notes,
      restTime: exercise.restTime,
      active: true,
      images: exercise.images,
      mechanic: exercise.mechanic,
      equipment: exercise.equipment,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
    })),
    userId,
  );

  const workout = await workoutRepository.createWorkout({
    ...payload,
    userId: userId,
    exercises: [
      ...exercises.map((exercise) => {
        return { exerciseId: exercise.id as string, isActive: true };
      }),
    ],
  });

  // Then update the plan with the new workout's _id
  const plan = await planRepository.findById(payload.planId as string);
  if (!plan) {
    throw new NotFoundError("Plan not found");
  }
  const updatedWorkouts = [...plan.workouts, workout.id as string];
  await planRepository.updatePlan(
    payload.planId as string,
    {
      workouts: updatedWorkouts,
    } as IPlan,
  );

  return workout;
}

export async function createWorkoutService(
  payload: Omit<IWorkout, "userId">,
  userId: string,
) {
  // Create the workout first to get the _id
  const newWorkout = await workoutRepository.createWorkout({
    ...payload,
    userId: userId,
  });

  // Then update the plan with the new workout's _id
  if (payload.planId) {
    const plan = await planRepository.findById(payload.planId as string);
    if (plan) {
      const updatedWorkouts = [...plan.workouts, newWorkout.id as string];
      await planRepository.updatePlan(
        payload.planId as string,
        {
          workouts: updatedWorkouts,
        } as IPlan,
      );
    }
  }
  return newWorkout;
}

export async function updateWorkoutService(
  id: string,
  payload: Partial<Omit<IWorkout, "userId">>,
  userId: string,
) {
  const existingWorkout = await workoutRepository.findById(id);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if ((existingWorkout.userId as string) !== userId) {
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
  if ((existingWorkout.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return await workoutRepository.deleteWorkout(id);
}
