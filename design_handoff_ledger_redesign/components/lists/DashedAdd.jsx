import React from 'react';
export function DashedAdd({ children, onClick, radius = 'row' }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width: '100%', padding: 11, border: '1px dashed rgb(var(--border-strong))', borderRadius: radius === 'lg' ? 'var(--radius-lg)' : 'var(--radius-row)', background: hover ? 'var(--surface-hover)' : 'transparent', color: hover ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
      {children}
    </button>
  );
}