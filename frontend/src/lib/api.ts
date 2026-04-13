import { authHeaders } from "./authStorage";

/** Базовый URL API. В dev Vite проксирует /api → backend (см. vite.config). */
export function apiPath(path: string): string {
  const base = import.meta.env.VITE_API_URL ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** fetch с подстановкой Authorization: Bearer, если токен есть в localStorage */
export function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const auth = new Headers(authHeaders());
  const bearer = auth.get("Authorization");
  if (bearer) {
    headers.set("Authorization", bearer);
  }
  return fetch(apiPath(path), { ...init, headers });
}
