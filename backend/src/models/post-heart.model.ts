import mongoose, { model } from "mongoose";

export interface IPostHeart {
  id?: string;
  postId: mongoose.Schema.Types.ObjectId | string;
  userId: mongoose.Schema.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPostHeartModel {
  _id?: string;
  post_id: mongoose.Schema.Types.ObjectId | string;
  user_id: mongoose.Schema.Types.ObjectId | string;
  created_at?: Date;
  updated_at?: Date;
}

const PostHeartSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    user_id: {
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

PostHeartSchema.index({ post_id: 1, user_id: 1 }, { unique: true });
PostHeartSchema.index({ post_id: 1 });
PostHeartSchema.index({ user_id: 1 });

export default model<IPostHeartModel>("PostHeart", PostHeartSchema);
