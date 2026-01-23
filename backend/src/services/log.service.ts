import { formatInTimeZone } from "date-fns-tz";
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
  let options: { limit?: number, skip?: number, sort?: Record<string, SortOrder> } = {};
  let customizedOptions: { llmMessage?: boolean, startDate?: Date, endDate?: Date } = {};
  let pagination: { page?: number, limit?: number } = {};

  if (query.startDate && query.endDate) {
    customizedOptions = { ...customizedOptions, startDate: new Date(query.startDate as string), endDate: new Date(query.endDate as string) };
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

  if (query.page !== undefined && query.limit !== undefined) {
    const page = query.page as number;
    const limit = query.limit as number;
    pagination = { page, limit };
    options = { ...options, limit, skip: (page - 1) * limit };
    delete query.page;
    delete query.limit;
  } else if (query.limit !== undefined) {
    const limit = query.limit as number;
    pagination = { page: 1, limit };
    options = { ...options, limit };
    delete query.limit;
  }

  if (query.llmMessage === true) {
    delete query.llmMessage;
    customizedOptions = { ...customizedOptions, llmMessage: true };
  }

  const logs = await logRepository.findByQuery(userId, query, options);

  if (customizedOptions.llmMessage === true) {
    // Format date range
    const dateRangeStr = customizedOptions.startDate && customizedOptions.endDate
      ? `${formatInTimeZone(customizedOptions.startDate, 'UTC', "yyyy-MM-dd")} to ${formatInTimeZone(customizedOptions.endDate, 'UTC', "yyyy-MM-dd")}`
      : null;

    // Transform logs to optimized format
    const logsData = logs.map((log: any) => {
      const sets = log.sets.map((set: any) =>
        `${set.setNumber}: ${set.reps}×${set.weight}kg${set.notes ? ` (${set.notes})` : ''}`
      ).join(', ');

      return {
        date: log.createdAt ? formatInTimeZone(log.createdAt, 'UTC', "yyyy-MM-dd") : null,
        plan: log.planId?.title || 'N/A',
        workout: log.workoutId?.title || 'N/A',
        exercise: log.exerciseId?.name || 'N/A',
        sets,
        notes: log.notes || null,
      };
    });

    // Calculate summary statistics
    const totalSessions = logs.length;
    const uniqueExercises = new Set(logs.map((log: any) => log.exerciseId?.name).filter(Boolean)).size;
    const totalSets = logs.reduce((sum: number, log: any) => sum + (log.sets?.length || 0), 0);
    const avgDuration = logs.reduce((sum: number, log: any) => sum + (log.durationMinutes || 0), 0) / totalSessions || 0;

    // Build optimized message
    const message = `You are a professional fitness coach analyzing workout logs. Provide:
1. **Performance Summary** - Key achievements and patterns
2. **Progress Analysis** - Strength/volume trends
3. **Recommendations** - Next workout adjustments
4. **Areas for Improvement** - Specific focus points

Use emojis to make it engaging. Keep it concise but actionable.

**Period:** ${dateRangeStr || 'All time'}
**Sessions:** ${totalSessions} | **Exercises:** ${uniqueExercises} | **Total Sets:** ${totalSets} | **Avg Duration:** ${Math.round(avgDuration)}min

**Workout Logs:**
${logsData.map((log, idx) =>
      `${idx + 1}. ${log.date || 'N/A'} - ${log.exercise} (${log.workout})\n   Sets: ${log.sets}${log.notes ? `\n   Notes: ${log.notes}` : ''}`
    ).join('\n\n')}`;

    return message;
  }

  if (pagination.page !== undefined && pagination.limit !== undefined) {
    const total = await logRepository.countByQuery(userId, query);
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      data: logs,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      },
    };
  }

  return {
    data: logs,
    pagination: null,
  };
}
export async function createLogService(payload: Omit<ILog, "userId">, userId: string) {
  return await logRepository.createLog({ ...payload, userId: userId });
}

export async function updateLogService(id: string, payload: Partial<Omit<ILog, "userId">>, userId: string) {
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

export async function getLogStatsService(userId: string) {
  return await logRepository.getLogStats(userId);
}

export async function getLatestLogsService(userId: string, exerciseIds: string[]) {
  return await logRepository.findLatestLogs(userId, exerciseIds);
}
