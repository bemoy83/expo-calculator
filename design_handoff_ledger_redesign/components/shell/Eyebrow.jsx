import React from 'react';
export function Eyebrow({ children, tone = 'faint', tracking = 'section', style }) {
  const color = tone === 'live' ? 'rgb(var(--committed))' : tone === 'ink' ? 'rgb(var(--ink))' : 'rgb(var(--ink-faint))';
  return (
    <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 12, letterSpacing: tracking === 'meta' ? 'var(--tracking-meta)' : 'var(--tracking-eyebrow)', textTransform: 'uppercase', color, fontWeight: tone === 'live' ? 600 : 400, ...style }}>
      {children}
    </div>
  );
}