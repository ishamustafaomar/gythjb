import type { TemplateId } from '@/engine/types';

/**
 * Model catalog + task router for the composer's model picker.
 *
 * Promptly is local-first — generation always runs on the deterministic
 * engine — but the routing itself is real: in "auto" mode each task is
 * analyzed and assigned the model whose strengths fit it best, and the
 * decision (with its reason) is recorded on the assistant turn.
 */

export type ModelId =
  | 'deepseek-v4-flash'
  | 'gemini-2.5-flash'
  | 'step-one-3.7-flash'
  | 'qwen3-coder-next';

export type ModelPreference = ModelId | 'auto';

export interface ModelInfo {
  id: ModelId;
  name: string;
  /** Short label for the composer chip. */
  short: string;
  /** One-line strength summary shown in the picker. */
  strengths: string;
}

export const MODELS: readonly ModelInfo[] = [
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek-V4-Flash',
    short: 'DeepSeek',
    strengths:
      'Best overall for continuous building — token-efficient across long, multi-hour sessions and tuned for agentic back-and-forth.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    short: 'Gemini',
    strengths:
      'Best for large codebases and complex apps — a massive context window keeps the whole project in view.',
  },
  {
    id: 'step-one-3.7-flash',
    name: 'Step One 3.7 Flash',
    short: 'Step One',
    strengths:
      'Best for rapid frontend changes — excellent instruction following for quick UI tweaks.',
  },
  {
    id: 'qwen3-coder-next',
    name: 'Qwen3-Coder-Next',
    short: 'Qwen3',
    strengths:
      'Best open-weight option — efficient parameter-to-performance ratio, strong at debugging and structural logic.',
  },
] as const;

export function modelInfo(id: ModelId): ModelInfo {
  // The catalog is a closed set, so lookup can't miss for a valid ModelId.
  return MODELS.find((m) => m.id === id) ?? MODELS[0]!;
}

/** Routing decision recorded on each assistant turn. */
export interface RoutedModel {
  id: ModelId;
  mode: 'auto' | 'manual';
  reason: string;
}

export interface RoutingInput {
  /** The user's prompt or edit message. */
  text: string;
  /** True for a project's first generation. */
  isFirstGeneration: boolean;
  template?: TemplateId;
}

const DEBUG_RE =
  /\b(fix|bug|broken|debug|error|crash|doesn'?t\s+work|not\s+working|wrong|issue)\b/i;

const UI_TWEAK_RE =
  /\b(color|colour|theme|dark|light|hero|header|footer|font|serif|round(er|ed)?|corner|spacing|padding|layout|section|rename|tagline|title|button|pill|minimal|brutalist|editorial|pastel|glass|glassy|sticky|bigger|smaller|larger)\b/i;

const COMPLEX_TEMPLATES: readonly TemplateId[] = [
  'dashboard',
  'store',
  'kanban',
  'chat',
];

const COMPLEX_RE = /\b(full|complete|entire|multi|complex|advanced)\b/i;

/**
 * Resolve which model handles a task. Manual selection always wins;
 * "auto" analyzes the task and routes to the best-suited model.
 */
export function resolveModel(
  preference: ModelPreference,
  input: RoutingInput
): RoutedModel {
  if (preference !== 'auto') {
    return { id: preference, mode: 'manual', reason: 'Selected manually' };
  }

  const { text, isFirstGeneration, template } = input;

  if (!isFirstGeneration) {
    if (DEBUG_RE.test(text)) {
      return {
        id: 'qwen3-coder-next',
        mode: 'auto',
        reason: 'Debugging and structural logic — routed to the open-weight coder',
      };
    }
    if (UI_TWEAK_RE.test(text)) {
      return {
        id: 'step-one-3.7-flash',
        mode: 'auto',
        reason: 'Quick UI tweak — routed for fast, precise frontend edits',
      };
    }
    return {
      id: 'deepseek-v4-flash',
      mode: 'auto',
      reason: 'Ongoing build conversation — routed to the long-session all-rounder',
    };
  }

  const isComplex =
    (template !== undefined && COMPLEX_TEMPLATES.includes(template)) ||
    text.length > 140 ||
    COMPLEX_RE.test(text);
  if (isComplex) {
    return {
      id: 'gemini-2.5-flash',
      mode: 'auto',
      reason: 'Large multi-part build — routed for maximum context',
    };
  }
  return {
    id: 'deepseek-v4-flash',
    mode: 'auto',
    reason: 'New build — routed to the long-session all-rounder',
  };
}
