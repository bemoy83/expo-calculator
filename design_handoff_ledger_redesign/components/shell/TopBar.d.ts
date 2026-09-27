import * as React from 'react';

/** 52px app top bar: brand mark, the three top-level tabs, right slot for Settings/avatar. */
export interface TopBarProps {
  tabs: { id: string; label: string }[];
  active: string;
  onSelect?: (id: string) => void;
  brand?: string;
  right?: React.ReactNode;
}

export declare function TopBar(props: TopBarProps): React.JSX.Element;
