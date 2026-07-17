/**
 * Generation engine contract.
 *
 * The engine is a pure, deterministic, synchronous library:
 *   prompt text  ──►  ProjectSpec  ──►  virtual file system  ──►  preview HTML
 *
 * It never performs I/O and derives all variety from seeds, so identical
 * inputs always produce identical outputs. The UI layer owns timing
 * (streaming, thinking states) and persistence.
 */

export type TemplateId =
  | 'landing'
  | 'dashboard'
  | 'todo'
  | 'habit'
  | 'portfolio'
  | 'blog'
  | 'store'
  | 'kanban'
  | 'notes'
  | 'pricing'
  | 'recipes'
  | 'chat';

export type ColorMode = 'light' | 'dark';
export type RadiusStyle = 'sharp' | 'rounded' | 'pill';
export type FontStyle = 'sans' | 'serif' | 'mono';

export interface PaletteSpec {
  /** Main interactive color, hex like "#7A5AF8". */
  primary: string;
  /** Supporting accent used for highlights/badges, hex. */
  accent: string;
  mode: ColorMode;
}

/** Sections available to page-like templates (landing, portfolio, pricing…). */
export type SectionId =
  | 'hero'
  | 'features'
  | 'stats'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'gallery'
  | 'about'
  | 'contact'
  | 'newsletter'
  | 'cta';

/** Behavioral/visual flags templates understand. */
export type FeatureFlag = 'sticky-header' | 'compact' | 'animations';

export interface ProjectSpec {
  template: TemplateId;
  /** Product/brand name rendered inside the generated app. */
  name: string;
  /** One-line tagline rendered inside the generated app. */
  tagline: string;
  palette: PaletteSpec;
  radius: RadiusStyle;
  font: FontStyle;
  /** Ordered sections; only meaningful for page-like templates. */
  sections: SectionId[];
  features: FeatureFlag[];
  /** Determinism seed — set once at project creation. */
  seed: string;
}

export type FileLanguage = 'html' | 'css' | 'js' | 'markdown';

export interface VirtualFile {
  /** Project-relative path, e.g. "index.html", "css/styles.css". */
  path: string;
  contents: string;
  language: FileLanguage;
}

export type VirtualFileSystem = VirtualFile[];

export interface FileChange {
  path: string;
  kind: 'created' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

/** Element the user picked with the preview inspector, as edit context. */
export interface ElementSelection {
  tag: string;
  /** Trimmed innerText, possibly truncated. */
  text: string;
}

/**
 * Everything the UI needs to play back one assistant turn.
 * `files`/`spec` are the state AFTER this turn.
 */
export interface GenerationPlan {
  kind: 'generation';
  /** Prose streamed before edits begin ("I'll build you a …"). */
  intro: string;
  /** Optional bullet plan (used on first generation). */
  planItems: string[];
  /** Prose streamed after edits complete. */
  outro: string;
  /** Short label for the version history, e.g. "Add pricing section". */
  summary: string;
  changes: FileChange[];
  spec: ProjectSpec;
  files: VirtualFileSystem;
}

/** Returned when a message can't be mapped to a build/edit action. */
export interface ClarifyReply {
  kind: 'clarify';
  text: string;
}

export type EngineReply = GenerationPlan | ClarifyReply;

/* ------------------------------------------------------------------ */
/* Public API (implemented in src/engine/index.ts)                     */
/* ------------------------------------------------------------------ */

export interface CreateProjectInput {
  prompt: string;
  /** Seed for deterministic variety — the new project's id. */
  seed: string;
}

export interface EditInput {
  spec: ProjectSpec;
  message: string;
  /** Unique per turn, e.g. `${projectId}:${messageIndex}`. */
  seed: string;
  selection?: ElementSelection;
}

export interface Engine {
  /** Parse a first prompt and produce the initial generation. */
  createProject(input: CreateProjectInput): GenerationPlan;
  /** Apply a follow-up chat message to an existing project. */
  applyMessage(input: EditInput): EngineReply;
  /** Compile a VFS into a single self-contained HTML document. */
  compilePreview(files: VirtualFileSystem, options?: CompileOptions): string;
  /** Human title-case template label, e.g. "Habit tracker". */
  templateLabel(template: TemplateId): string;
}

export interface CompileOptions {
  /**
   * Inject the select-element inspector bridge (hover outlines +
   * postMessage on click). Used by the editor preview, not by publish.
   */
  inspector?: boolean;
}
