import * as React from 'react';

/** Ledger table shell: mono uppercase header row + grid template shared with LedgerRow children. */
export interface LedgerTableProps {
  columns: { label: React.ReactNode; align?: 'left' | 'right'; /** CSS grid track, default minmax(0,1fr) */ width?: string }[];
  children: React.ReactNode;
}

export declare function LedgerTable(props: LedgerTableProps): React.JSX.Element;
