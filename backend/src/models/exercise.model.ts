import mongoose, { model } from "mongoose";

// e.g. Bench Press, Squats, Deadlift, etc.
export interface IExercise {
    user_id: mongoose.Schema.Types.ObjectId | string;
    name: string;
    description?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const ExerciseSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    notes: { type: String, required: false },
}, { timestamps: true });

export default model<IExercise>("Exercise", ExerciseSchema);

