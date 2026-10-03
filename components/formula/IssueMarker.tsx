import type { ReactNode } from 'react';
import type { FormulaIssueLevel } from '@/lib/formula/issue-levels';
import { cn } from '@/lib/utils';

// Each level has its own colour and its own shape, so they read apart without relying on colour:
// a solid dot for broken, a triangle for unresolved, an open circle for a heads-up.
export const ISSUE_LEVELS: Record<FormulaIssueLevel, { glyph: string; text: string; label: string }> = {
  broken: { glyph: '●', text: 'text-danger', label: 'Error' },
  unresolved: { glyph: '▲', text: 'text-draft', label: 'Needs attention' },
  'heads-up': { glyph: '○', text: 'text-ink-muted', label: 'Heads up' },
};

export function IssueMarker({ level }: { level: FormulaIssueLevel }) {
  return (
    <>
      <span aria-hidden="true">{ISSUE_LEVELS[level].glyph}</span>
      <span className="sr-only">{ISSUE_LEVELS[level].label}: </span>
    </>
  );
}

/** One line under a formula: the level's marker, then what's wrong, in the level's colour. */
export function IssueLine({ level, className, children }: { level: FormulaIssueLevel; className?: string; children: ReactNode }) {
  return (
    <p className={cn('text-xs', ISSUE_LEVELS[level].text, className)}>
      <IssueMarker level={level} /> {children}
    </p>
  );
}
