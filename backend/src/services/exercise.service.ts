import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IExercise } from "../models/exercise.model.js";
import * as exerciseRepository from "../repositories/exercise.repository.js";
import * as workoutRepository from "../repositories/workout.repository.js";

export async function getAllExercisesService(userId: string) {
  return await exerciseRepository.findAll({ userId });
}

export async function getExerciseByIdService(id: string, userId: string) {
  const exercise = await exerciseRepository.findById(id);

  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Verify ownership
  if (exercise.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  return exercise;
}

export async function createExerciseService(payload: Omit<IExercise, "userId">, userId: string) {
  const exercise = await exerciseRepository.createExercise({ ...payload, userId: userId });

  if (payload.workoutId) {
    const workout = await workoutRepository.findById(payload.workoutId as string);
    if (!workout) {
      throw new NotFoundError("Workout not found");
    }
    workout.exercises.push(exercise.id as string);
    await workoutRepository.updateWorkout(payload.workoutId as string, {
      ...workout,
      exercises: workout.exercises,
    });
  }
  return exercise;
}

export async function updateExerciseService(id: string, payload: Partial<Omit<IExercise, "userId">>, userId: string) {
  const existingExercise = await exerciseRepository.findById(id);

  if (!existingExercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Verify ownership
  if (existingExercise.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  const payloadWithUserId = { ...payload, userId: userId };

  return await exerciseRepository.updateExercise(id, payloadWithUserId);
}

export async function deleteExerciseService(id: string, userId: string) {
  const existingExercise = await exerciseRepository.findById(id);

  if (!existingExercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Verify ownership
  if (existingExercise.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  return await exerciseRepository.deleteExercise(id);
}

