import mongoose, { model } from "mongoose";

// e.g. Bench Press, Squats, Deadlift, etc.

export interface IExercise {
    id?: string;
    userId: mongoose.Schema.Types.ObjectId | string;
    workoutId?: mongoose.Schema.Types.ObjectId | string;
    name: string;
    description?: string;
    notes?: string;
    restTime: number;
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IExerciseModel {
    user_id: mongoose.Schema.Types.ObjectId | string;
    workout_id?: mongoose.Schema.Types.ObjectId | string;
    name: string;
    description?: string;
    notes?: string;
    rest_time: number;
    active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

const ExerciseSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    notes: { type: String, required: false },
    rest_time: { type: Number, required: true, default: 120 }, // 2 minutes
    active: { type: Boolean, required: true, default: true },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

export default model<IExerciseModel>("Exercise", ExerciseSchema);

