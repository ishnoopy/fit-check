import type { FilterQuery } from 'mongoose';
import ExerciseModel, { type IExercise } from '../models/exercise.model.js';

export async function findAll(where?: FilterQuery<IExercise>) {
  return await ExerciseModel.find(where || {});
}

export async function findOne(where: FilterQuery<IExercise>) {
  return await ExerciseModel.findOne(where);
}

export async function findById(id: string) {
  return await ExerciseModel.findById(id);
}

export async function createExercise(exercise: Partial<IExercise>) {
  return await ExerciseModel.create(exercise);
}

export async function updateExercise(id: string, exercise: Partial<IExercise>) {
  return await ExerciseModel.findByIdAndUpdate(id, exercise, { new: true });
}

export async function deleteExercise(id: string) {
  return await ExerciseModel.findByIdAndDelete(id);
}

