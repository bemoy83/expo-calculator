import * as React from 'react';

/** Boolean input as a switch, optionally framed as a full-width row with a meta note on the right. */
export interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  meta?: React.ReactNode;
  /** Bordered full-width row (default) vs bare switch */
  framed?: boolean;
}

export declare function Toggle(props: ToggleProps): React.JSX.Element;
