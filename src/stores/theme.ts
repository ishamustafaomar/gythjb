import { create } from 'zustand';
import { readJSON, writeJSON } from '@/lib/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

export const useTheme = create<ThemeStore>((set) => ({
  preference: readJSON<ThemePreference>('theme', 'system'),
  setPreference: (preference) => {
    writeJSON('theme', preference);
    apply(preference);
    set({ preference });
  },
}));

// Apply once at module load and track OS changes while in "system".
apply(useTheme.getState().preference);
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => apply(useTheme.getState().preference));
