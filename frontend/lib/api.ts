import { toast } from "sonner";

/**
 * Determines the backend URL:
 * - In development, use the backend container/port (3000 frontend, 4000 backend)
 * - In production, use relative paths (Nginx reverse proxy)
 */
const BASE_URL =
    process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL || "http://backend:4000"
        : "";

/** Fetch options */
interface FetchOptions extends RequestInit {
    credentials?: RequestCredentials;
    retryCount?: number;
}

/**
 * Attempts to refresh the authentication token
 */
async function refreshAuthToken(): Promise<boolean> {
    try {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (refreshRes.ok) {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Custom fetch wrapper that handles authentication and errors
 */
export async function apiFetch<T = unknown>(
    url: string,
    options: FetchOptions = {}
): Promise<T> {
    const retryCount = options.retryCount ?? 0;
    const maxRetries = 3;
    const isRefreshEndpoint = url === "/api/auth/refresh";

    const config: FetchOptions = {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    };

    const res = await fetch(`${BASE_URL}${url}`, config);

    // Handle unauthorized responses
    if (res.status === 401) {
        const error = await res.json();
        if (error?.message === "Unauthorized") {
            // Don't retry refresh endpoint itself
            if (isRefreshEndpoint) {
                toast.error("Session expired. Please login again.");
                localStorage.removeItem("logFormDrafts");
                window.location.href = "/login";
                throw new Error("Unauthorized");
            }

            // Try to refresh token if we haven't exceeded max retries
            if (retryCount < maxRetries) {
                const refreshSuccess = await refreshAuthToken();

                if (refreshSuccess) {
                    // Retry the original request with incremented retry count
                    return apiFetch<T>(url, {
                        ...options,
                        retryCount: retryCount + 1,
                    });
                }
                // If refresh failed, increment retry count and check if we should redirect
                const newRetryCount = retryCount + 1;
                if (newRetryCount >= maxRetries) {
                    toast.error("Session expired. Please login again.");
                    localStorage.removeItem("logFormDrafts");
                    window.location.href = "/login";
                }
            } else {
                // Max retries exceeded, redirect to login
                toast.error("Session expired. Please login again.");
                localStorage.removeItem("logFormDrafts");
                window.location.href = "/login";
            }

            throw new Error("Unauthorized");
        }
    }

    if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        toast.error(`Too many requests. Please try again in ${retryAfter} seconds.`);
        throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
    }

    // Handle other errors
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.message ?? "An error occurred");
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
};
