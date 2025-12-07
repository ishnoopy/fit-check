import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IExercise } from "../models/exercise.model.js";
import * as exerciseRepository from "../repositories/exercise.repository.js";
import * as workoutRepository from "../repositories/workout.repository.js";

export async function getAllExercisesService(userId: string) {
  return await exerciseRepository.findAll({ user_id: userId });
}

export async function getExerciseByIdService(id: string, userId: string) {
  const exercise = await exerciseRepository.findById(id);

  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Verify ownership
  if (exercise.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  return exercise;
}

export async function createExerciseService(payload: Partial<IExercise>, userId: string) {
  const exerciseData = {
    ...payload,
    user_id: userId,
  };

  const exercise = await exerciseRepository.createExercise(exerciseData);

  if (payload.workout_id) {
    const workout = await workoutRepository.findById(String(payload.workout_id));
    if (!workout) {
      throw new NotFoundError("Workout not found");
    }
    workout.exercises.push(exercise._id.toString());
    await workoutRepository.updateWorkout(String(payload.workout_id), {
      exercises: workout.exercises,
    });
  }
  return exercise;
}

export async function updateExerciseService(id: string, payload: Partial<IExercise>, userId: string) {
  const existingExercise = await exerciseRepository.findById(id);

  if (!existingExercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Verify ownership
  if (existingExercise.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  return await exerciseRepository.updateExercise(id, payload);
}

export async function deleteExerciseService(id: string, userId: string) {
  const existingExercise = await exerciseRepository.findById(id);

  if (!existingExercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Verify ownership
  if (existingExercise.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  return await exerciseRepository.deleteExercise(id);
}

