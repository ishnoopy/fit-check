export interface Plan {
    _id: string;
    title: string;
    description?: string;
    updatedAt: string;
    workouts: Workout[];
}

export interface Workout {
    _id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    exercises: Exercise[];
}


export interface Exercise {
    _id: string;
    name: string;
    description?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface User {
    _id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    role: string;
    profileCompleted: boolean;
    age?: number;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
    weight?: number; // in kg
    height?: number; // in cm
    fitness_goal?: "lose_weight" | "gain_muscle" | "maintain" | "improve_endurance" | "general_fitness";
    activity_level?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
    createdAt?: string;
    updatedAt?: string;
}

export interface SetData {
    set_number: number;
    reps: number;
    weight: number;
    notes?: string;
}

export interface Log {
    _id: string;
    user_id: string;
    sets: SetData[];
    workout_date: string;
    duration_minutes?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Populated fields (from backend join)
    exercise_id?: Exercise;
    workout_id?: Workout;
    plan_id?: Plan;
}
