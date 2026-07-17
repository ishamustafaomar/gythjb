import { create } from 'zustand';
import { readJSON, writeJSON, removeKey } from '@/lib/storage';
import { uid, slugify } from '@/lib/utils';
import type {
  ProjectSpec,
  VirtualFileSystem,
  FileChange,
  ElementSelection,
} from '@/engine/types';
import type { RoutedModel } from '@/lib/models';

export interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  spec: ProjectSpec;
  headVersionId: string;
  published?: { url: string; versionId: string; at: number };
  /** Free-form context the user gives the agent (project settings). */
  knowledge?: string;
}

export type MessageStatus = 'streaming' | 'complete' | 'stopped' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Closing prose streamed after the edits card (assistant turns). */
  outro?: string;
  ts: number;
  status: MessageStatus;
  /** Bullet plan shown on first generation. */
  planItems?: string[];
  /** File changes card, present once edits have been applied. */
  changes?: FileChange[];
  /** Version produced by this assistant turn. */
  versionId?: string;
  versionNumber?: number;
  /** Element context attached to a user message via the inspector. */
  selection?: ElementSelection;
  /** Attached image names (visual chip only; contents are not persisted). */
  attachments?: string[];
  /** Which model handled this assistant turn, and why it was chosen. */
  model?: RoutedModel;
}

export interface Version {
  id: string;
  n: number;
  ts: number;
  summary: string;
  spec: ProjectSpec;
  files: VirtualFileSystem;
}

interface ProjectsStore {
  projects: Project[];
  /** Per-project caches, hydrated on first access. */
  messages: Record<string, ChatMessage[]>;
  versions: Record<string, Version[]>;

  hydrateProject: (projectId: string) => void;

  insertProject: (input: {
    name: string;
    spec: ProjectSpec;
    id?: string;
  }) => Project;
  updateProject: (
    id: string,
    patch: Partial<Pick<Project, 'name' | 'spec' | 'published' | 'knowledge' | 'headVersionId'>>
  ) => void;
  duplicateProject: (id: string) => Project | null;
  deleteProject: (id: string) => void;

  appendMessage: (projectId: string, message: ChatMessage) => void;
  /**
   * Update a message. During token streaming pass `persist: false` so we
   * re-render without hammering localStorage; terminal patches persist.
   */
  patchMessage: (
    projectId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
    options?: { persist?: boolean }
  ) => void;

  addVersion: (projectId: string, version: Version) => void;

  getProject: (id: string) => Project | undefined;
  getHeadVersion: (projectId: string) => Version | undefined;
}

function messagesKey(id: string) {
  return `project.${id}.messages`;
}
function versionsKey(id: string) {
  return `project.${id}.versions`;
}

function persistProjects(projects: Project[]) {
  writeJSON('projects', projects);
}

export const useProjects = create<ProjectsStore>((set, get) => ({
  projects: readJSON<Project[]>('projects', []),
  messages: {},
  versions: {},

  hydrateProject: (projectId) => {
    const s = get();
    if (s.messages[projectId] && s.versions[projectId]) return;
    // A message still marked "streaming" in storage means the page was
    // closed mid-generation — normalize it so the UI never shows a live
    // state with no live generation behind it.
    const stored = readJSON<ChatMessage[]>(messagesKey(projectId), []).map((m) =>
      m.status === 'streaming' ? { ...m, status: 'stopped' as const } : m
    );
    set({
      messages: { ...s.messages, [projectId]: stored },
      versions: {
        ...s.versions,
        [projectId]: readJSON<Version[]>(versionsKey(projectId), []),
      },
    });
  },

  insertProject: ({ name, spec, id }) => {
    const now = Date.now();
    const projectId = id ?? uid('proj');
    const project: Project = {
      id: projectId,
      name,
      slug: slugify(name),
      createdAt: now,
      updatedAt: now,
      spec,
      headVersionId: '',
    };
    const projects = [project, ...get().projects];
    persistProjects(projects);
    set({
      projects,
      messages: { ...get().messages, [projectId]: [] },
      versions: { ...get().versions, [projectId]: [] },
    });
    return project;
  },

  updateProject: (id, patch) => {
    const projects = get().projects.map((p) =>
      p.id === id
        ? {
            ...p,
            ...patch,
            slug: patch.name ? slugify(patch.name) : p.slug,
            updatedAt: Date.now(),
          }
        : p
    );
    persistProjects(projects);
    set({ projects });
  },

  duplicateProject: (id) => {
    const state = get();
    const source = state.projects.find((p) => p.id === id);
    if (!source) return null;
    state.hydrateProject(id);
    const { messages, versions } = get();
    const now = Date.now();
    const copy: Project = {
      ...source,
      id: uid('proj'),
      name: `${source.name} copy`,
      slug: slugify(`${source.name} copy`),
      createdAt: now,
      updatedAt: now,
      published: undefined,
    };
    const projects = [copy, ...get().projects];
    persistProjects(projects);
    // If the source is duplicated mid-generation, its live cache holds a
    // still-"streaming" message with no generation behind it in the copy —
    // normalize it so the copy never shows a frozen live state.
    const copiedMessages = (messages[id] ?? []).map((m) =>
      m.status === 'streaming' ? { ...m, status: 'stopped' as const } : m
    );
    const copiedVersions = versions[id] ?? [];
    writeJSON(messagesKey(copy.id), copiedMessages);
    writeJSON(versionsKey(copy.id), copiedVersions);
    set({
      projects,
      messages: { ...get().messages, [copy.id]: copiedMessages },
      versions: { ...get().versions, [copy.id]: copiedVersions },
    });
    return copy;
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    persistProjects(projects);
    removeKey(messagesKey(id));
    removeKey(versionsKey(id));
    const { [id]: _m, ...messages } = get().messages;
    const { [id]: _v, ...versions } = get().versions;
    set({ projects, messages, versions });
  },

  appendMessage: (projectId, message) => {
    const list = [...(get().messages[projectId] ?? []), message];
    writeJSON(messagesKey(projectId), list);
    set({ messages: { ...get().messages, [projectId]: list } });
  },

  patchMessage: (projectId, messageId, patch, options) => {
    const list = (get().messages[projectId] ?? []).map((m) =>
      m.id === messageId ? { ...m, ...patch } : m
    );
    if (options?.persist !== false) writeJSON(messagesKey(projectId), list);
    set({ messages: { ...get().messages, [projectId]: list } });
  },

  addVersion: (projectId, version) => {
    const list = [...(get().versions[projectId] ?? []), version];
    writeJSON(versionsKey(projectId), list);
    set({ versions: { ...get().versions, [projectId]: list } });
    get().updateProject(projectId, {
      headVersionId: version.id,
      spec: version.spec,
    });
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  getHeadVersion: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    const versions = get().versions[projectId] ?? [];
    return (
      versions.find((v) => v.id === project?.headVersionId) ??
      versions[versions.length - 1]
    );
  },
}));
