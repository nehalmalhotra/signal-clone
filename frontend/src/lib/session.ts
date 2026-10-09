// The bearer token lives in localStorage so a refresh keeps you logged in (D-35).
// Wrapped in try/catch because storage can be blocked (private mode, disabled cookies).

const KEY = "signal-clone.token";

export function readToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // Not fatal: the session just won't survive a refresh.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
