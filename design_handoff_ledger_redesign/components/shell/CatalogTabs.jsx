import React from 'react';
export function CatalogTabs({ items = [], active, onSelect }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 22, fontSize: 14, fontFamily: 'var(--font-ui)' }}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button key={it.id} role="tab" aria-selected={on} type="button" onClick={() => onSelect && onSelect(it.id)}
            style={{ padding: '0 0 11px', border: 0, borderBottom: on ? '2px solid rgb(var(--accent))' : '2px solid transparent', background: 'none', cursor: 'pointer', font: 'inherit', fontWeight: on ? 600 : 400, color: on ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))', display: 'flex', gap: 6, alignItems: 'baseline' }}>
            {it.label}{it.count != null && <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 12, color: 'rgb(var(--ink-faint))', fontWeight: 400 }}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}