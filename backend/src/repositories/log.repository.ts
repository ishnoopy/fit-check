import type { FilterQuery, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import LogModel, { type ILog } from '../models/log.model.js';
import { toCamelCase, toSnakeCase } from '../utils/transformer.js';
import * as SettingRepository from './setting.repository.js';

export async function findAll(where: FilterQuery<ILog> = {}) {
  const query = toSnakeCase(where);
  const logs = await LogModel.find(query)
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort({ workout_date: -1 })
    .lean();
  return toCamelCase(logs) as ILog[];
}

export async function findOne(where: FilterQuery<ILog> = {}) {
  const query = toSnakeCase(where);
  const log = await LogModel.findOne(query)
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .lean();
  return log ? toCamelCase(log) as ILog : null;
}

export async function findById(id: string) {
  const log = await LogModel.findById(id)
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .lean();
  return log ? toCamelCase(log) as ILog : null;
}

export async function createLog(log: Partial<ILog>) {
  const payload = toSnakeCase(log);
  const doc = await LogModel.create(payload)
  return toCamelCase(doc.toObject()) as ILog;
}

export async function updateLog(id: string, log: Partial<ILog>) {
  const payload = toSnakeCase(log);
  const doc = await LogModel.findByIdAndUpdate(id, payload, { new: true, lean: true }).lean()
  return doc ? toCamelCase(doc) as ILog : null;
}

export async function deleteLog(id: string) {
  const doc = await LogModel.findByIdAndDelete(id).lean();
  return doc ? toCamelCase(doc) as ILog : null;
}

// Get logs by date range
export async function findByDateRange(userId: string, startDate: Date, endDate: Date) {
  const logs = await LogModel.find({
    user_id: userId,
    workout_date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort({ workout_date: -1 })
    .lean();
  return toCamelCase(logs) as ILog[];
}

// Get logs for a specific exercise
export async function findByExercise(userId: string, exerciseId: string) {
  const logs = await LogModel.find({
    user_id: userId,
    exercise_id: exerciseId,
  })
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort({ workout_date: -1 })
    .lean();
  return toCamelCase(logs) as ILog[];
}

export async function findByQuery(userId: string, query: Record<string, unknown>, options?: { limit?: number, sort?: Record<string, SortOrder> }) {
  const sort = toSnakeCase(options?.sort || { createdAt: -1 });
  const snakeQuery = toSnakeCase(query);
  const logs = await LogModel.find({ user_id: userId, ...snakeQuery })
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort(sort)
    .limit(options?.limit ?? Number.MAX_SAFE_INTEGER)
    .lean();
  return toCamelCase(logs) as ILog[];
}

export async function getLogStats(userId: string) {
  const logs = await LogModel.aggregate([
    { $match: { user_id: new Types.ObjectId(userId) } },
    { $sort: { workout_date: -1 } },
    {
      $project: {
        workout_date: 1,
      },
    },
  ]);

  // Get user settings for rest days buffer
  const settings = await SettingRepository.findByUserId(userId);
  const restDaysBuffer = settings?.settings?.restDays ?? 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Helper to compare dates (only year, month, day)
  const isSameDate = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setUTCHours(0, 0, 0, 0);
    d2.setUTCHours(0, 0, 0, 0);
    return d1.getTime() === d2.getTime();
  };


  // Get unique workout dates sorted descending (most recent first)
  const uniqueDatesWithWorkouts = Array.from(
    new Set(
      logs.map((log) => {
        const date = new Date(log.workout_date);
        date.setUTCHours(0, 0, 0, 0);
        return date.getTime();
      })
    )
  )
    .map((timestamp) => new Date(timestamp))
    .sort((a, b) => b.getTime() - a.getTime()); // Sort descending

  const totalLogs = logs.length;

  // Count exercises today
  const exercisesToday = logs.filter((log) => {
    const logDate = new Date(log.workout_date);
    logDate.setUTCHours(0, 0, 0, 0);
    return isSameDate(logDate, today);
  }).length;

  // Count exercises this week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  const exercisesThisWeek = logs.filter((log) => {
    const logDate = new Date(log.workout_date);
    return logDate >= startOfWeek && logDate <= endOfWeek;
  }).length;

  const datesWithWorkouts = Array.from(
    new Set(
      logs.map((log) => {
        const logDate = new Date(log.workout_date);
        logDate.setUTCHours(0, 0, 0, 0);
        return logDate.getTime();
      })
    )
  );


  // If no workouts, return early
  if (uniqueDatesWithWorkouts.length === 0) {
    return {
      totalLogs,
      exercisesToday,
      exercisesThisWeek,
      datesWithWorkouts,
      streak: 0,
      bufferDaysUsed: 0,
      restDaysBuffer: restDaysBuffer,
    };
  }

  let streak = 1;
  const currentDate = new Date();
  currentDate.setUTCHours(0, 0, 0, 0);

  const mostRecentWorkoutDate = new Date(Math.max(...uniqueDatesWithWorkouts.map(date => new Date(date).getTime())));
  const DAYS_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
  const daysSinceMostRecentWorkout = Math.floor((currentDate.getTime() - mostRecentWorkoutDate.getTime()) / DAYS_IN_MILLISECONDS);

  const isStreakActive = daysSinceMostRecentWorkout <= restDaysBuffer + 1 && daysSinceMostRecentWorkout > 0;

  // compare x index with x + 1 index to see if the difference is less than or equal to the rest days buffer
  for (let i = 0; i < uniqueDatesWithWorkouts.length - 1; i++) {
    const currentDate = uniqueDatesWithWorkouts[i].getTime();
    const previousDate = uniqueDatesWithWorkouts[i + 1].getTime();
    const daysDifference = Math.floor((currentDate - previousDate) / DAYS_IN_MILLISECONDS);

    if (daysDifference <= restDaysBuffer + 1) {
      streak += daysDifference;
    } else {
      break;
    }
  }


  // Rest days buffer - handle gap between today and most recent workout
  if (daysSinceMostRecentWorkout <= restDaysBuffer + 1 && daysSinceMostRecentWorkout > 0) {
    // The most recent workout is already counted in the streak above
    // This adds the buffer days between today and the most recent workout
    streak += daysSinceMostRecentWorkout - 1;
  }

  let bufferDaysUsed = restDaysBuffer - (restDaysBuffer - daysSinceMostRecentWorkout + 1);

  if (!isStreakActive) {
    streak = 0;
    bufferDaysUsed = 0;
  }

  return {
    totalLogs,
    exercisesToday,
    exercisesThisWeek,
    datesWithWorkouts,
    streak,
    bufferDaysUsed,
    restDaysBuffer,
  };
}


export async function findLatestLogs(userId: string, exerciseIds: string[]) {
  const objectIdExerciseIds = exerciseIds.map(id => new Types.ObjectId(id));

  const logs = await LogModel.aggregate([
    {
      $match: {
        user_id: new Types.ObjectId(userId),
        exercise_id: { $in: objectIdExerciseIds }
      }
    },
    {
      $sort: { workout_date: -1 }
    },
    {
      $group: {
        _id: '$exercise_id',
        latestLog: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestLog' }
    }
  ]);

  const populatedLogs = await LogModel.populate(logs, [
    { path: 'plan_id' },
    { path: 'workout_id' },
    { path: 'exercise_id' }
  ]);

  // Convert Mongoose documents to plain objects
  const leanLogs = populatedLogs.map(doc => {
    if (doc && typeof doc.toObject === 'function') {
      return doc.toObject({ flattenMaps: true });
    }
    // If it's already a plain object, use JSON parse/stringify to deep clone and remove any hidden properties
    return JSON.parse(JSON.stringify(doc));
  });

  return toCamelCase(leanLogs) as ILog[];
}
