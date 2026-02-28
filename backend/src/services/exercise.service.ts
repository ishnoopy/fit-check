import type { IExercise } from "../models/exercise.model.js";
import * as exerciseRepository from "../repositories/exercise.repository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

export async function getAllExercisesService(
  userId: string,
  options?: { page?: number; limit?: number; search?: string },
) {
  const baseQuery = {
    $or: [{ userId: userId }, { userId: { $exists: false } }],
  };

  const query =
    options?.search && options.search.trim().length > 0
      ? {
        $and: [
          baseQuery,
          { name: { $regex: options.search.trim(), $options: "i" } },
        ],
      }
      : baseQuery;

  if (options?.page !== undefined && options?.limit !== undefined) {
    const limit = options.limit;
    const page = options.page;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      exerciseRepository.findByQuery(query, {
        limit,
        skip,
        sort: { name: 1 },
      }),
      exerciseRepository.countByQuery(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  const data = await exerciseRepository.findByQuery(query, { sort: { name: 1 } });

  return { data };
}

export async function getExerciseByIdService(id: string, userId: string) {
  const exercise = await exerciseRepository.findById(id);

  if (!exercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Verify ownership
  if (exercise.userId && (exercise.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  return exercise;
}

export async function createExerciseService(
  payload: Omit<IExercise, "userId">,
  userId: string,
) {
  const exercise = await exerciseRepository.createExercise({
    ...payload,
    userId: userId,
  });

  return exercise;
}

export async function createExercisesBulkService(
  payloads: Array<Omit<IExercise, "userId">>,
  userId: string,
) {
  const exercises = await exerciseRepository.createExercises(
    payloads.map((payload) => ({
      ...payload,
      userId: userId,
    })),
  );

  return exercises;
}

export async function updateExerciseService(
  id: string,
  payload: Partial<Omit<IExercise, "userId">>,
  userId: string,
) {
  const existingExercise = await exerciseRepository.findById(id);

  if (!existingExercise) {
    throw new NotFoundError("Exercise not found");
  }

  // Do not allow updating of exercises without userId
  if (!existingExercise.userId) {
    throw new BadRequestError("Cannot update public exercise");
  }

  // Verify ownership
  if ((existingExercise.userId as string) !== userId) {
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

  // Do not allow deleting of exercises without userId
  if (!existingExercise.userId) {
    throw new BadRequestError("Cannot delete public exercise");
  }

  // Verify ownership
  if ((existingExercise.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to exercise");
  }

  return await exerciseRepository.deleteExercise(id);
}
