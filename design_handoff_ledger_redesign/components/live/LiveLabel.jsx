import React from 'react';
export function LiveLabel({ label = 'LIVE', context }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-numeric)', fontSize: 12, letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgb(var(--committed))' }}></span>
      <span style={{ color: 'rgb(var(--committed))', fontWeight: 600 }}>{label}</span>
      {context && <span style={{ color: 'rgb(var(--ink-faint))' }}>· {context}</span>}
    </div>
  );
}