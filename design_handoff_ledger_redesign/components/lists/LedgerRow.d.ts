import * as React from 'react';

/** One ledger row; hover/selected lift to surface; hoverCell swaps the last cell (e.g. ⋯ → Delete) on hover. */
export interface LedgerRowProps {
  cells: React.ReactNode[];
  selected?: boolean;
  onClick?: () => void;
  /** Replaces the last cell while hovered/selected */
  hoverCell?: React.ReactNode;
}

export declare function LedgerRow(props: LedgerRowProps): React.JSX.Element;
