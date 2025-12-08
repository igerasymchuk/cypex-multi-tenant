import { ApiError } from "@/types";

export class ApiClient {
  constructor(private baseUrl: string) {}

  async fetch<T>(
    path: string,
    options?: RequestInit & { token?: string }
  ): Promise<T> {
    const { token, ...fetchOptions } = options || {};

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...fetchOptions?.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      let error: ApiError;
      try {
        error = await response.json();
      } catch {
        error = {
          status: response.status,
          message: response.statusText || "An error occurred",
        };
      }
      throw error;
    }

    // Handle empty responses (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  async get<T>(path: string, token?: string): Promise<T> {
    return this.fetch<T>(path, { method: "GET", token });
  }

  async post<T>(path: string, body?: unknown, token?: string): Promise<T> {
    return this.fetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      token,
    });
  }

  async patch<T>(path: string, body: unknown, token?: string): Promise<T> {
    return this.fetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    });
  }

  async delete<T>(path: string, token?: string): Promise<T> {
    return this.fetch<T>(path, { method: "DELETE", token });
  }
}

// Get the API URL from environment variables
export function getAuthApiUrl(): string {
  return process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:4000";
}

export function getDataApiUrl(): string {
  return process.env.NEXT_PUBLIC_DATA_API_URL || "http://localhost:3000";
}
