import { engine } from '@/engine';
import type {
  ElementSelection,
  GenerationPlan,
  FileChange,
} from '@/engine/types';
import { useProjects, type ChatMessage } from '@/stores/projects';
import { uid } from '@/lib/utils';

/**
 * Orchestrates the assistant-turn lifecycle on top of the pure engine:
 * thinking → streamed prose → plan bullets → file chips → version commit.
 * The engine is synchronous; all pacing (and cancellation) lives here so
 * tests of the engine stay timing-free.
 */

const activeGenerations = new Map<string, AbortController>();

export function isGenerating(projectId: string): boolean {
  return activeGenerations.has(projectId);
}

export function stopGeneration(projectId: string): void {
  activeGenerations.get(projectId)?.abort();
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

/** Split prose into small chunks so streaming reads naturally. */
function chunksOf(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

interface StreamCallbacks {
  onDone?: () => void;
}

async function streamAssistantTurn(
  projectId: string,
  messageId: string,
  plan: GenerationPlan,
  isFirstGeneration: boolean,
  callbacks?: StreamCallbacks
): Promise<void> {
  const controller = new AbortController();
  activeGenerations.set(projectId, controller);
  const { signal } = controller;
  const store = useProjects.getState();
  const patch = (
    p: Partial<ChatMessage>,
    options?: { persist?: boolean }
  ) => useProjects.getState().patchMessage(projectId, messageId, p, options);

  try {
    // Thinking pause before any output.
    await sleep(isFirstGeneration ? 1100 : 700, signal);

    // Stream intro prose word by word.
    let text = '';
    for (const chunk of chunksOf(plan.intro)) {
      text += chunk;
      patch({ text }, { persist: false });
      await sleep(24, signal);
    }

    // Reveal plan bullets one at a time.
    if (plan.planItems.length > 0) {
      const items: string[] = [];
      for (const item of plan.planItems) {
        await sleep(260, signal);
        items.push(item);
        patch({ planItems: [...items] }, { persist: false });
      }
    }

    // Reveal file changes one at a time (the "working" phase).
    await sleep(isFirstGeneration ? 900 : 500, signal);
    const revealed: FileChange[] = [];
    for (const change of plan.changes) {
      revealed.push(change);
      patch({ changes: [...revealed] }, { persist: false });
      await sleep(340, signal);
    }

    // Commit the version, then stream the outro.
    const versions = useProjects.getState().versions[projectId] ?? [];
    const versionNumber = versions.length + 1;
    const version = {
      id: uid('ver'),
      n: versionNumber,
      ts: Date.now(),
      summary: plan.summary,
      spec: plan.spec,
      files: plan.files,
    };
    useProjects.getState().addVersion(projectId, version);

    let outro = '';
    for (const chunk of chunksOf(plan.outro)) {
      outro += chunk;
      patch({ outro }, { persist: false });
      await sleep(18, signal);
    }

    patch({
      outro,
      status: 'complete',
      versionId: version.id,
      versionNumber,
      changes: plan.changes,
      planItems: plan.planItems,
    });
    callbacks?.onDone?.();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Keep whatever prose already streamed; no version is committed.
      patch({ status: 'stopped' });
    } else {
      patch({
        status: 'error',
        text: 'Something went wrong while generating. Please try again.',
      });
    }
  } finally {
    activeGenerations.delete(projectId);
    // Ensure the final streamed state is persisted.
    const latest = useProjects
      .getState()
      .messages[projectId]?.find((m) => m.id === messageId);
    if (latest) store.patchMessage(projectId, messageId, {});
  }
}

/** Create a project from a first prompt and kick off its generation. */
export function startProjectFromPrompt(prompt: string): string {
  const projectId = uid('proj');
  const plan = engine.createProject({ prompt, seed: projectId });
  const store = useProjects.getState();

  store.insertProject({ id: projectId, name: plan.spec.name, spec: plan.spec });
  store.appendMessage(projectId, {
    id: uid('msg'),
    role: 'user',
    text: prompt,
    ts: Date.now(),
    status: 'complete',
  });

  const assistantId = uid('msg');
  store.appendMessage(projectId, {
    id: assistantId,
    role: 'assistant',
    text: '',
    ts: Date.now(),
    status: 'streaming',
  });

  void streamAssistantTurn(projectId, assistantId, plan, true);
  return projectId;
}

/** Send a follow-up chat message to an existing project. */
export function sendProjectMessage(
  projectId: string,
  text: string,
  options?: { selection?: ElementSelection; attachments?: string[] }
): void {
  const store = useProjects.getState();
  const project = store.getProject(projectId);
  if (!project || isGenerating(projectId)) return;

  store.appendMessage(projectId, {
    id: uid('msg'),
    role: 'user',
    text,
    ts: Date.now(),
    status: 'complete',
    selection: options?.selection,
    attachments: options?.attachments,
  });

  const turnSeed = `${projectId}:${(store.messages[projectId] ?? []).length}`;
  const reply = engine.applyMessage({
    spec: project.spec,
    message: text,
    seed: turnSeed,
    selection: options?.selection,
  });

  const assistantId = uid('msg');
  store.appendMessage(projectId, {
    id: assistantId,
    role: 'assistant',
    text: '',
    ts: Date.now(),
    status: 'streaming',
  });

  if (reply.kind === 'clarify') {
    void streamClarify(projectId, assistantId, reply.text);
    return;
  }
  void streamAssistantTurn(projectId, assistantId, reply, false);
}

async function streamClarify(
  projectId: string,
  messageId: string,
  fullText: string
): Promise<void> {
  const controller = new AbortController();
  activeGenerations.set(projectId, controller);
  const patch = (p: Partial<ChatMessage>, options?: { persist?: boolean }) =>
    useProjects.getState().patchMessage(projectId, messageId, p, options);
  try {
    await sleep(500, controller.signal);
    let text = '';
    for (const chunk of chunksOf(fullText)) {
      text += chunk;
      patch({ text }, { persist: false });
      await sleep(22, controller.signal);
    }
    patch({ text, status: 'complete' });
  } catch {
    patch({ status: 'stopped' });
  } finally {
    activeGenerations.delete(projectId);
  }
}

/** Restore an older version by copying it forward as a new head version. */
export function restoreVersion(projectId: string, versionId: string): void {
  const store = useProjects.getState();
  const versions = store.versions[projectId] ?? [];
  const target = versions.find((v) => v.id === versionId);
  if (!target) return;

  const version = {
    id: uid('ver'),
    n: versions.length + 1,
    ts: Date.now(),
    summary: `Restore version ${target.n}`,
    spec: target.spec,
    files: target.files,
  };
  store.addVersion(projectId, version);
  store.appendMessage(projectId, {
    id: uid('msg'),
    role: 'assistant',
    text: `Restored the project to version ${target.n} (“${target.summary}”). Everything after that point has been set aside — you can keep editing from here.`,
    ts: Date.now(),
    status: 'complete',
    versionId: version.id,
    versionNumber: version.n,
  });
}
