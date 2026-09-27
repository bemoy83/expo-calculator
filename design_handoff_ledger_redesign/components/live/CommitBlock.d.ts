import * as React from 'react';

/** The inverted ink block — one per screen — holding the money total on an accent pill and the committing action. */
export interface CommitBlockProps {
  /** stack: receipt / run view pane · row: resume card (3b) · compact: pinned quick-view footer (6b) */
  layout?: 'stack' | 'row' | 'compact';
  /** row only */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  meta?: React.ReactNode;
  label?: React.ReactNode;
  amount: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** e.g. "Adds a line to Stand B12 — Norway Expo" */
  note?: React.ReactNode;
}

export declare function CommitBlock(props: CommitBlockProps): React.JSX.Element;
