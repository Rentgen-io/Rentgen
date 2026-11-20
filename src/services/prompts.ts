// Prompts (e.g. "Star on GitHub") can be hidden for a while or for good: until when is stored as an ISO date

export const DAY_MS = 24 * 60 * 60 * 1000;

// "Never ask again"; a far date rather than a flag, so it reads like any other stored date
const FOREVER = new Date('9999-12-31T00:00:00.000Z');

export function isPromptHidden(storageKey: string): boolean {
  const hiddenUntil = new Date(localStorage.getItem(storageKey) ?? NaN).getTime();
  return !Number.isNaN(hiddenUntil) && Date.now() < hiddenUntil;
}

/** Hides the prompt for the given time, or for good without one. */
export function hidePrompt(storageKey: string, durationMs?: number): void {
  const hiddenUntil = durationMs === undefined ? FOREVER : new Date(Date.now() + durationMs);
  localStorage.setItem(storageKey, hiddenUntil.toISOString());
}
