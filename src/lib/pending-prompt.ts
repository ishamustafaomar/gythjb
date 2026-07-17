/**
 * When a signed-out visitor submits the hero composer, the prompt is parked
 * here (sessionStorage — tab-scoped, survives the auth redirect) and picked
 * up right after login/signup so no work is lost.
 */
const KEY = 'promptly.pending-prompt';

export function setPendingPrompt(prompt: string): void {
  try {
    sessionStorage.setItem(KEY, prompt);
  } catch {
    // Storage unavailable — the user just retypes after auth.
  }
}

export function takePendingPrompt(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    if (value !== null) sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}
