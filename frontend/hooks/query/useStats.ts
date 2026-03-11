import { api } from "@/lib/api";
import { ILogStats } from "@/types";
import { useQuery } from "@tanstack/react-query";

export const useGetStats = ({ queryKey }: { queryKey: string[] }) => {
  const getStats = async () => {
    return api.get<{ data: ILogStats }>("/api/logs/stats");
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKey ?? ["stats"],
    queryFn: getStats,
  });

  return { data: data?.data, isLoading, error: error as Error };
}
