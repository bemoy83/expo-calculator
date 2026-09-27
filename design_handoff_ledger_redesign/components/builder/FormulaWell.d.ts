import * as React from 'react';

/** Sunken mono well for editing/showing a formula; focused = accent border + halo. */
export interface FormulaWellProps {
  children: React.ReactNode;
  focused?: boolean;
}

export declare function FormulaWell(props: FormulaWellProps): React.JSX.Element;
