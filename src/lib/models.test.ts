import { describe, expect, it } from 'vitest';
import { MODELS, modelInfo, resolveModel } from './models';

describe('model catalog', () => {
  it('exposes four models with names and strengths', () => {
    expect(MODELS).toHaveLength(4);
    for (const m of MODELS) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.strengths.length).toBeGreaterThan(20);
      expect(modelInfo(m.id)).toBe(m);
    }
  });
});

describe('resolveModel', () => {
  it('manual selection always wins, regardless of task', () => {
    const routed = resolveModel('gemini-2.5-flash', {
      text: 'fix the broken cart button',
      isFirstGeneration: false,
      template: 'store',
    });
    expect(routed).toEqual({
      id: 'gemini-2.5-flash',
      mode: 'manual',
      reason: 'Selected manually',
    });
  });

  it('routes debugging edits to the open-weight coder', () => {
    const routed = resolveModel('auto', {
      text: "the add button doesn't work, fix it",
      isFirstGeneration: false,
      template: 'todo',
    });
    expect(routed.id).toBe('qwen3-coder-next');
    expect(routed.mode).toBe('auto');
  });

  it('routes UI tweaks to the fast frontend model', () => {
    const routed = resolveModel('auto', {
      text: 'make the header sticky and the buttons rounder',
      isFirstGeneration: false,
      template: 'landing',
    });
    expect(routed.id).toBe('step-one-3.7-flash');
  });

  it('debugging outranks UI keywords in the same message', () => {
    const routed = resolveModel('auto', {
      text: 'fix the header color, it renders wrong',
      isFirstGeneration: false,
    });
    expect(routed.id).toBe('qwen3-coder-next');
  });

  it('routes plain follow-ups to the long-session all-rounder', () => {
    const routed = resolveModel('auto', {
      text: 'add a testimonials area with three quotes',
      isFirstGeneration: false,
      template: 'landing',
    });
    expect(routed.id).toBe('deepseek-v4-flash');
  });

  it('routes complex first builds to the large-context model', () => {
    const byTemplate = resolveModel('auto', {
      text: 'an analytics dashboard for my shop',
      isFirstGeneration: true,
      template: 'dashboard',
    });
    expect(byTemplate.id).toBe('gemini-2.5-flash');

    const byLength = resolveModel('auto', {
      text: 'a landing page for a pottery studio with a gallery of past work, a story about the founders, testimonials from students, class pricing, and a newsletter signup form at the bottom',
      isFirstGeneration: true,
      template: 'landing',
    });
    expect(byLength.id).toBe('gemini-2.5-flash');
  });

  it('style words in a first prompt do not trigger the UI-tweak route', () => {
    const routed = resolveModel('auto', {
      text: 'a minimal landing page',
      isFirstGeneration: true,
      template: 'landing',
    });
    expect(routed.id).toBe('deepseek-v4-flash');
  });

  it('is deterministic', () => {
    const input = {
      text: 'add a faq',
      isFirstGeneration: false,
    } as const;
    expect(resolveModel('auto', input)).toEqual(resolveModel('auto', input));
  });
});
