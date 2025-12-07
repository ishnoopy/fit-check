import mongoose, { model } from "mongoose";

export interface IUser {
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
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
}

const UserSchema = new mongoose.Schema({
  first_name: { type: String },
  last_name: { type: String },
  email: { type: String, required: true },
  password: { type: String, required: true },
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
}, {
  timestamps: true
});

export default model<IUser>("User", UserSchema);
