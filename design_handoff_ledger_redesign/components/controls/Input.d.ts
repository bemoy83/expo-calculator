import * as React from 'react';

/** Sunken text/number input with accent focus halo; mono by default for numbers. */
export interface InputProps {
  /** compact 38 (side panels) · md 42 (editors) · large 46 (staff run view) */
  size?: 'compact' | 'md' | 'large';
  /** Mono font (default true) — set false for names/descriptions */
  numeric?: boolean;
  invalid?: boolean;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  style?: React.CSSProperties;
}

export declare function Input(props: InputProps): React.JSX.Element;
