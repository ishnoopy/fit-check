import type { FilterQuery, SortOrder } from 'mongoose';
import LogModel, { type ILog } from '../models/log.model.js';
import { toCamelCase, toSnakeCase } from '../utils/transformer.js';

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
  const logs = await LogModel.find({ user_id: userId, ...toSnakeCase(query) })
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort(sort)
    .limit(options?.limit || 10)
    .lean();
  return toCamelCase(logs) as ILog[];
}
