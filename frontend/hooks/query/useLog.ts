import { api } from "@/lib/api";
import { ILog } from "@/types";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

interface Setting {
  id?: string;
  userId: string;
  settings: {
    restDays?: number;
    timezone?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CreateLogPayload {
  planId: string;
  workoutId: string;
  exerciseId: string;
  sets: Array<{
    setNumber: number;
    reps: number;
    weight: number;
    notes?: string;
  }>;
  durationMinutes?: number;
  notes?: string;
}

interface GetTodayLogsParams {
  activePlanId: string;
  activeWorkoutId: string;
  startOfDay: Date;
  endOfDay: Date;
}

interface GetLatestLogsParams {
  exerciseIds: string[];
}

/**
 * Fetches user settings.
 */
const getSettings = () => api.get<{ data: Setting }>("/api/settings");

/**
 * Hook to fetch user settings.
 */
export const useGetSettings = (
  options?: Omit<
    UseQueryOptions<{ data: Setting }, Error, Setting>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    retry: false,
    select: (data) => data.data,
    ...options,
  });
};

/**
 * Fetches today's logs for a specific plan and workout.
 */
const getTodayLogs = async ({
  activePlanId,
  activeWorkoutId,
  startOfDay,
  endOfDay,
}: GetTodayLogsParams) => {
  return api.get<{ data: ILog[] }>(
    `/api/logs?plan_id=${activePlanId}&workout_id=${activeWorkoutId}&start_date=${startOfDay.toISOString()}&end_date=${endOfDay.toISOString()}`,
  );
};

/**
 * Hook to fetch today's logs.
 */
export const useGetTodayLogs = (
  params: GetTodayLogsParams,
  options?: Omit<
    UseQueryOptions<{ data: ILog[] }, Error, ILog[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["todayLogs", params.activePlanId, params.activeWorkoutId],
    queryFn: () => getTodayLogs(params),
    enabled: !!params.activePlanId && !!params.activeWorkoutId,
    select: (data) => data.data,
    ...options,
  });
};

/**
 * Fetches latest logs for specific exercises.
 */
const getLatestLogs = async ({ exerciseIds }: GetLatestLogsParams) => {
  return api.get<{ data: ILog[] }>(
    `/api/logs/latest?${exerciseIds
      .map((id) => `exercise_ids=${id}`)
      .join("&")}`,
  );
};

/**
 * Hook to fetch latest logs for exercises.
 */
export const useGetLatestLogs = (
  params: GetLatestLogsParams,
  options?: Omit<
    UseQueryOptions<{ data: ILog[] }, Error, ILog[]>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: ["latestLogs", params.exerciseIds],
    queryFn: () => getLatestLogs(params),
    enabled: params.exerciseIds.length > 0,
    select: (data) => data.data,
    ...options,
  });
};

/**
 * Fetches exercise history.
 */
export const getExerciseHistory = async (exerciseId: string) => {
  return api.get<{ data: ILog[] }>(`/api/logs/exercise/${exerciseId}/history`);
};

/**
 * Creates a new log entry.
 */
const createLog = async (values: CreateLogPayload) => {
  return api.post("/api/logs", values);
};

/**
 * Hook to create a log entry.
 */
export const useCreateLog = (
  options?: Omit<
    UseMutationOptions<unknown, Error, CreateLogPayload>,
    "mutationFn" | "onSuccess"
  > & {
    onSuccess?: () => void;
  },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayLogs"] });
      queryClient.invalidateQueries({ queryKey: ["latestLogs"] });

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: options?.onError,
  });
};
