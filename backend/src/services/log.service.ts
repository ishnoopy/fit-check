import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { ILog } from "../models/log.model.js";
import * as logRepository from "../repositories/log.repository.js";

export async function getAllLogsService(userId: string, filters?: {
  startDate?: string;
  endDate?: string;
  exerciseId?: string;
}) {
  if (filters?.startDate && filters?.endDate) {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestError("Invalid date format");
    }

    return await logRepository.findByDateRange(userId, startDate, endDate);
  }

  if (filters?.exerciseId) {
    return await logRepository.findByExercise(userId, filters.exerciseId);
  }

  return await logRepository.findAll({ user_id: userId });
}

export async function getLogByIdService(id: string, userId: string) {
  const log = await logRepository.findById(id);

  if (!log) {
    throw new NotFoundError("Log not found");
  }

  // Verify ownership
  if (log.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to log");
  }

  return log;
}

export async function createLogService(payload: Partial<ILog>, userId: string) {
  // Validate sets array
  if (!payload.sets || payload.sets.length === 0) {
    throw new BadRequestError("At least one set is required");
  }

  const logData = {
    ...payload,
    user_id: userId,
    workout_date: payload.workout_date || new Date(),
  };

  return await logRepository.createLog(logData);
}

export async function updateLogService(id: string, payload: Partial<ILog>, userId: string) {
  const existingLog = await logRepository.findById(id);

  if (!existingLog) {
    throw new NotFoundError("Log not found");
  }

  // Verify ownership
  if (existingLog.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to log");
  }

  // Validate sets array if provided
  if (payload.sets && payload.sets.length === 0) {
    throw new BadRequestError("At least one set is required");
  }

  return await logRepository.updateLog(id, payload);
}

export async function deleteLogService(id: string, userId: string) {
  const existingLog = await logRepository.findById(id);

  if (!existingLog) {
    throw new NotFoundError("Log not found");
  }

  // Verify ownership
  if (existingLog.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to log");
  }

  return await logRepository.deleteLog(id);
}

// Get exercise history/progress
export async function getExerciseHistoryService(userId: string, exerciseId: string) {
  return await logRepository.findByExercise(userId, exerciseId);
}

