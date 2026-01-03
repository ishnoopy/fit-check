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
  // Streak continues as long as there's a workout within restDaysBuffer days
  // We track how many buffer days were consumed to maintain the streak

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
  const mostRecentWorkoutDate = uniqueDates.length > 0
    ? new Date(Math.max(...uniqueDates.map(date => new Date(date).getTime())))
    : null;

  if (!mostRecentWorkoutDate) {
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

  mostRecentWorkoutDate.setUTCHours(0, 0, 0, 0);

  // Create a Set for O(1) lookup of workout dates
  const workoutDatesSet = new Set(uniqueDates.map(date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }));

  // Check if today has a workout
  const hasWorkoutToday = workoutDatesSet.has(today.getTime());

  // Calculate days since most recent workout
  const daysSinceLastWorkout = getDaysDifference(today, mostRecentWorkoutDate);

  // Initialize streak and buffer
  let streak = 0;
  let bufferDaysUsed = 0;

  // Start counting from today, working backwards
  let currentDate = new Date(today);
  let lastWorkoutSeen: Date | null = null;

  // If today has no workout, check if we can use buffer
  if (!hasWorkoutToday) {
    if (daysSinceLastWorkout <= restDaysBuffer && daysSinceLastWorkout > 0) {
      // Use buffer to include today
      bufferDaysUsed += daysSinceLastWorkout;
      streak += daysSinceLastWorkout;
      lastWorkoutSeen = new Date(mostRecentWorkoutDate);
    } else {
      // Gap too large, streak is broken
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
  } else {
    // Today has workout
    streak = 1;
    lastWorkoutSeen = new Date(today);
  }

  // Now count backwards day by day
  currentDate.setDate(currentDate.getDate() - 1);

  while (true) {
    // Stop if we've gone too far back
    const daysBack = getDaysDifference(today, currentDate);
    if (daysBack > 365) {
      break;
    }

    const currentTimestamp = currentDate.getTime();
    const hasWorkout = workoutDatesSet.has(currentTimestamp);

    if (hasWorkout) {
      // Found a workout
      if (lastWorkoutSeen) {
        // Check gap from last workout we saw
        const gap = getDaysDifference(lastWorkoutSeen, currentDate);

        if (gap <= restDaysBuffer) {
          // Gap is within buffer - streak continues
          streak++;
          // Add buffer days used for the gap (if any days between workouts)
          if (gap > 1) {
            bufferDaysUsed += gap - 1; // gap - 1 because workout days don't count as buffer
          }
          lastWorkoutSeen = new Date(currentDate);
        } else {
          // Gap exceeds buffer - streak broken
          break;
        }
      } else {
        // First workout we're counting
        streak++;
        lastWorkoutSeen = new Date(currentDate);
      }
    } else {
      // No workout on this day
      // We'll check the gap when we find the next workout
      // For now, just continue backwards
    }

    currentDate.setDate(currentDate.getDate() - 1);

    // Stop if we've gone past the earliest workout date
    const earliestWorkoutDate = new Date(Math.min(...uniqueDates.map(date => new Date(date).getTime())));
    earliestWorkoutDate.setUTCHours(0, 0, 0, 0);
    if (currentDate < earliestWorkoutDate) {
      break;
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
