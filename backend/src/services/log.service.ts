import type { SortOrder } from "mongoose";
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

  return await logRepository.findAll({ userId: userId });
}

export async function getLogByIdService(id: string, userId: string) {
  const log = await logRepository.findById(id);

  if (!log) {
    throw new NotFoundError("Log not found");
  }

  // Verify ownership
  if (log.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to log");
  }

  return log;
}

export async function getLogsByQueryService(query: Record<string, unknown>, userId: string) {
  let options: { limit?: number, sort?: Record<string, SortOrder> } = {};
  if (query.startDate && query.endDate) {
    query = {
      ...query, createdAt: {
        $gte: new Date(query.startDate as string),
        $lte: new Date(query.endDate as string),
      }
    };

    delete query.startDate;
    delete query.endDate;
  }

  if (query.sortBy && query.sortOrder) {
    options = { ...options, sort: { [query.sortBy as string]: query.sortOrder as SortOrder } };
    delete query.sortBy;
    delete query.sortOrder;
  }

  if (query.latest === true) {
    delete query.latest;
    options = { ...options, limit: 1, sort: { createdAt: -1 } };
  }
  return await logRepository.findByQuery(userId, query, options);
}

export async function createLogService(payload: Omit<ILog, "userId">, userId: string) {
  return await logRepository.createLog({ ...payload, userId: userId });
}

export async function updateLogService(id: string, payload: Partial<Omit<ILog, "userId">>, userId: string) {
  console.log("a")
  const existingLog = await logRepository.findById(id);

  if (!existingLog) {
    throw new NotFoundError("Log not found");
  }

  // Verify ownership
  if (existingLog.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to log");
  }

  return await logRepository.updateLog(id, payload);
}

export async function deleteLogService(id: string, userId: string) {
  const existingLog = await logRepository.findById(id);

  if (!existingLog) {
    throw new NotFoundError("Log not found");
  }

  // Verify ownership
  if (existingLog.userId as string !== userId) {
    throw new BadRequestError("Unauthorized access to log");
  }

  return await logRepository.deleteLog(id);
}

// Get exercise history/progress
export async function getExerciseHistoryService(userId: string, exerciseId: string) {
  return await logRepository.findByExercise(userId, exerciseId);
}

