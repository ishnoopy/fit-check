import mongoose, { model } from "mongoose";

// e.g. Push Day, Pull Day, Leg Day, etc.
export interface IWorkout {
  id?: string;
  userId: mongoose.Schema.Types.ObjectId | string;
  planId: mongoose.Schema.Types.ObjectId | string;
  title: string;
  description?: string;
  exercises: Array<{
    exerciseId: mongoose.Schema.Types.ObjectId | string;
    isActive: boolean;
  }>;
  updatedAt?: Date;
}

// Interface for the workout model
export interface IWorkoutModel {
  _id?: string;
  user_id: mongoose.Schema.Types.ObjectId | string;
  plan_id: mongoose.Schema.Types.ObjectId | string;
  title: string;
  description?: string;
  exercises: Array<{
    exercise_id: mongoose.Schema.Types.ObjectId | string;
    is_active: boolean;
  }>;
}

const WorkoutSchema = new mongoose.Schema(
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
    title: { type: String, required: true },
    description: { type: String, required: false },
    exercises: Array<{
      exercise_id: { type: mongoose.Schema.Types.ObjectId; ref: "Exercise" };
      is_active: { type: Boolean; default: true };
    }>,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export default model<IWorkoutModel>("Workout", WorkoutSchema);
