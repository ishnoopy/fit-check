import mongoose, { model } from "mongoose";

// e.g. Bench Press, Squats, Deadlift, etc.

export interface IExercise {
  id?: string;
  userId?: mongoose.Schema.Types.ObjectId | string;
  name: string;
  description?: string;
  notes?: string;
  restTime: number;
  images: string[];
  mechanic: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
export interface IExerciseModel {
  user_id?: mongoose.Schema.Types.ObjectId | string;
  name: string;
  description?: string;
  notes?: string;
  images: string[];
  mechanic: string;
  equipment: string;
  primary_muscles: string[];
  secondary_muscles: string[];
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
    images: { type: [String], required: true, default: [] },
    mechanic: { type: String, required: true },
    equipment: { type: String, required: true },
    primary_muscles: { type: [String], required: true, default: [] },
    secondary_muscles: { type: [String], required: true, default: [] },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export default model<IExerciseModel>("Exercise", ExerciseSchema);
