import mongoose, { model } from "mongoose";

// e.g. Bench Press, Squats, Deadlift, etc.

export interface IExercise {
    id?: string;
    userId: mongoose.Schema.Types.ObjectId | string;
    workoutId?: mongoose.Schema.Types.ObjectId | string;
    name: string;
    description?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IExerciseModel {
    user_id: mongoose.Schema.Types.ObjectId | string;
    workout_id?: mongoose.Schema.Types.ObjectId | string;
    name: string;
    description?: string;
    notes?: string;
    created_at?: Date;
    updated_at?: Date;
}

const ExerciseSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    notes: { type: String, required: false },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

export default model<IExerciseModel>("Exercise", ExerciseSchema);

