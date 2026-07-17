import { create } from 'zustand';
import { readJSON, writeJSON } from '@/lib/storage';
import { uid } from '@/lib/utils';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

/** Stored account record. Local demo auth — never real credentials. */
interface AccountRecord extends User {
  passwordHash: string;
}

interface AuthStore {
  user: User | null;
  signUp: (name: string, email: string, password: string) => { error?: string };
  signIn: (email: string, password: string) => { error?: string };
  signInDemo: (provider: 'google' | 'github') => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'email'>>) => void;
}

/**
 * Obfuscation only — this is a local-first demo product with no server;
 * we deliberately avoid storing the raw string, but this is NOT security.
 */
function hashPassword(password: string): string {
  let h = 5381;
  for (let i = 0; i < password.length; i++) {
    h = (h * 33) ^ password.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function readAccounts(): AccountRecord[] {
  return readJSON<AccountRecord[]>('accounts', []);
}

function persistSession(user: User | null) {
  writeJSON('session', user);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useAuth = create<AuthStore>((set, get) => ({
  user: readJSON<User | null>('session', null),

  signUp: (name, email, password) => {
    const trimmedName = name.trim();
    const normalized = email.trim().toLowerCase();
    if (trimmedName.length < 2) return { error: 'Please enter your name.' };
    if (!EMAIL_RE.test(normalized)) return { error: 'Enter a valid email address.' };
    if (password.length < 8)
      return { error: 'Password must be at least 8 characters.' };
    const accounts = readAccounts();
    if (accounts.some((a) => a.email === normalized))
      return { error: 'An account with this email already exists. Try logging in.' };
    const record: AccountRecord = {
      id: uid('user'),
      name: trimmedName,
      email: normalized,
      createdAt: Date.now(),
      passwordHash: hashPassword(password),
    };
    writeJSON('accounts', [...accounts, record]);
    const { passwordHash: _ph, ...user } = record;
    persistSession(user);
    set({ user });
    return {};
  },

  signIn: (email, password) => {
    const normalized = email.trim().toLowerCase();
    const account = readAccounts().find((a) => a.email === normalized);
    if (!account || account.passwordHash !== hashPassword(password))
      return { error: 'Incorrect email or password.' };
    const { passwordHash: _ph, ...user } = account;
    persistSession(user);
    set({ user });
    return {};
  },

  signInDemo: (provider) => {
    const name = provider === 'google' ? 'Demo Builder' : 'Demo Dev';
    const email = `demo-${provider}@promptly.local`;
    const accounts = readAccounts();
    let account = accounts.find((a) => a.email === email);
    if (!account) {
      account = {
        id: uid('user'),
        name,
        email,
        createdAt: Date.now(),
        passwordHash: hashPassword(uid()),
      };
      writeJSON('accounts', [...accounts, account]);
    }
    const { passwordHash: _ph, ...user } = account;
    persistSession(user);
    set({ user });
  },

  signOut: () => {
    persistSession(null);
    set({ user: null });
  },

  updateProfile: (patch) => {
    const current = get().user;
    if (!current) return;
    const user = { ...current, ...patch };
    const accounts = readAccounts().map((a) =>
      a.id === user.id ? { ...a, ...patch } : a
    );
    writeJSON('accounts', accounts);
    persistSession(user);
    set({ user });
  },
}));
