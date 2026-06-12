import mongoose, { model } from "mongoose";

export interface IBuddy {
  id?: string;
  userAId: mongoose.Schema.Types.ObjectId | string;
  userBId: mongoose.Schema.Types.ObjectId | string;
  establishedAt?: Date;
  endedAt?: Date | null;
  streak: {
    currentCount: number;
    longestCount: number;
    lastActiveDate: Date | null;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBuddyModel {
  _id?: string;
  user_a_id: mongoose.Schema.Types.ObjectId | string;
  user_b_id: mongoose.Schema.Types.ObjectId | string;
  established_at?: Date;
  ended_at?: Date | null;
  streak: {
    current_count: number;
    longest_count: number;
    last_active_date: Date | null;
  };
  created_at?: Date;
  updated_at?: Date;
}

const BuddySchema = new mongoose.Schema(
  {
    user_a_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user_b_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    established_at: {
      type: Date,
      default: Date.now,
    },
    ended_at: {
      type: Date,
      default: null,
    },
    streak: {
      current_count: { type: Number, default: 0 },
      longest_count: { type: Number, default: 0 },
      last_active_date: { type: Date, default: null },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

BuddySchema.index({ user_a_id: 1, user_b_id: 1 }, { unique: true });
BuddySchema.index({ user_a_id: 1, ended_at: 1 });
BuddySchema.index({ user_b_id: 1, ended_at: 1 });

export default model<IBuddyModel>("Buddy", BuddySchema);
