import mongoose, { model } from "mongoose";

export interface IPlan {
    id?: string;
    userId: mongoose.Schema.Types.ObjectId | string;
    title: string;
    description?: string;
    workouts: Array<mongoose.Schema.Types.ObjectId | string>; // e.g . Gym Workout Plan: Push Day, Pull Day, Leg Day, etc.
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPlanModel {
    user_id: mongoose.Schema.Types.ObjectId | string;
    title: string;
    description?: string;
    workouts: Array<mongoose.Schema.Types.ObjectId | string>; // e.g . Gym Workout Plan: Push Day, Pull Day, Leg Day, etc.
    created_at?: Date;
    updated_at?: Date;
}

const PlanSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: false },
    workouts: { type: [mongoose.Schema.Types.ObjectId], ref: "Workout", required: true },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

export default model<IPlanModel>("Plan", PlanSchema);
