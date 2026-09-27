import * as React from 'react';

/** Label (+ mono unit) wrapper for an Input/Select/Segmented, with hint or error line; span for grid columns. */
export interface FieldProps {
  label: React.ReactNode;
  /** Unit after the label in mono ink-faint: m, cm, % */
  unit?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Grid columns to span inside a repeat(3) field grid */
  span?: number;
  children: React.ReactNode;
}

export declare function Field(props: FieldProps): React.JSX.Element;
