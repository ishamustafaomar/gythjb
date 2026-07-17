/**
 * Typed localStorage wrapper with a versioned namespace.
 * All persisted keys live under `promptly.v1.*` so future schema changes can
 * migrate or invalidate cleanly.
 */
const NAMESPACE = 'promptly.v1';

export function storageKey(key: string): string {
  return `${NAMESPACE}.${key}`;
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or storage unavailable — callers surface a toast.
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // Ignore — removal failing is harmless.
  }
}
