function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v) return v.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3000";
  throw new Error(
    "Missing VITE_API_URL. In Vercel (frontend project), add Environment Variable VITE_API_URL = your API origin (e.g. https://your-api.vercel.app), then redeploy.",
  );
}

function fetchErrorMessage(base: string): string {
  return `Cannot reach the API (${base}). Confirm VITE_API_URL is your live API URL, and on the API set CLIENT_ORIGIN to include ${typeof window !== "undefined" ? window.location.origin : "this site's origin"} (CORS).`;
}

type ApiErrorBody = { message?: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function fetchAuthorizedBlob(path: string, token: string): Promise<Blob> {
  const base = getApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error(fetchErrorMessage(base));
  }
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
  const base = getApiBase();
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = init?.token;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error(fetchErrorMessage(base));
  }
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
