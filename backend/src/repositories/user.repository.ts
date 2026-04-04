import type { FilterQuery } from "mongoose";
import UserModel, { type IUser } from "../models/user.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findAll() {
  const users = await UserModel.find()
    .select("-password -refresh_token_hash -refresh_token_expires_at")
    .lean();
  return toCamelCase(users) as IUser[];
}

export async function findOne(where: FilterQuery<IUser>) {
  const query = toSnakeCase(where);
  const user = await UserModel.findOne(query).lean();
  return user ? (toCamelCase(user) as IUser) : null;
}

export async function findByIds(ids: string[]) {
  const users = await UserModel.find({ _id: { $in: ids } }).lean();
  return toCamelCase(users) as IUser[];
}

export async function searchUsersByQuery(
  query: string,
  options?: { excludeUserId?: string; limit?: number },
) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const limit = options?.limit ?? 8;
  const searchRegex = new RegExp(escapeRegex(trimmedQuery), "i");
  const users = await UserModel.find({
    ...(options?.excludeUserId ? { _id: { $ne: options.excludeUserId } } : {}),
    username: { $exists: true, $ne: null },
    $or: [
      { username: searchRegex },
      { first_name: searchRegex },
      { last_name: searchRegex },
    ],
  })
    .select("_id username first_name last_name avatar")
    .sort({ username: 1 })
    .limit(limit)
    .lean();

  return toCamelCase(users) as IUser[];
}

export async function createUser(user: IUser) {
  const payload = toSnakeCase(user);
  const doc = await UserModel.create(payload);
  return toCamelCase(doc.toObject()) as IUser;
}

export async function updateUser(id: string, user: Partial<IUser>) {
  const payload = toSnakeCase(user);
  const doc = await UserModel.findByIdAndUpdate(id, payload, {
    new: true,
    lean: true,
  }).lean();
  return doc ? (toCamelCase(doc) as IUser) : null;
}

export async function incrementSuccessfulReferralCountIfBelow(
  id: string,
  max: number,
) {
  const doc = await UserModel.findOneAndUpdate(
    {
      _id: id,
      successful_referral_count: { $lt: max },
    },
    { $inc: { successful_referral_count: 1 } },
    { new: true, lean: true },
  ).lean();
  return doc ? (toCamelCase(doc) as IUser) : null;
}

export async function markFirstWorkoutLoggedIfUnset(id: string, at: Date) {
  const doc = await UserModel.findOneAndUpdate(
    {
      _id: id,
      $or: [
        { first_workout_logged_at: { $exists: false } },
        { first_workout_logged_at: null },
      ],
    },
    { $set: { first_workout_logged_at: at } },
    { new: true, lean: true },
  ).lean();
  return doc ? (toCamelCase(doc) as IUser) : null;
}

export async function markReferralRewardGrantedIfUnset(id: string, at: Date) {
  const doc = await UserModel.findOneAndUpdate(
    {
      _id: id,
      $or: [
        { referral_reward_granted_at: { $exists: false } },
        { referral_reward_granted_at: null },
      ],
    },
    { $set: { referral_reward_granted_at: at } },
    { new: true, lean: true },
  ).lean();
  return doc ? (toCamelCase(doc) as IUser) : null;
}
