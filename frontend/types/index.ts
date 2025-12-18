export interface Plan {
    id: string;
    title: string;
    description?: string;
    updatedAt: string;
    workouts: Workout[];
}

export interface Workout {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    exercises: Exercise[];
}


export interface Exercise {
    id: string;
    name: string;
    description?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    profileCompleted: boolean;
    age?: number;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
    weight?: number; // in kg
    height?: number; // in cm
    fitnessGoal?: "lose_weight" | "gain_muscle" | "maintain" | "improve_endurance" | "general_fitness";
    activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
    createdAt?: string;
    updatedAt?: string;
}

export interface SetData {
    setNumber: number;
    reps: number;
    weight: number;
    notes?: string;
}

export interface Log {
    id: string;
    userId: string;
    sets: SetData[];
    workoutDate: string;
    durationMinutes?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Populated fields (from backend join)
    exerciseId?: Exercise;
    workoutId?: Workout;
    planId?: Plan;
}
