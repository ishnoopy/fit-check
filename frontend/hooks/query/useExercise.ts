import { api } from "@/lib/api";
import { IExercise, IWorkout } from "@/types";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

export const exerciseFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  notes: z.string().optional(),
  restTime: z
    .number({ message: "Rest time is required" })
    .int({ message: "Rest time must be an integer" })
    .min(0, { message: "Rest time must be 0 or greater" })
    .max(600, { message: "Rest time must be less than 600 seconds" }),
  images: z.array(z.string()).optional(),
  mechanic: z.string().min(1, { message: "Mechanic is required" }),
  equipment: z.string().min(1, { message: "Equipment is required" }),
  primaryMuscles: z.array(z.string()).optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  active: z.boolean().optional().default(true),
});

export type ExerciseFormValues = z.input<typeof exerciseFormSchema>;

type ExercisesResponse = {
  data: IExercise[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type UseGetExercisesParams = {
  search?: string;
  limit?: number;
  queryKey: string[];
};

export const useGetExercises = ({
  search = "",
  limit = 20,
  queryKey,
}: UseGetExercisesParams) => {
  return useInfiniteQuery({
    queryKey: queryKey ?? ["exercises", search, limit],
    queryFn: ({ pageParam = 1 }) =>
      api.get<ExercisesResponse>(
        `/api/exercises?search=${encodeURIComponent(search)}&page=${pageParam}&limit=${limit}`,
      ),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNextPage) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

export const useCreateExercise = ({
  workoutId,
  enableToast = true,
  addToWorkout = false,
  onSuccess,
  onError,
  queryKey,
}: {
  workoutId: string;
  planId: string;
  enableToast?: boolean;
  addToWorkout?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (values: ExerciseFormValues) => {
      const exerciseResponse = await api.post<{ data: IExercise }>(
        "/api/exercises",
        {
          workoutId: workoutId,
          ...values,
        },
      );

      if (addToWorkout) {
        const workoutResponse = await api.get<{ data: IWorkout }>(
          `/api/workouts/${workoutId}`,
        );
        const workout = workoutResponse.data as unknown as {
          title: string;
          description?: string;
          exercises: Array<{
            exercise: { id: string } | string;
            restTime: number;
            isActive: boolean;
          }>;
        };

        const updatedExercises = [
          ...(workout.exercises || []).map((ex) => ({
            exercise:
              typeof ex.exercise === "string" ? ex.exercise : ex.exercise.id,
            restTime: ex.restTime,
            isActive: ex.isActive,
          })),
          {
            exercise: exerciseResponse.data.id,
            restTime: values.restTime,
            isActive: true,
          },
        ];

        await api.patch<{ data: IWorkout }>(`/api/workouts/${workoutId}`, {
          title: workout.title,
          description: workout.description,
          exercises: updatedExercises,
        });
      }

      return exerciseResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? ["exercises", workoutId],
      });
      if (addToWorkout) {
        queryClient.invalidateQueries({
          queryKey: ["workout", workoutId],
        });
      }
      if (enableToast) {
        toast.success(
          addToWorkout
            ? "Exercise created and added to workout"
            : "Exercise created successfully",
        );
      }
      onSuccess?.();
    },
    onError: (error) => {
      if (enableToast) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create exercise",
        );
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
};

type AddExistingExerciseParams = {
  exerciseId: string;
  restTime: number;
  isActive?: boolean;
};

export const useAddExistingExercise = ({
  workoutId,
  enableToast = true,
  onSuccess,
  onError,
  queryKey,
}: {
  workoutId: string;
  planId: string;
  enableToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (params: AddExistingExerciseParams) => {
      const workoutResponse = await api.get<{ data: IExercise }>(
        `/api/workouts/${workoutId}`,
      );
      const workout = workoutResponse.data as unknown as {
        title: string;
        description?: string;
        exercises: Array<{
          exercise: { id: string } | string;
          restTime: number;
          isActive: boolean;
        }>;
      };

      const updatedExercises = [
        ...(workout.exercises || []).map((ex) => ({
          exercise:
            typeof ex.exercise === "string" ? ex.exercise : ex.exercise.id,
          restTime: ex.restTime,
          isActive: ex.isActive,
        })),
        {
          exercise: params.exerciseId,
          restTime: params.restTime,
          isActive: params.isActive ?? true,
        },
      ];

      return api.patch<{ data: IWorkout }>(`/api/workouts/${workoutId}`, {
        title: workout.title,
        description: workout.description,
        exercises: updatedExercises,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? ["workout", workoutId],
      });
      if (enableToast) {
        toast.success("Exercise added to workout");
      }
      onSuccess?.();
    },
    onError: (error) => {
      if (enableToast) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to add exercise to workout",
        );
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
};

export const useUpdateExercise = ({
  exerciseId,
  enableToast = true,
  onSuccess,
  onError,
  queryKey,
}: {
  exerciseId: string;
  enableToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: (values: ExerciseFormValues) =>
      api.patch<{ data: IExercise }>(`/api/exercises/${exerciseId}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? ["exercises", exerciseId],
      });
      if (enableToast) {
        toast.success("Exercise updated successfully");
      }
      onSuccess?.();
    },
    onError: (error) => {
      if (enableToast) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update exercise",
        );
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
};

export const useDeleteExercise = ({
  exerciseId,
  enableToast = true,
  onSuccess,
  onError,
  queryKey,
}: {
  exerciseId: string;
  enableToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      api.delete<{ data: IExercise }>(`/api/exercises/${exerciseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? ["exercises", exerciseId],
      });
      if (enableToast) {
        toast.success("Exercise deleted successfully");
      }
      onSuccess?.();
    },
    onError: (error) => {
      if (enableToast) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete exercise",
        );
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
};
