import mongoose, { model } from "mongoose";

// e.g. Bench Press, Squats, Deadlift, etc.

export interface IExercise {
  id?: string;
  workoutId?: mongoose.Schema.Types.ObjectId | string; // property is not saved. Used for linking to workout on creation
  userId?: mongoose.Schema.Types.ObjectId | string;
  name: string;
  description?: string;
  notes?: string;
  restTime: number;
  images: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
export interface IExerciseModel {
  user_id?: mongoose.Schema.Types.ObjectId | string;
  name: string;
  description?: string;
  notes?: string;
  rest_time: number;
  images: string[];
  created_at?: Date;
  updated_at?: Date;
}

const ExerciseSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    name: { type: String, required: true },
    description: { type: String, required: false },
    notes: { type: String, required: false },
    rest_time: { type: Number, required: true, default: 120 }, // 2 minutes
    images: { type: [String], required: true, default: [] },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export default model<IExerciseModel>("Exercise", ExerciseSchema);
