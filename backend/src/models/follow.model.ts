import mongoose, { model } from "mongoose";

export interface IFollow {
  id?: string;
  followerId: mongoose.Schema.Types.ObjectId | string;
  followeeId: mongoose.Schema.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFollowModel {
  _id?: string;
  follower_id: mongoose.Schema.Types.ObjectId | string;
  followee_id: mongoose.Schema.Types.ObjectId | string;
  created_at?: Date;
  updated_at?: Date;
}

const FollowSchema = new mongoose.Schema(
  {
    follower_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    followee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

FollowSchema.index({ follower_id: 1, followee_id: 1 }, { unique: true });
FollowSchema.index({ followee_id: 1 });
FollowSchema.index({ follower_id: 1 });

export default model<IFollowModel>("Follow", FollowSchema);
