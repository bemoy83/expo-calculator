import * as React from 'react';

/** Button with six variants: accent for page-primary, primary (ink) for commits, secondary, ghost, danger, inverse (inside CommitBlock). */
export interface ButtonProps {
  /** accent: "+ New …", Save · primary: ink, commit actions · secondary: outlined · ghost: quiet text · danger: red text · inverse: on an ink block */
  variant?: 'accent' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
  /** sm 32 · md 36 · lg 44 */
  size?: 'sm' | 'md' | 'lg';
  /** Full-width 46px CTA with 10px radius */
  block?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Button(props: ButtonProps): React.JSX.Element;
