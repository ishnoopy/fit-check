import mongoose, { model } from "mongoose";

export interface ISetData {
  setNumber: number;
  reps: number;
  weight: number;
  notes?: string;
}
export interface ILog {
  id?: string;
  userId: mongoose.Schema.Types.ObjectId | string;
  planId: mongoose.Schema.Types.ObjectId | string;
  workoutId: mongoose.Schema.Types.ObjectId | string;
  exerciseId: mongoose.Schema.Types.ObjectId | string;
  sets: Array<ISetData>; // Array of set data
  durationMinutes?: number; // Optional: how long the exercise took
  notes?: string; // General notes about the exercise performance
  createdAt?: Date;
  updatedAt?: Date;
}

// Individual set data
export interface ISetDataModel {
  set_number: number;
  reps: number;
  weight: number; // Weight in kg
  notes?: string;
}

// Tracks actual workout session data
export interface ILogModel {
  user_id: mongoose.Schema.Types.ObjectId | string;
  plan_id: mongoose.Schema.Types.ObjectId | string;
  workout_id: mongoose.Schema.Types.ObjectId | string;
  exercise_id: mongoose.Schema.Types.ObjectId | string;
  sets: Array<ISetDataModel>; // Array of set data
  duration_minutes?: number; // Optional: how long the exercise took
  notes?: string; // General notes about the exercise performance
  created_at?: Date;
  updated_at?: Date;
}

const SetDataSchema = new mongoose.Schema(
  {
    set_number: { type: Number, required: true },
    reps: { type: Number, required: true },
    weight: { type: Number, required: true },
    notes: { type: String, required: false },
  },
  { _id: false },
); // _id: false to prevent creating _id for subdocuments

const LogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    workout_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workout",
      required: true,
    },
    exercise_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    sets: { type: [SetDataSchema], required: true },
    duration_minutes: { type: Number, required: false },
    notes: { type: String, required: false },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Index for efficient querying
LogSchema.index({ user_id: 1, created_at: -1 });
LogSchema.index({ user_id: 1, exercise_id: 1, created_at: -1 });

export default model<ILogModel>("Log", LogSchema);
