import { create } from 'zustand';
import { readJSON, writeJSON } from '@/lib/storage';
import type { ModelPreference } from '@/lib/models';

interface ModelStore {
  preference: ModelPreference;
  setPreference: (p: ModelPreference) => void;
}

/** The composer's model selection, shared app-wide and persisted. */
export const useModel = create<ModelStore>((set) => ({
  preference: readJSON<ModelPreference>('model', 'auto'),
  setPreference: (preference) => {
    writeJSON('model', preference);
    set({ preference });
  },
}));
