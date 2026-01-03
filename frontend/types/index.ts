export interface IPlan {
    id: string;
    title: string;
    description?: string;
    updatedAt: string;
    workouts: IWorkout[];
}

export interface IWorkout {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    exercises: IExercise[];
}


export interface IExercise {
    id: string;
    name: string;
    description?: string;
    notes?: string;
    restTime?: number;
    active?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface IUser {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    password?: string;
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

export interface ISetData {
    setNumber: number;
    reps: number;
    weight: number;
    notes?: string;
}

export interface ILog {
    id: string;
    userId: string;
    sets: ISetData[];
    workoutDate: string;
    durationMinutes?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Populated fields (from backend join)
    exerciseId?: IExercise;
    workoutId?: IWorkout;
    planId?: IPlan;
}

export interface ILogStats {
    totalLogs: number;
    exercisesToday: number;
    exercisesThisWeek: number;
    datesWithWorkouts: number[];
    streak: number;
    bufferDaysUsed?: number;
    restDaysBuffer?: number;
}
