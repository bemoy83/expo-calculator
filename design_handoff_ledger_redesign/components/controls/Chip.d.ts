import * as React from 'react';

/** Filter pill: sunken when off, inverted ink when on; optional count. */
export interface ChipProps {
  selected?: boolean;
  count?: number;
  onClick?: () => void;
  children: React.ReactNode;
}

export declare function Chip(props: ChipProps): React.JSX.Element;
