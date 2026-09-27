import React from 'react';
export function Segmented({ options = [], value, onChange, block = false, size = 'md', mono = false }) {
  const h = size === 'large' ? 46 : size === 'compact' ? 32 : 36;
  return (
    <div role="radiogroup" style={{ display: block ? 'flex' : 'inline-flex', height: h, boxSizing: 'border-box', padding: 3, gap: 3, borderRadius: 'var(--radius-md)', background: 'rgb(var(--sunken))', fontFamily: mono ? 'var(--font-numeric)' : 'var(--font-ui)', fontSize: 13 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} role="radio" aria-checked={on} type="button" onClick={() => onChange && onChange(o.value)}
            style={{ flex: block ? 1 : 'none', padding: '0 14px', borderRadius: 'var(--radius-sm)', border: on && size === 'large' ? '1px solid rgb(var(--border-strong))' : '1px solid transparent', background: on ? 'rgb(var(--surface))' : 'transparent', color: on ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))', fontWeight: on ? 600 : 400, cursor: 'pointer', font: 'inherit' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}