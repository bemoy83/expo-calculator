import * as React from 'react';

/** Renders a formula with names coloured by kind (input teal, step/result purple, function pink, .property coral). */
export interface FormulaTextProps {
  expression: string;
  /** name → kind; unknown names render as ink */
  names?: Record<string, 'input' | 'result' | 'function' | 'property'>;
  block?: boolean;
}

export declare function FormulaText(props: FormulaTextProps): React.JSX.Element;
