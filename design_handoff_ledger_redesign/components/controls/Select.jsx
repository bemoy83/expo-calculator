import React from 'react';
const H = { compact: 38, md: 42, large: 46 };
export function Select({ size = 'md', options = [], value, onChange, meta, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ position: 'relative', ...style }}>
      <select value={value} onChange={(e) => onChange && onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ appearance: 'none', height: H[size], width: '100%', padding: '0 34px 0 12px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (focus ? 'rgb(var(--accent))' : 'rgb(var(--border-strong))'), boxShadow: focus ? 'var(--focus-ring)' : 'none', background: 'rgb(var(--sunken))', color: 'rgb(var(--ink))', fontFamily: 'var(--font-ui)', fontSize: size === 'compact' ? 14 : 15, outline: 'none', cursor: 'pointer' }}
        {...rest}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}{o.meta ? ' · ' + o.meta : ''}</option>)}
      </select>
      <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(var(--ink-faint))', pointerEvents: 'none', fontSize: 12 }}>▾</span>
    </div>
  );
}