import { api } from "@/lib/api";
import { IPlan } from "@/types";
import { MutationFunction, QueryFunction, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useGetPlan = ({
  id,
  queryKey,
}: {
  id: string;
  queryKey: string[];
}) => {
  const getPlan: QueryFunction<{ data: IPlan }> = () => {
    return api.get<{ data: IPlan }>(`/api/plans/${id}`);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey ?? ["plan", id],
    queryFn: getPlan,
    enabled: !!id,
  });

  return { data: data?.data, isLoading, error };
}

export const useUpdatePlan = ({
  id,
  enableToast = true,
  queryKey,
}: {
  id: string;
  enableToast?: boolean;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const updatePlan: MutationFunction<{ data: IPlan }, { title?: string; description?: string }> = (values) => {
    return api.patch<{ data: IPlan }>(`/api/plans/${id}`, values);
  };

  const { mutate, isPending, error } = useMutation({
    mutationFn: updatePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey ?? ["plan", id] });
      if (enableToast) {
        toast.success("Plan updated");
      }
    },
    onError: (error) => {
      if (enableToast) {
        toast.error(error instanceof Error ? error.message : "Failed to update plan");
      }
    },
  });

  return { mutate, isPending, error: error as Error };
}

export const useDeletePlan = ({
  id,
  enableToast = true,
  onSuccess,
  onError,
  queryKey,
}: {
  id: string;
  enableToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  queryKey: string[];
}) => {
  const queryClient = useQueryClient();
  const deletePlan: MutationFunction<void, string> = (planId) => {
    return api.delete(`/api/plans/${planId}`);
  };

  const { mutate, isPending, error } = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey ?? ["plan", id] });
      if (enableToast) {
        toast.success("Plan deleted");
      }
      onSuccess?.();
    },
    onError: (error: Error) => {
      if (enableToast) {
        toast.error(error instanceof Error ? error.message : "Failed to delete plan");
      }
      onError?.(error);
    },
  });

  return { mutate, isPending, error: error };
}
