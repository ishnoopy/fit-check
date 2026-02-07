import type { FilterQuery, SortOrder } from "mongoose";
import ExerciseModel, { type IExercise } from "../models/exercise.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

export async function findAll(where: FilterQuery<IExercise> = {}) {
  const query = toSnakeCase(where);
  const exercises = await ExerciseModel.find(query).lean();
  return toCamelCase(exercises) as IExercise[];
}

export async function findByQuery(
  where: FilterQuery<IExercise> = {},
  options?: { limit?: number; skip?: number; sort?: Record<string, SortOrder> },
) {
  const query = toSnakeCase(where);
  const sort = toSnakeCase(options?.sort || { name: 1 });
  const queryBuilder = ExerciseModel.find(query).sort(sort);

  if (options?.skip !== undefined) {
    queryBuilder.skip(options.skip);
  }

  if (options?.limit !== undefined) {
    queryBuilder.limit(options.limit);
  }

  const exercises = await queryBuilder.lean();
  return toCamelCase(exercises) as IExercise[];
}

export async function countByQuery(where: FilterQuery<IExercise> = {}) {
  const query = toSnakeCase(where);
  return await ExerciseModel.countDocuments(query);
}

export async function findOne(where: FilterQuery<IExercise> = {}) {
  const query = toSnakeCase(where);
  const exercise = await ExerciseModel.findOne(query).lean();
  return exercise ? (toCamelCase(exercise) as IExercise) : null;
}

export async function findById(id: string) {
  const exercise = await ExerciseModel.findById(id).lean();
  return exercise ? (toCamelCase(exercise) as IExercise) : null;
}

export async function createExercise(exercise: IExercise) {
  const payload = toSnakeCase(exercise);
  const doc = await ExerciseModel.create(payload);
  return toCamelCase(doc.toObject()) as IExercise;
}

export async function createExercises(exercises: IExercise[]) {
  const payloads = exercises.map((exercise) => toSnakeCase(exercise));
  const docs = await ExerciseModel.insertMany(payloads);
  return docs.map((doc) => toCamelCase(doc.toObject()) as IExercise);
}

export async function updateExercise(id: string, exercise: Partial<IExercise>) {
  const payload = toSnakeCase(exercise);
  const doc = await ExerciseModel.findByIdAndUpdate(id, payload, {
    new: true,
    lean: true,
  }).lean();
  return doc ? (toCamelCase(doc) as IExercise) : null;
}

export async function deleteExercise(id: string) {
  const doc = await ExerciseModel.findByIdAndDelete(id).lean();
  return doc ? (toCamelCase(doc) as IExercise) : null;
}
