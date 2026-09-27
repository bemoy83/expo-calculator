import React from 'react';
export function StepRow({ index, label, formula, value, unit, cost = false, note, expanded = false, onToggle, children }) {
  const grid = { display: 'grid', gridTemplateColumns: '24px 150px minmax(0,1fr) 90px', gap: 12, alignItems: 'center', padding: '12px 14px' };
  return (
    <div style={{ border: '1px solid ' + (expanded ? 'rgb(var(--accent))' : 'rgb(var(--border))'), boxShadow: expanded ? 'var(--focus-ring)' : 'none', borderRadius: 'var(--radius-row)', background: expanded ? 'rgb(var(--surface))' : 'transparent', overflow: 'hidden', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'rgb(var(--ink))' }}>
      <div onClick={onToggle} style={{ ...grid, cursor: onToggle ? 'pointer' : 'default' }}>
        <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 12, color: expanded ? 'rgb(var(--accent))' : 'rgb(var(--ink-faint))', fontWeight: expanded ? 600 : 400 }}>{index}</span>
        <span style={{ fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
          {label}
          {cost && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', padding: '2px 6px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'rgb(var(--ink))' }}>COST</span>}
        </span>
        <span style={{ fontFamily: expanded && note ? 'var(--font-ui)' : 'var(--font-numeric)', fontSize: expanded && note ? 12 : 13, color: 'rgb(var(--ink-muted))', minWidth: 0 }}>{expanded && note ? note : formula}</span>
        <span style={{ textAlign: 'right', fontFamily: 'var(--font-numeric)', fontWeight: cost ? 600 : 400 }}>{value}{unit && <span style={{ color: 'rgb(var(--ink-faint))' }}> {unit}</span>}</span>
      </div>
      {expanded && <div style={{ padding: '2px 14px 16px 50px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
    </div>
  );
}