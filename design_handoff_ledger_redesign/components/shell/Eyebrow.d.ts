import * as React from 'react';

/** Mono uppercase section/page label (LINES, RESULTS, QUOTE Q-0142 · EDITED …). */
export interface EyebrowProps {
  children: React.ReactNode;
  /** faint (default) · live (green, bold) · ink */
  tone?: 'faint' | 'live' | 'ink';
  /** section = +0.06em (pane labels) · meta = +0.04em (page eyebrow) */
  tracking?: 'section' | 'meta';
  style?: React.CSSProperties;
}

export declare function Eyebrow(props: EyebrowProps): React.JSX.Element;
