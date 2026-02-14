import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        if (
          error instanceof Error &&
          error.message.includes("Too many requests")
        ) {
          return false;
        }
        return false;
      },
    },
  },
});
