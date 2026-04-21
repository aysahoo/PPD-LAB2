const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiErrorBody = { message?: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function fetchAuthorizedBlob(path: string, token: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText || "Request failed";
    try {
      const data = JSON.parse(text) as ApiErrorBody;
      if (typeof data.message === "string") msg = data.message;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }
  return res.blob();
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = init?.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  const data = await parseJson<ApiErrorBody & T>(res);
  if (!res.ok) {
    const msg =
      typeof data.message === "string" ? data.message : res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  /** Public GET (no Authorization header). */
  getPublic: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),

  get: <T>(path: string, token: string) =>
    apiRequest<T>(path, { method: "GET", token }),

  postJson: <T>(path: string, body: unknown, token?: string | null) =>
    apiRequest<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      token: token ?? undefined,
    }),

  putJson: <T>(path: string, body: unknown, token: string) =>
    apiRequest<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      token,
    }),

  delete: <T>(path: string, token: string) =>
    apiRequest<T>(path, { method: "DELETE", token }),

  /** Multipart upload — do not set Content-Type (browser sets boundary). */
  postFormData: <T>(path: string, formData: FormData, token: string) =>
    apiRequest<T>(path, {
      method: "POST",
      body: formData,
      token,
    }),

  /** Binary GET (e.g. PDF) with Authorization — use with object URLs to view in a new tab. */
  getBlob: (path: string, token: string) => fetchAuthorizedBlob(path, token),
};
