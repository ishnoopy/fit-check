import _ from 'lodash';
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
    { $project: { workout_date: 1 } },
  ]);

  const settings = await SettingRepository.findByUserId(userId);
  const restDaysBuffer = settings?.settings?.restDays ?? 0;

  const normalizeDate = (date: Date | string): Date => {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  };

  const getDaysDifference = (date1: Date, date2: Date): number => {
    return Math.floor((date1.getTime() - date2.getTime()) / (24 * 60 * 60 * 1000));
  };

  const today = normalizeDate(new Date());
  const totalLogs = logs.length;

  const workoutDates = logs.map((log) => normalizeDate(log.workout_date));
  const uniqueDatesWithWorkouts = _.sortBy(
    _.uniqBy(workoutDates, (date) => date.getTime()),
    (date) => -date.getTime()
  );

  const datesWithWorkouts = uniqueDatesWithWorkouts.map((date) => date.getTime());

  const exercisesToday = _.filter(workoutDates, (date) => date.getTime() === today.getTime()).length;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  const exercisesThisWeek = _.filter(
    workoutDates,
    (date) => date >= startOfWeek && date <= endOfWeek
  ).length;

  if (uniqueDatesWithWorkouts.length === 0) {
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

  const mostRecentWorkoutDate = _.maxBy(uniqueDatesWithWorkouts, (date) => date.getTime())!;
  const daysSinceMostRecentWorkout = getDaysDifference(today, mostRecentWorkoutDate);
  const isStreakActive = daysSinceMostRecentWorkout <= restDaysBuffer;

  let streak = 1;
  for (let i = 0; i < uniqueDatesWithWorkouts.length - 1; i++) {
    const daysDifference = getDaysDifference(
      uniqueDatesWithWorkouts[i],
      uniqueDatesWithWorkouts[i + 1]
    );
    if (daysDifference <= restDaysBuffer + 1) {
      streak += daysDifference;
    } else {
      break;
    }
  }

  if (daysSinceMostRecentWorkout <= restDaysBuffer + 1 && daysSinceMostRecentWorkout > 0) {
    streak += daysSinceMostRecentWorkout - 1;
  }

  const bufferDaysUsed = isStreakActive
    ? Math.min(daysSinceMostRecentWorkout, restDaysBuffer)
    : 0;

  return {
    totalLogs,
    exercisesToday,
    exercisesThisWeek,
    datesWithWorkouts,
    streak: isStreakActive ? streak : 0,
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
