import mongoose, { model } from "mongoose";

// Interface for the user object
export interface IUser {
  id?: string;
  firstName?: string | undefined | null;
  lastName?: string | undefined | null;
  email: string;
  password?: string;
  role: string;
  profileCompleted: boolean;
  // Fitness-related fields
  age?: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  weight?: number;
  height?: number;
  fitnessGoal?:
    | "strength"
    | "hypertrophy"
    | "fat_loss"
    | "endurance"
    | "general_fitness";
  activityLevel?:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extremely_active";
  createdAt?: Date;
  updatedAt?: Date;
  // OAuth Fields
  googleId?: string | null;
  avatar?: string | null;
  authProvider?: "local" | "google" | null;

  // Refresh Token Fields
  refreshTokenHash?: string | null;
  refreshTokenExpiresAt?: Date | null;

  // personalized fields
  isPioneer?: boolean;
  hasGymAccess?: boolean;
  selfMotivationNote?: string;
  onboardingPromiseAccepted?: boolean;
}

// Interface for the user model
export interface IUserModel {
  _id?: string;
  first_name?: string | undefined | null;
  last_name?: string | undefined | null;
  email: string;
  password?: string;
  role: string;
  profile_completed: boolean;
  // Fitness-related fields
  age?: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  weight?: number; // in kg
  height?: number; // in cm
  fitness_goal?:
    | "strength"
    | "hypertrophy"
    | "fat_loss"
    | "endurance"
    | "general_fitness";
  activity_level?:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extremely_active";
  created_at?: Date;
  updated_at?: Date;

  // OAuth Fields
  google_id?: string | null;
  avatar?: string | null;
  auth_provider?: "local" | "google" | null;

  // Refresh Token Fields
  refresh_token_hash?: string | null;
  refresh_token_expires_at?: Date | null;

  // personalized fields
  is_pioneer?: boolean;
  has_gym_access?: boolean;
  self_motivation_note?: string;
  onboarding_promise_accepted?: boolean;
}

const UserSchema = new mongoose.Schema(
  {
    first_name: { type: String, default: undefined },
    last_name: { type: String, default: undefined },
    email: { type: String, required: true },
    password: { type: String, required: false },
    role: { type: String, required: true },
    profile_completed: { type: Boolean, default: false },
    // Fitness-related fields (optional)
    age: { type: Number },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    weight: { type: Number }, // in kg
    height: { type: Number }, // in cm
    fitness_goal: {
      type: String,
      enum: [
        "strength",
        "hypertrophy",
        "fat_loss",
        "endurance",
        "general_fitness",
      ],
    },
    activity_level: {
      type: String,
      enum: [
        "sedentary",
        "lightly_active",
        "moderately_active",
        "very_active",
        "extremely_active",
      ],
    },
    // OAuth Fields
    google_id: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    auth_provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // Refresh Token Fields
    refresh_token_hash: { type: String, required: false },
    refresh_token_expires_at: { type: Date, required: false },

    // personalized fields
    is_pioneer: { type: Boolean, default: false },
    has_gym_access: { type: Boolean },
    self_motivation_note: { type: String, maxlength: 280 },
    onboarding_promise_accepted: { type: Boolean, default: false },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export default model<IUserModel>("User", UserSchema);
