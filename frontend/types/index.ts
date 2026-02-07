export interface IPlan {
  id: string;
  userId: string;
  title: string;
  description?: string;
  updatedAt: string;
  workouts: IWorkout[];
}

export interface IWorkout {
  id: string;
  userId: string;
  planId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  exercises: [
    {
      exercise: IExercise;
      restTime: number;
      isActive: boolean;
    },
  ];
}

export interface IExercise {
  id: string;
  userId?: string | null;
  name: string;
  description?: string;
  notes?: string;
  active?: boolean;
  mechanic?: string;
  equipment?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  images?: string[];
  restTime?: number;
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
  fitnessGoal?:
    | "lose_weight"
    | "gain_muscle"
    | "maintain"
    | "improve_endurance"
    | "general_fitness";
  activityLevel?:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extremely_active";
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
  datesWithWorkouts: string[];
  streak: number;
  bufferDaysUsed?: number;
  restDaysBuffer?: number;
}
