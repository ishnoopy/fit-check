import type { FilterQuery } from 'mongoose';
import LogModel, { type ILog } from '../models/log.model.js';

export async function findAll(where?: FilterQuery<ILog>) {
  return await LogModel.find(where || {})
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort({ workout_date: -1 });
}

export async function findOne(where: FilterQuery<ILog>) {
  return await LogModel.findOne(where)
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id');
}

export async function findById(id: string) {
  return await LogModel.findById(id)
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id');
}

export async function createLog(log: Partial<ILog>) {
  return await LogModel.create(log);
}

export async function updateLog(id: string, log: Partial<ILog>) {
  return await LogModel.findByIdAndUpdate(id, log, { new: true })
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id');
}

export async function deleteLog(id: string) {
  return await LogModel.findByIdAndDelete(id);
}

// Get logs by date range
export async function findByDateRange(userId: string, startDate: Date, endDate: Date) {
  return await LogModel.find({
    user_id: userId,
    workout_date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort({ workout_date: -1 });
}

// Get logs for a specific exercise
export async function findByExercise(userId: string, exerciseId: string) {
  return await LogModel.find({
    user_id: userId,
    exercise_id: exerciseId,
  })
    .populate('plan_id')
    .populate('workout_id')
    .populate('exercise_id')
    .sort({ workout_date: -1 });
}

