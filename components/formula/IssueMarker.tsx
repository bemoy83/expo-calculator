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

/**
 * Heads-ups that are also pinned to the text (a dotted underline with the message on hover). Where
 * there's a pointer they're one quiet line, the messages kept for screen readers; on touch, where
 * nothing hovers, each is written out.
 */
export function PinnedNotes({ messages, className }: { messages: string[]; className?: string }) {
  if (messages.length === 0) return null;
  return (
    <>
      {messages.map((message) => (
        <IssueLine key={message} level="heads-up" className={cn('[@media(hover:hover)]:sr-only', className)}>
          {message}
        </IssueLine>
      ))}
      <p aria-hidden="true" className={cn('hidden text-xs text-ink-muted [@media(hover:hover)]:block', className)}>
        <span>{ISSUE_LEVELS['heads-up'].glyph}</span> {messages.length === 1 ? '1 note' : `${messages.length} notes`} · hover the dotted underline
      </p>
    </>
  );
}
