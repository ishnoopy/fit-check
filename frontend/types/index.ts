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
  rateOfPerceivedExertion?: number; // RPE: 6-10 (6=Easy, 7=Moderate, 8=Hard, 9=Very Hard, 10=Max)
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

// Coach types

export const COACH_INTENT = {
  NEXT_WORKOUT: "NEXT_WORKOUT",
  SESSION_FEEDBACK: "SESSION_FEEDBACK",
  PROGRESS_CHECK: "PROGRESS_CHECK",
  DIFFICULTY_ANALYSIS: "DIFFICULTY_ANALYSIS",
  TIPS: "TIPS",
  GENERAL_COACHING: "GENERAL_COACHING",
} as const;

export type CoachIntent = (typeof COACH_INTENT)[keyof typeof COACH_INTENT];

export type ChatRole = "user" | "coach";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  intent?: CoachIntent;
  isStreaming?: boolean;
  createdAt?: string;
}

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface QuickPrompt {
  text: string;
  intent: CoachIntent;
}

export interface IConversation {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  messages: IConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface IConversationMessage {
  role: ChatRole;
  content: string;
  intent?: CoachIntent;
  createdAt?: string;
}

export interface IConversationListItem {
  id: string;
  title: string;
  summary?: string;
  updatedAt: string;
}
