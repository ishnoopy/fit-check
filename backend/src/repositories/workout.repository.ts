import type { FilterQuery } from 'mongoose';
import WorkoutModel, { type IWorkout } from '../models/workout.model.js';

export async function findAll(where?: FilterQuery<IWorkout>) {
  return await WorkoutModel.find(where || {}).populate('exercises').lean();
}

export async function findOne(where: FilterQuery<IWorkout>) {
  return await WorkoutModel.findOne(where).populate('exercises').lean();
}

export async function findById(id: string) {
  return await WorkoutModel.findById(id).populate('exercises').lean();
}

export async function createWorkout(workout: Partial<IWorkout>) {
  return await WorkoutModel.create(workout);
}

export async function updateWorkout(id: string, workout: Partial<IWorkout>) {
  return await WorkoutModel.findByIdAndUpdate(id, workout, { new: true }).populate('exercises').lean();
}

export async function deleteWorkout(id: string) {
  return await WorkoutModel.findByIdAndDelete(id).lean();
}

