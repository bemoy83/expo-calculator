import * as React from 'react';

/** Green dot + LIVE + context eyebrow at the top of every live pane. */
export interface LiveLabelProps {
  label?: string;
  /** e.g. "IN THE QUOTE", "AS STAFF SEE IT", "TEST RUN", "RESULT" */
  context?: string;
}

export declare function LiveLabel(props: LiveLabelProps): React.JSX.Element;
