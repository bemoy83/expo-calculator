import * as React from 'react';

/** Native select styled as a sunken well with ▾; options may carry a meta suffix (price/unit). */
export interface SelectProps {
  options: { value: string; label: string; meta?: string }[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'compact' | 'md' | 'large';
  style?: React.CSSProperties;
}

export declare function Select(props: SelectProps): React.JSX.Element;
