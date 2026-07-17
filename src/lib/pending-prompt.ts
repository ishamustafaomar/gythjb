/**
 * When a signed-out visitor submits the hero composer, the prompt is parked
 * here (sessionStorage — tab-scoped, survives the auth redirect) and picked
 * up right after login/signup so no work is lost.
 *
 * A timestamp bounds how long a parked prompt stays valid, so a visitor who
 * abandons the auth page and authenticates much later in the same tab isn't
 * surprised by an unwanted project from a forgotten prompt.
 */
const KEY = 'promptly.pending-prompt';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

interface PendingPrompt {
  prompt: string;
  ts: number;
}

export function setPendingPrompt(prompt: string): void {
  try {
    const payload: PendingPrompt = { prompt, ts: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable — the user just retypes after auth.
  }
}

export function takePendingPrompt(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Partial<PendingPrompt>;
    if (
      typeof parsed?.prompt !== 'string' ||
      typeof parsed?.ts !== 'number' ||
      Date.now() - parsed.ts > MAX_AGE_MS
    ) {
      return null;
    }
    return parsed.prompt;
  } catch {
    return null;
  }
}
