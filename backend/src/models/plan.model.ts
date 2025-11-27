import mongoose, { model } from "mongoose";

// e.g. Gym Workout Plan, Home Workout Plan, etc.
export interface IPlan {
    user_id: mongoose.Schema.Types.ObjectId | string;
    title: string;
    description?: string;
    workouts: Array<mongoose.Schema.Types.ObjectId | string>; // e.g . Gym Workout Plan: Push Day, Pull Day, Leg Day, etc.
    createdAt?: Date;
    updatedAt?: Date;
}

const PlanSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: false },
    workouts: { type: [mongoose.Schema.Types.ObjectId], ref: "Workout", required: true },
}, { timestamps: true });

export default model<IPlan>("Plan", PlanSchema);
