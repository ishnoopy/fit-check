import mongoose, { model } from "mongoose";

// e.g. Push Day, Pull Day, Leg Day, etc.
export interface IWorkout {
    user_id: mongoose.Schema.Types.ObjectId | string;
    plan_id: mongoose.Schema.Types.ObjectId | string;
    title: string;
    description?: string;
    exercises: Array<mongoose.Schema.Types.ObjectId | string>; // References to Exercise model
    createdAt?: Date;
    updatedAt?: Date;
}

const WorkoutSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan_id: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    title: { type: String, required: true },
    description: { type: String, required: false },
    exercises: { type: [mongoose.Schema.Types.ObjectId], ref: "Exercise", required: true },
}, { timestamps: true });

export default model<IWorkout>("Workout", WorkoutSchema);
