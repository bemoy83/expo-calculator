import * as React from 'react';

/** Result line: label, dotted leader, mono value + faint unit; highlight (accent-soft) or total variant. */
export interface ResultRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  /** accent-soft background, used for the step being edited */
  highlight?: boolean;
  /** Bold label, no leader, 26px mono value (Line total) */
  total?: boolean;
  leader?: boolean;
  /** Mono sub-line under the label (receipt: "30.8 m · 4 × 2.5 m") */
  detail?: React.ReactNode;
}

export declare function ResultRow(props: ResultRowProps): React.JSX.Element;
