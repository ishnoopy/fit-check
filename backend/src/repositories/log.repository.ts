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

  // Helper to get days difference
  const getDaysDifference = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setUTCHours(0, 0, 0, 0);
    d2.setUTCHours(0, 0, 0, 0);
    return Math.abs(Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Get unique workout dates sorted descending (most recent first)
  const uniqueDates = Array.from(
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

  // Calculate streak with rest days buffer
  // Logic:
  // 1. Get all unique dates with workouts
  // 2. Get the most recent workout date. If gap between today and most recent workout > restDaysBuffer, streak is over
  // 3. Arrange workout dates in chronological order (oldest to newest)
  // 4. If gap between 2 consecutive dates > restDaysBuffer, exclude those earlier dates from the set

  // If no workouts, return early
  if (uniqueDates.length === 0) {
    return {
      totalLogs,
      exercisesToday,
      exercisesThisWeek,
      datesWithWorkouts,
      streak: 0,
      bufferDaysUsed: 0,
      restDaysBuffer,
    };
  }

  // Get the most recent workout date
  const mostRecentWorkoutDate = new Date(Math.max(...uniqueDates.map(date => new Date(date).getTime())));
  mostRecentWorkoutDate.setUTCHours(0, 0, 0, 0);

  // Check if gap between today and most recent workout is greater than restDaysBuffer
  const daysSinceLastWorkout = getDaysDifference(today, mostRecentWorkoutDate);
  if (daysSinceLastWorkout > restDaysBuffer) {
    // Streak is broken
    return {
      totalLogs,
      exercisesToday,
      exercisesThisWeek,
      datesWithWorkouts,
      streak: 0,
      bufferDaysUsed: 0,
      restDaysBuffer,
    };
  }

  // Arrange workout dates in chronological order (oldest to newest)
  const sortedDates = uniqueDates
    .map(date => {
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    })
    .sort((a, b) => a.getTime() - b.getTime());

  // Filter out dates where gap between consecutive dates > restDaysBuffer
  // Start from the most recent date and work backwards
  const validStreakDates: Date[] = [];

  // Start with the most recent date
  validStreakDates.push(new Date(sortedDates[sortedDates.length - 1]));

  // Work backwards through sorted dates
  for (let i = sortedDates.length - 2; i >= 0; i--) {
    const currentDate = sortedDates[i];
    const previousValidDate = validStreakDates[0]; // Most recent valid date

    const gap = getDaysDifference(previousValidDate, currentDate);

    if (gap <= restDaysBuffer) {
      // Gap is within buffer - include this date in streak
      validStreakDates.unshift(new Date(currentDate));
    } else {
      // Gap exceeds buffer - exclude this and all earlier dates
      break;
    }
  }

  // Calculate streak including restDaysBuffer
  // Streak = number of consecutive days from oldest valid workout to most recent (or today if within buffer)
  const oldestValidDate = validStreakDates[0];
  const mostRecentValidDate = validStreakDates[validStreakDates.length - 1];

  // Check if today has a workout
  const hasWorkoutToday = validStreakDates.some(date => isSameDate(date, today));

  // Determine the end date for streak calculation
  let streakEndDate: Date;
  if (hasWorkoutToday) {
    streakEndDate = new Date(today);
  } else {
    // If today has no workout, check if we can include today using buffer
    const gapToToday = getDaysDifference(today, mostRecentValidDate);
    if (gapToToday <= restDaysBuffer) {
      streakEndDate = new Date(today);
    } else {
      streakEndDate = new Date(mostRecentValidDate);
    }
  }

  // Calculate streak as total days from oldest to end date (inclusive)
  const streak = getDaysDifference(streakEndDate, oldestValidDate) + 1;

  // Calculate buffer days used (sum of gaps between consecutive dates)
  let bufferDaysUsed = 0;
  for (let i = 1; i < validStreakDates.length; i++) {
    const gap = getDaysDifference(validStreakDates[i], validStreakDates[i - 1]);
    if (gap > 1) {
      // gap - 1 because workout days don't count as buffer
      bufferDaysUsed += gap - 1;
    }
  }

  // Also account for gap from most recent workout to today (if today has no workout)
  if (!hasWorkoutToday && streak > 0) {
    const gapToToday = getDaysDifference(today, mostRecentValidDate);
    if (gapToToday > 0 && gapToToday <= restDaysBuffer) {
      bufferDaysUsed += gapToToday;
    }
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
