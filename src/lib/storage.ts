/**
 * Typed localStorage wrapper with a versioned namespace.
 * All persisted keys live under `promptly.v1.*` so future schema changes can
 * migrate or invalidate cleanly.
 */
const NAMESPACE = 'promptly.v1';

export function storageKey(key: string): string {
  return `${NAMESPACE}.${key}`;
}

/**
 * Storage-write failures (quota exceeded, storage disabled) are surfaced
 * through a registered handler so this low-level module stays UI-free.
 * The app registers a toast-based handler at startup.
 */
type StorageErrorHandler = (key: string) => void;
let onError: StorageErrorHandler | null = null;
let notifiedOnce = false;

export function setStorageErrorHandler(handler: StorageErrorHandler): void {
  onError = handler;
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
    notifiedOnce = false;
    return true;
  } catch {
    // Quota exceeded or storage unavailable. Notify at most once per failure
    // streak so a burst of writes doesn't spam identical toasts.
    if (!notifiedOnce) {
      notifiedOnce = true;
      onError?.(key);
    }
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
