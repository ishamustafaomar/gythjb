/**
 * diffFileSystems — cheap, deterministic file diffs. Line changes are
 * counted with a line multiset (no LCS): additions are lines in the new
 * file with no identical counterpart left in the old one, and vice versa.
 */
import type { FileChange, VirtualFileSystem } from './types';

function countLines(contents: string): number {
  return contents.length === 0 ? 0 : contents.split('\n').length;
}

function lineDelta(before: string, after: string): { additions: number; deletions: number } {
  const counts = new Map<string, number>();
  for (const line of before.split('\n')) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  let additions = 0;
  for (const line of after.split('\n')) {
    const remaining = counts.get(line) ?? 0;
    if (remaining > 0) counts.set(line, remaining - 1);
    else additions += 1;
  }
  let deletions = 0;
  for (const remaining of counts.values()) {
    deletions += remaining;
  }
  return { additions, deletions };
}

export function diffFileSystems(
  before: VirtualFileSystem | null,
  after: VirtualFileSystem,
): FileChange[] {
  const changes: FileChange[] = [];
  const previous = new Map((before ?? []).map((file) => [file.path, file] as const));

  for (const file of after) {
    const old = previous.get(file.path);
    if (!old) {
      changes.push({ path: file.path, kind: 'created', additions: countLines(file.contents), deletions: 0 });
      continue;
    }
    previous.delete(file.path);
    if (old.contents !== file.contents) {
      const { additions, deletions } = lineDelta(old.contents, file.contents);
      changes.push({ path: file.path, kind: 'modified', additions, deletions });
    }
  }

  for (const [path, file] of previous) {
    changes.push({ path, kind: 'deleted', additions: 0, deletions: countLines(file.contents) });
  }

  return changes;
}
