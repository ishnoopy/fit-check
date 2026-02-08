import { api } from "@/lib/api";
import { IWorkout } from "@/types";
import {
  MutationFunction,
  QueryFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

// export const addWorkoutWithExercisesFormSchema = z.object({
//   title: z.string().min(1, { message: "Title is required" }),
//   description: z.string().optional(),
//   exercises: z
//     .array(
//       z.object({
//         name: z.string().min(1, { message: "Name is required" }),
//         description: z.string().optional(),
//         notes: z.string().optional(),
//         restTime: z
//           .number()
//           .int()
//           .positive()
//           .max(600, { message: "Rest time must be less than 600 seconds" }),
//         images: z.array(z.unknown()).optional(),
//         mechanic: z.string().min(1, { message: "Mechanic is required" }),
//         equipment: z.string().min(1, { message: "Equipment is required" }),
//         primaryMuscles: z.array(z.string()).default([]),
//         secondaryMuscles: z.array(z.string()).default([]),
//       }),
//     )
//     .min(1, { message: "At least one exercise is required" }),
// });

export const addWorkoutFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  exercises: z
    .array(
      z.object({
        exercise: z.string().min(1, { message: "Exercise ID is required" }),
        restTime: z
          .number()
          .int()
          .positive()
          .max(600, { message: "Rest time must be less than 600 seconds" }),
        isActive: z.boolean().default(true),
      }),
    )
    .min(1, { message: "At least one exercise is required" }),
});

export const editWorkoutFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  exercises: z
    .array(
      z.object({
        exercise: z.string().length(24, "Invalid exercise ID"),
        restTime: z
          .number()
          .int()
          .positive()
          .max(600, { message: "Rest time must be less than 600 seconds" }),
        isActive: z.boolean().default(true),
      }),
    )
    .optional(),
});

// export type AddWorkoutWithExercisesFormValues = z.input<typeof addWorkoutWithExercisesFormSchema>;
export type AddWorkoutFormValues = z.input<typeof addWorkoutFormSchema>;
export type EditWorkoutFormValues = z.input<typeof editWorkoutFormSchema>;

export const useGetAllWorkouts = ({
  planId,
  queryKey,
}: {
  planId: string;
  queryKey: string[];
}) => {
  const getAllWorkouts: QueryFunction<{ data: IWorkout[] }> = () => {
    return api.get<{ data: IWorkout[] }>(`/api/workouts?plan_id=${planId}`);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey ?? ["workouts", planId],
    queryFn: getAllWorkouts,
    enabled: !!planId,
  });

  return { data: data?.data, isLoading, error: error as Error };
};

export const useGetWorkout = ({
  id,
  queryKey,
}: {
  id: string;
  queryKey: string[];
}) => {
  const getWorkout: QueryFunction<{ data: IWorkout }> = () => {
    return api.get<{ data: IWorkout }>(`/api/workouts/${id}`);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey ?? ["workout", id],
    queryFn: getWorkout,
    enabled: !!id,
  })


  return { data: data?.data, isLoading, error: error as Error };
};

export const useGetWorkouts = ({
  planId,
  queryKey,
}: {
  planId: string;
  queryKey: string[];
}) => {
  const getWorkouts: QueryFunction<{ data: IWorkout[] }> = () => {
    return api.get<{ data: IWorkout[] }>(`/api/workouts?plan_id=${planId}`);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey ?? ["workouts", planId],
    queryFn: getWorkouts,
    enabled: !!planId,
  });

  return { data: data?.data, isLoading, error: error as Error };
};

//* NOTE: Will be used once we integrate custom exercise creation.
// export const useCreateWorkout = ({
//   planId,
//   enableToast = true,
//   onSuccess,
//   onError,
// }: {
//   planId: string;
//   enableToast?: boolean;
//   onSuccess?: () => void;
//   onError?: (error: Error) => void;
// }) => {
//   const queryClient = useQueryClient();
//   const createWorkout: MutationFunction<{ data: IWorkout }, AddWorkoutFormValues> = (values) => {
//     return api.post<{ data: IWorkout }>(`/api/workouts/with-exercises`, {
//       ...values,
//       planId: planId,
//     });
//   };

//   const { mutate, isPending, error } = useMutation({
//     mutationFn: createWorkout,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["workouts", planId] });
//       if (enableToast) {
//         toast.success("Workout created successfully");
//       }
//       onSuccess?.();
//     },
//     onError: (error: Error) => {
//       if (enableToast) {
//         toast.error(error instanceof Error ? error.message : "Failed to create workout");
//       }
//       onError?.(error);
//     },
//   });

//   return { mutate, isPending, error: error };
// }

export const useCreateWorkout = ({
  planId,
  enableToast = true,
  onSuccess,
  onError,
  queryKey,
}: {
  planId: string;
  enableToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const createWorkout: MutationFunction<
    { data: IWorkout },
    AddWorkoutFormValues
  > = (values) => {
    return api.post<{ data: IWorkout }>(`/api/workouts`, {
      ...values,
      planId: planId,
    });
  };

  const { mutate, isPending, error } = useMutation({
    mutationFn: createWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? ["workouts", planId],
      });
      if (enableToast) {
        toast.success("Workout created successfully");
      }
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (enableToast) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create workout",
        );
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
};

export const useUpdateWorkout = ({
  workoutId,
  enableToast = true,
  onSuccess,
  onError,
  queryKey,
}: {
  workoutId: string;
  enableToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const updateWorkout: MutationFunction<
    { data: IWorkout },
    EditWorkoutFormValues
  > = (values) => {
    return api.patch<{ data: IWorkout }>(`/api/workouts/${workoutId}`, {
      ...values,
    });
  };

  const { mutate, isPending, error } = useMutation({
    mutationFn: updateWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? ["workout", workoutId],
      });
      if (enableToast) {
        toast.success("Workout updated successfully");
      }
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (enableToast) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update workout",
        );
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
};

export const useDeleteWorkout = ({
  workoutId,
  enableToast = true,
  onSuccess,
  onError,
  queryKey,
}: {
  workoutId: string;
  enableToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const deleteWorkout: MutationFunction<void, string> = (workoutId) => {
    return api.delete(`/api/workouts/${workoutId}`);
  };

  const { mutate, isPending, error } = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey ?? ["workout", workoutId],
      });
      if (enableToast) {
        toast.success("Workout deleted successfully");
      }
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (enableToast) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete workout",
        );
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
};
