import * as React from 'react';

/** Dashed "+ Add …" affordance at the end of a list or canvas. */
export interface DashedAddProps {
  children: React.ReactNode;
  onClick?: () => void;
  /** row (10px, lists) · lg (12px, layout canvas sections) */
  radius?: 'row' | 'lg';
}

export declare function DashedAdd(props: DashedAddProps): React.JSX.Element;
