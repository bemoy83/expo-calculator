// The one line in the builder's header that says how the steps are doing.

export interface BuilderStatus {
  tone: 'error' | 'draft' | 'ok';
  label: string;
}

const steps = (count: number, one: string, many: string) => (count === 1 ? `1 step ${one}` : `${count} steps ${many}`);

/**
 * Broken steps (red) come first, then names that aren't inputs yet (unresolved, amber), then steps still
 * being written; nothing to say when the calculator has no steps.
 */
export function builderStatus(
  stepCount: number,
  counts: { broken: number; unresolved: number; incomplete: number }
): BuilderStatus | undefined {
  if (stepCount === 0) return undefined;
  if (counts.broken > 0) return { tone: 'error', label: steps(counts.broken, 'has an error', 'have errors') };
  if (counts.unresolved > 0) return { tone: 'draft', label: steps(counts.unresolved, 'has an unknown name', 'have unknown names') };
  if (counts.incomplete > 0) return { tone: 'draft', label: steps(counts.incomplete, 'incomplete', 'incomplete') };
  return { tone: 'ok', label: 'No errors' };
}
