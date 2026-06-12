import mongoose, { model } from "mongoose";

export interface IBuddyNudge {
  id?: string;
  buddyId: mongoose.Schema.Types.ObjectId | string;
  senderId: mongoose.Schema.Types.ObjectId | string;
  nudgeDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBuddyNudgeModel {
  _id?: string;
  buddy_id: mongoose.Schema.Types.ObjectId | string;
  sender_id: mongoose.Schema.Types.ObjectId | string;
  nudge_date: Date;
  created_at?: Date;
  updated_at?: Date;
}

const BuddyNudgeSchema = new mongoose.Schema(
  {
    buddy_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buddy",
      required: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nudge_date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// One nudge per user per buddy per day
BuddyNudgeSchema.index(
  { buddy_id: 1, sender_id: 1, nudge_date: 1 },
  { unique: true },
);
BuddyNudgeSchema.index({ buddy_id: 1, nudge_date: 1 });

export default model<IBuddyNudgeModel>("BuddyNudge", BuddyNudgeSchema);
