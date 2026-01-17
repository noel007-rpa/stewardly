export type StewardlyUser = {
  user_id: string;
  email: string;
  timezone?: string;
  preferred_currency?: string;
};

const TOKEN_KEY = "stewardly_access_token";
const USER_KEY = "stewardly_user";

type SessionState = {
  accessToken: string | null;
  user: StewardlyUser | null;
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getSession(): SessionState {
  return {
    accessToken: localStorage.getItem(TOKEN_KEY),
    user: safeParse<StewardlyUser>(localStorage.getItem(USER_KEY)),
  };
}

export function setSession(token: string, user: StewardlyUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
