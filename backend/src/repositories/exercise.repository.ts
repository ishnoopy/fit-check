import type { FilterQuery, SortOrder } from "mongoose";
import mongoose from "mongoose";
import ExerciseModel, { type IExercise } from "../models/exercise.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

function trustExerciseQueryOperators(query: Record<string, unknown>) {
  const trustedQuery: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    if ((key === "$or" || key === "$and") && Array.isArray(value)) {
      trustedQuery[key] = value.map((entry) =>
        entry && typeof entry === "object"
          ? trustExerciseQueryOperators(entry as Record<string, unknown>)
          : entry,
      );
      continue;
    }

    if (
      key === "user_id" &&
      value &&
      typeof value === "object" &&
      "$exists" in value
    ) {
      trustedQuery[key] = mongoose.trusted(value);
      continue;
    }

    if (
      key === "name" &&
      value &&
      typeof value === "object" &&
      "$regex" in value
    ) {
      trustedQuery[key] = mongoose.trusted(value);
      continue;
    }

    trustedQuery[key] = value;
  }

  return trustedQuery;
}

export async function findAll(where: FilterQuery<IExercise> = {}) {
  const query = toSnakeCase(where);
  const exercises = await ExerciseModel.find(query).lean();
  return toCamelCase(exercises) as IExercise[];
}

export async function findByQuery(
  where: FilterQuery<IExercise> = {},
  options?: { limit?: number; skip?: number; sort?: Record<string, SortOrder> },
) {
  const query = trustExerciseQueryOperators(toSnakeCase(where));
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
  const query = trustExerciseQueryOperators(toSnakeCase(where));
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
