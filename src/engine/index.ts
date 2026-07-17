/**
 * Promptly generation engine — public entry point.
 *
 * Pure and deterministic: identical inputs always produce identical
 * GenerationPlans. See ./types for the frozen contract.
 */
import { createRng } from '@/lib/seeded';
import type {
  CreateProjectInput,
  EditInput,
  Engine,
  EngineReply,
  GenerationPlan,
  TemplateId,
} from './types';
import { parsePrompt } from './parse';
import { applyEdits, parseEdit } from './edits';
import { buildClarify, buildCreationNarrative, buildEditNarrative } from './respond';
import { generateFiles } from './codegen';
import { diffFileSystems } from './diff';
import { compilePreview } from './compile';
import { TEMPLATE_LABELS } from './codegen/shared';

/** Human title-case template label, e.g. "Habit tracker". */
export function templateLabel(template: TemplateId): string {
  return TEMPLATE_LABELS[template];
}

function createProject({ prompt, seed }: CreateProjectInput): GenerationPlan {
  const spec = parsePrompt(prompt, seed);
  const files = generateFiles(spec);
  const rng = createRng(`${seed}:creation-narrative`);
  const narrative = buildCreationNarrative(spec, rng);
  return {
    kind: 'generation',
    intro: narrative.intro,
    planItems: narrative.planItems,
    outro: narrative.outro,
    summary: `Create ${spec.name}`,
    changes: diffFileSystems(null, files),
    spec,
    files,
  };
}

function applyMessage({ spec, message, seed, selection }: EditInput): EngineReply {
  const ops = parseEdit(message, spec, selection);
  const rng = createRng(`${seed}:edit-narrative`);
  if (ops.length === 0) {
    return { kind: 'clarify', text: buildClarify(message, rng) };
  }

  const nextSpec = applyEdits(spec, ops);
  // Regenerate both sides from the project seed so untouched files stay
  // byte-identical and the diff shows only what the edit actually moved.
  const beforeFiles = generateFiles(spec);
  const afterFiles = generateFiles(nextSpec);
  const narrative = buildEditNarrative(ops, nextSpec, rng);

  return {
    kind: 'generation',
    intro: narrative.intro,
    planItems: [],
    outro: narrative.outro,
    summary: narrative.summary,
    changes: diffFileSystems(beforeFiles, afterFiles),
    spec: nextSpec,
    files: afterFiles,
  };
}

export const engine: Engine = {
  createProject,
  applyMessage,
  compilePreview,
  templateLabel,
};

export type * from './types';
