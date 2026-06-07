import { queryClient } from "@/lib/query-client";
import { toast } from "sonner";


/** Fetch options */
interface FetchOptions extends RequestInit {
  credentials?: RequestCredentials;
  retryCount?: number;
}

/**
 * Attempts to refresh the authentication token
 */
let refreshPromise: Promise<boolean> | null = null;
let hasRedirectedToLogin = false;

async function refreshAuthToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (refreshRes.ok) {
          queryClient.invalidateQueries({ queryKey: ["user"] });
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

function redirectToLogin() {
  if (hasRedirectedToLogin) {
    return;
  }

  hasRedirectedToLogin = true;
  toast.error("Session expired. Please login again.");
  localStorage.removeItem("logFormDrafts");
  window.location.href = "/login";
}

async function readErrorMessage(res: Response) {
  try {
    const error = await res.json();
    return error?.message ?? "An error occurred";
  } catch {
    return "An error occurred";
  }
}

/**
 * Custom fetch wrapper that handles authentication and errors
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const retryCount = options.retryCount ?? 0;
  const maxRetries = 3;
  const isRefreshEndpoint = url === "/api/auth/refresh";

  const isFormData = options.body instanceof FormData;
  const config: FetchOptions = {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  };

  const res = await fetch(url, config);

  // Handle unauthorized responses by refreshing once, regardless of the backend's
  // exact 401 message ("Unauthorized", "Token expired", "Invalid token", etc.).
  if (res.status === 401) {
    if (!isRefreshEndpoint && retryCount < maxRetries) {
      const refreshSuccess = await refreshAuthToken();

      if (refreshSuccess) {
        // Retry the original request after the refresh cookie has been set.
        return apiFetch<T>(url, {
          ...options,
          retryCount: retryCount + 1,
        });
      }
    }

    redirectToLogin();
    throw new Error(await readErrorMessage(res));
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    toast.error(
      `Too many requests. Please try again in ${retryAfter} seconds.`,
    );
    throw new Error(
      `Too many requests. Please try again in ${retryAfter} seconds.`,
    );
  }

  // Handle other errors
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return res.json();
}

/**
 * Convenience methods for HTTP verbs
 */
export const api = {
  get: <T = unknown>(url: string) => apiFetch<T>(url),

  post: <T = unknown>(url: string, data?: unknown) =>
    apiFetch<T>(url, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: <T = unknown>(url: string, data?: unknown) =>
    apiFetch<T>(url, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: <T = unknown>(url: string, data?: unknown) =>
    apiFetch<T>(url, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(url: string) =>
    apiFetch<T>(url, {
      method: "DELETE",
    }),

  postForm: <T = unknown>(url: string, data: FormData) =>
    apiFetch<T>(url, {
      method: "POST",
      body: data,
    }),
};
