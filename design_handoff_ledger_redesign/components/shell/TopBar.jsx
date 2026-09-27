import React from 'react';
export function TopBar({ tabs = [], active, onSelect, brand = 'Cost Estimator', right }) {
  return (
    <div style={{ height: 'var(--app-header-h)', flex: 'none', display: 'flex', alignItems: 'center', gap: 28, padding: '0 var(--page-pad-x)', borderBottom: '1px solid rgb(var(--border))', background: 'rgb(var(--canvas))', fontFamily: 'var(--font-ui)', color: 'rgb(var(--ink))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15, letterSpacing: '-.01em' }}>
        <span style={{ width: 18, height: 18, background: 'rgb(var(--accent))', borderRadius: 'var(--radius-xs)' }}></span>{brand}
      </div>
      <nav style={{ display: 'flex', gap: 4, fontSize: 14 }}>
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} type="button" aria-current={on ? 'page' : undefined} onClick={() => onSelect && onSelect(t.id)}
              style={{ padding: '7px 12px', borderRadius: 7, border: 0, cursor: 'pointer', font: 'inherit', background: on ? 'rgb(var(--surface))' : 'transparent', color: on ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))', fontWeight: on ? 600 : 400 }}>
              {t.label}
            </button>
          );
        })}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'rgb(var(--ink-muted))' }}>{right}</div>
    </div>
  );
}