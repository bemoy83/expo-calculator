import * as React from 'react';

/** Segmented control on a sunken track: Parts/Layout switch, dropdown-as-buttons inputs (cc 40/60), inspector options. */
export interface SegmentedProps {
  options: { value: string; label: React.ReactNode }[];
  value: string;
  onChange?: (value: string) => void;
  /** Stretch segments to fill the width */
  block?: boolean;
  /** large = 46px staff input (selected segment gets a border) */
  size?: 'compact' | 'md' | 'large';
  mono?: boolean;
}

export declare function Segmented(props: SegmentedProps): React.JSX.Element;
