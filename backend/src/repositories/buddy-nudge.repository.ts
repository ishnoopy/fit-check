import mongoose from "mongoose";
import BuddyNudgeModel, {
  type IBuddyNudge,
  type IBuddyNudgeModel,
} from "../models/buddy-nudge.model.js";

function toCamelCase(doc: IBuddyNudgeModel): IBuddyNudge {
  return {
    id: doc._id?.toString(),
    buddyId: doc.buddy_id.toString(),
    senderId: doc.sender_id.toString(),
    nudgeDate: doc.nudge_date,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export async function createNudge(
  buddyId: string,
  senderId: string,
  nudgeDate: Date,
): Promise<IBuddyNudge> {
  const doc = await BuddyNudgeModel.create({
    buddy_id: new mongoose.Types.ObjectId(buddyId),
    sender_id: new mongoose.Types.ObjectId(senderId),
    nudge_date: nudgeDate,
  });
  return toCamelCase(doc.toObject() as IBuddyNudgeModel);
}

export async function findNudge(
  buddyId: string,
  senderId: string,
  nudgeDate: Date,
): Promise<IBuddyNudge | null> {
  const doc = await BuddyNudgeModel.findOne({
    buddy_id: new mongoose.Types.ObjectId(buddyId),
    sender_id: new mongoose.Types.ObjectId(senderId),
    nudge_date: nudgeDate,
  }).lean();
  return doc ? toCamelCase(doc as unknown as IBuddyNudgeModel) : null;
}

export async function findNudgesByBuddyAndDate(
  buddyId: string,
  nudgeDate: Date,
): Promise<IBuddyNudge[]> {
  const docs = await BuddyNudgeModel.find({
    buddy_id: new mongoose.Types.ObjectId(buddyId),
    nudge_date: nudgeDate,
  }).lean();
  return docs.map((doc) => toCamelCase(doc as unknown as IBuddyNudgeModel));
}

export async function findNudgeDatesByBuddy(
  buddyId: string,
): Promise<Date[]> {
  const docs = await BuddyNudgeModel.find({
    buddy_id: new mongoose.Types.ObjectId(buddyId),
  })
    .select({ nudge_date: 1 })
    .sort({ nudge_date: -1 })
    .lean();

  return docs.map((doc) => doc.nudge_date);
}

export async function findNudgeDatesByBuddyAndUser(
  buddyId: string,
  userId: string,
): Promise<Date[]> {
  const docs = await BuddyNudgeModel.find({
    buddy_id: new mongoose.Types.ObjectId(buddyId),
    sender_id: new mongoose.Types.ObjectId(userId),
  })
    .select({ nudge_date: 1 })
    .sort({ nudge_date: -1 })
    .lean();

  return docs.map((doc) => doc.nudge_date);
}
