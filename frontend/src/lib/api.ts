import { clearToken, readToken } from "./session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** A non-2xx response. `detail` is the backend's {"detail": "..."} message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

/** Turns a relative "/media/..." path from the API into a full URL the <img> can load. */
export function mediaUrl(path: string | null): string | null {
  return path ? `${API_URL}${path}` : null;
}

interface RequestOptions {
  method?: string;
  json?: unknown;
  form?: FormData;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form) {
    // No Content-Type here: the browser adds the multipart boundary itself.
    body = options.form;
  }

  const res = await fetch(`${API_URL}${path}`, { method: options.method ?? "GET", headers, body });

  if (res.status === 401 && token) {
    // The session expired or was revoked. A full page load (not router.push) also wipes
    // every in-memory store, so nothing from the old session leaks into the next one.
    clearToken();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose (preserving-ui-state.md "State and authentication")
    window.location.href = "/register";
    throw new ApiError(401, "Session expired");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const detail = typeof data?.detail === "string" ? data.detail : res.statusText;
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
