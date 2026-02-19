import mongoose, { model } from "mongoose";

export interface IFeedback {
  id?: string;
  userId: mongoose.Schema.Types.ObjectId | string;
  category: "general" | "bug" | "feature";
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFeedbackModel {
  user_id: mongoose.Schema.Types.ObjectId | string;
  category: "general" | "bug" | "feature";
  message: string;
  created_at?: Date;
  updated_at?: Date;
}

const FeedbackSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: ["general", "bug", "feature"],
      default: "general",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

FeedbackSchema.index({ user_id: 1, created_at: -1 });

export default model<IFeedbackModel>("Feedback", FeedbackSchema);
