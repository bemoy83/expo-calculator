import * as React from 'react';

/** Left-rail list item: optional 2-digit index badge, title/subtitle, right value; selected = surface + strong border, accent badge. */
export interface RailRowProps {
  index?: number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned mono value (line cost, count) */
  value?: React.ReactNode;
  selected?: boolean;
  /** error shows a red dot (and — when no value) */
  status?: 'error';
  onClick?: () => void;
}

export declare function RailRow(props: RailRowProps): React.JSX.Element;
