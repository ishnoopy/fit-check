import mongoose from "mongoose";
import BuddyModel, { type IBuddy, type IBuddyModel } from "../models/buddy.model.js";

function toCamelCase(doc: IBuddyModel): IBuddy {
  return {
    id: doc._id?.toString(),
    userAId: doc.user_a_id.toString(),
    userBId: doc.user_b_id.toString(),
    establishedAt: doc.established_at,
    endedAt: doc.ended_at,
    streak: {
      currentCount: doc.streak.current_count,
      longestCount: doc.streak.longest_count,
      lastActiveDate: doc.streak.last_active_date,
    },
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export async function createBuddy(
  userAId: string,
  userBId: string,
): Promise<IBuddy> {
  // Canonical ordering: lower string ID first
  const [aId, bId] = [userAId, userBId].sort();
  const doc = await BuddyModel.create({
    user_a_id: new mongoose.Types.ObjectId(aId),
    user_b_id: new mongoose.Types.ObjectId(bId),
    established_at: new Date(),
    streak: { current_count: 0, longest_count: 0, last_active_date: null },
  });
  return toCamelCase(doc.toObject() as IBuddyModel);
}

export async function findActiveBuddyByUserIds(
  userAId: string,
  userBId: string,
): Promise<IBuddy | null> {
  const [aId, bId] = [userAId, userBId].sort();
  const doc = await BuddyModel.findOne({
    user_a_id: new mongoose.Types.ObjectId(aId),
    user_b_id: new mongoose.Types.ObjectId(bId),
    ended_at: null,
  }).lean();
  return doc ? toCamelCase(doc as unknown as IBuddyModel) : null;
}

export async function findBuddyById(id: string): Promise<IBuddy | null> {
  const doc = await BuddyModel.findById(id).lean();
  return doc ? toCamelCase(doc as unknown as IBuddyModel) : null;
}

export async function findActiveBuddiesByUserId(
  userId: string,
): Promise<IBuddy[]> {
  const objectId = new mongoose.Types.ObjectId(userId);
  const docs = await BuddyModel.find({
    $or: [{ user_a_id: objectId }, { user_b_id: objectId }],
    ended_at: null,
  })
    .sort({ updated_at: -1 })
    .lean();
  return docs.map((doc) => toCamelCase(doc as unknown as IBuddyModel));
}

export async function endBuddy(id: string): Promise<IBuddy | null> {
  const doc = await BuddyModel.findByIdAndUpdate(
    id,
    { $set: { ended_at: new Date() } },
    { new: true, lean: true },
  );
  return doc ? toCamelCase(doc as unknown as IBuddyModel) : null;
}

export async function endBuddiesByUserIds(
  userAId: string,
  userBId: string,
): Promise<void> {
  const [aId, bId] = [userAId, userBId].sort();
  await BuddyModel.updateMany(
    {
      user_a_id: new mongoose.Types.ObjectId(aId),
      user_b_id: new mongoose.Types.ObjectId(bId),
      ended_at: null,
    },
    { $set: { ended_at: new Date() } },
  );
}

export async function updateBuddyStreak(
  id: string,
  streak: { currentCount: number; longestCount: number; lastActiveDate: Date },
): Promise<IBuddy | null> {
  const doc = await BuddyModel.findByIdAndUpdate(
    id,
    {
      $set: {
        "streak.current_count": streak.currentCount,
        "streak.longest_count": streak.longestCount,
        "streak.last_active_date": streak.lastActiveDate,
      },
    },
    { new: true, lean: true },
  );
  return doc ? toCamelCase(doc as unknown as IBuddyModel) : null;
}
