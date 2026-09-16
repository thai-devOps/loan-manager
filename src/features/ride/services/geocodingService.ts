import { ApiError } from "@/api/client";
import type { GeoSearchResult } from "@/features/ride/types/ride";

async function publicFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      body:
        options.body === undefined
          ? undefined
          : typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    );
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new ApiError(data.error ?? "Request failed", res.status);
  }
  return data as T;
}

export const geocodingService = {
  async searchAddress(q: string): Promise<GeoSearchResult[]> {
    const query = q.trim();
    if (query.length < 2) return [];
    return publicFetch<GeoSearchResult[]>(
      `/api/ride/geo/search?q=${encodeURIComponent(query)}`,
    );
  },
};
