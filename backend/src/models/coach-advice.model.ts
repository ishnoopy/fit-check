import mongoose, { model } from "mongoose";

export interface ICoachAdvice {
  id?: string;
  userId: mongoose.Schema.Types.ObjectId | string;
  exerciseName: string;
  advice: string;
  context?: string;
  intent: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICoachAdviceModel {
  user_id: mongoose.Schema.Types.ObjectId | string;
  exercise_name: string;
  advice: string;
  context?: string;
  intent: string;
  created_at?: Date;
  updated_at?: Date;
}

const CoachAdviceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exercise_name: { type: String, required: true },
    advice: { type: String, required: true },
    context: { type: String, required: false },
    intent: { type: String, required: true },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Index for efficient querying
CoachAdviceSchema.index({ user_id: 1, created_at: -1 });
CoachAdviceSchema.index({ user_id: 1, exercise_name: 1, created_at: -1 });

export default model<ICoachAdviceModel>("CoachAdvice", CoachAdviceSchema);
