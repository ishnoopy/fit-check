import mongoose, { model } from "mongoose";

export interface IUser {
  _id?: string;
  first_name?: string | undefined | null;
  last_name?: string | undefined | null;
  email: string;
  password?: string;
  role: string;
  profileCompleted: boolean;
  // Fitness-related fields
  age?: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  weight?: number; // in kg
  height?: number; // in cm
  fitness_goal?: "lose_weight" | "gain_muscle" | "maintain" | "improve_endurance" | "general_fitness";
  activity_level?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
  createdAt?: Date;
  updatedAt?: Date;

  // OAuth Fields
  google_id?: string | null;
  avatar?: string | null;
  authProvider?: "local" | "google" | null;
}

const UserSchema = new mongoose.Schema({
  first_name: { type: String, default: undefined },
  last_name: { type: String, default: undefined },
  email: { type: String, required: true },
  password: { type: String, required: false },
  role: { type: String, required: true },
  profileCompleted: { type: Boolean, default: false },
  // Fitness-related fields (optional)
  age: { type: Number },
  gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
  weight: { type: Number }, // in kg
  height: { type: Number }, // in cm
  fitness_goal: {
    type: String,
    enum: ["lose_weight", "gain_muscle", "maintain", "improve_endurance", "general_fitness"]
  },
  activity_level: {
    type: String,
    enum: ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]
  },

  // OAuth Fields
  google_id: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
}, {
  timestamps: true
});

export default model<IUser>("User", UserSchema);
