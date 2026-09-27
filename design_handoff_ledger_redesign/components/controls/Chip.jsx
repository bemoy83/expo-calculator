import React from 'react';
export function Chip({ selected = false, count, onClick, children }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      style={{ padding: '5px 11px', borderRadius: 'var(--radius-pill)', border: 0, cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--font-ui)', fontSize: 13, background: selected ? 'rgb(var(--inverse))' : 'rgb(var(--sunken))', color: selected ? 'rgb(var(--on-inverse))' : 'rgb(var(--ink-muted))', fontWeight: selected ? 600 : 400 }}>
      {children}{count != null ? ' ' + count : ''}
    </button>
  );
}