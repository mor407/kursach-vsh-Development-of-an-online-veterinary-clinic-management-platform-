export const TOKEN_KEY = "vetclinic_token";
export const USER_KEY = "vetclinic_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Заголовки для защищённых запросов */
export function authHeaders(): HeadersInit {
  const token = getToken();
  const h: Record<string, string> = {};
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}
