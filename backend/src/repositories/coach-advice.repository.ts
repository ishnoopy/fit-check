import CoachAdviceModel, {
  type ICoachAdvice,
} from "../models/coach-advice.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

/**
 * Create a new coach advice entry
 */
export async function createAdvice(
  userId: string,
  exerciseName: string,
  advice: string,
  intent: string,
  context?: string,
): Promise<ICoachAdvice> {
  const payload = toSnakeCase({
    userId,
    exerciseName,
    advice,
    context,
    intent,
  });
  const doc = await CoachAdviceModel.create(payload);
  return toCamelCase(doc.toObject()) as ICoachAdvice;
}

/**
 * Fetch recent advice for a user (last N days)
 */
export async function findRecentByUserId(
  userId: string,
  days: number,
  limit?: number,
): Promise<ICoachAdvice[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const query = CoachAdviceModel.find({
    user_id: userId,
    created_at: { $gte: cutoffDate },
  })
    .sort({ created_at: -1 });
  
  if (limit) query.limit(limit);
  
  const docs = await query.lean();
  return toCamelCase(docs) as ICoachAdvice[];
}

/**
 * Fetch recent advice for a specific exercise
 */
export async function findRecentByExercise(
  userId: string,
  exerciseName: string,
  days: number,
  limit?: number,
): Promise<ICoachAdvice[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const query = CoachAdviceModel.find({
    user_id: userId,
    exercise_name: exerciseName,
    created_at: { $gte: cutoffDate },
  })
    .sort({ created_at: -1 });
  
  if (limit) query.limit(limit);
  
  const docs = await query.lean();
  return toCamelCase(docs) as ICoachAdvice[];
}

/**
 * Delete advice older than a specific date
 */
export async function deleteOldAdvice(
  userId: string,
  beforeDate: Date,
): Promise<number> {
  const result = await CoachAdviceModel.deleteMany({
    user_id: userId,
    created_at: { $lt: beforeDate },
  });
  return result.deletedCount || 0;
}
