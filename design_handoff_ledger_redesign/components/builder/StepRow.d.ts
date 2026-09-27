import * as React from 'react';

/** Builder step row: index, label (+ COST badge), formula preview, value; expanded state shows accent border and holds FormulaWell + option chips. */
export interface StepRowProps {
  index: number;
  label: React.ReactNode;
  /** Collapsed preview, usually <FormulaText/> */
  formula?: React.ReactNode;
  value?: React.ReactNode;
  unit?: string;
  /** Part's cost step */
  cost?: boolean;
  /** Replaces the formula column while expanded, e.g. "Shown to staff" */
  note?: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  /** Expanded body */
  children?: React.ReactNode;
}

export declare function StepRow(props: StepRowProps): React.JSX.Element;
