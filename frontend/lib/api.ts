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
}

/**
 * Custom fetch wrapper that handles authentication and errors
 */
export async function apiFetch<T = unknown>(
    url: string,
    options: FetchOptions = {}
): Promise<T> {
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
            toast.error("Session expired. Please login again.");
            window.location.href = "/login";
            throw new Error("Unauthorized");
        }
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
