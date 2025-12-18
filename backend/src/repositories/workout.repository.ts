import type { FilterQuery } from 'mongoose';
import WorkoutModel, { type IWorkout } from '../models/workout.model.js';
import { toCamelCase, toSnakeCase } from '../utils/transformer.js';

export async function findAll(where: FilterQuery<IWorkout> = {}) {
  const query = toSnakeCase(where);
  const workouts = await WorkoutModel.find(query).populate('exercises').lean();
  return toCamelCase(workouts) as IWorkout[];
}

export async function findOne(where: FilterQuery<IWorkout> = {}) {
  const query = toSnakeCase(where);
  const workout = await WorkoutModel.findOne(query).populate('exercises').lean();
  return workout ? toCamelCase(workout) as IWorkout : null;
}

export async function findById(id: string) {
  const workout = await WorkoutModel.findById(id).populate('exercises').lean();
  return workout ? toCamelCase(workout) as IWorkout : null;
}

export async function createWorkout(workout: IWorkout) {
  const payload = toSnakeCase(workout);
  const doc = await WorkoutModel.create(payload);
  return toCamelCase(doc.toObject()) as IWorkout;
}

export async function updateWorkout(id: string, workout: Partial<IWorkout>) {
  const payload = toSnakeCase(workout);
  const doc = await WorkoutModel.findByIdAndUpdate(id, payload, { new: true, lean: true }).lean()
  return doc ? toCamelCase(doc) as IWorkout : null;
}

export async function deleteWorkout(id: string) {
  const doc = await WorkoutModel.findByIdAndDelete(id).lean();
  return doc ? toCamelCase(doc) as IWorkout : null;
}

