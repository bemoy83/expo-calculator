import React from 'react';
export function Toggle({ checked = false, onChange, label, meta, framed = true }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange && onChange(!checked)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: framed ? '100%' : 'auto', padding: framed ? '12px 14px' : 0, border: framed ? '1px solid rgb(var(--border-strong))' : 0, borderRadius: 'var(--radius-row)', background: 'transparent', color: 'rgb(var(--ink))', fontFamily: 'var(--font-ui)', fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ width: 38, height: 22, borderRadius: 'var(--radius-pill)', background: checked ? 'rgb(var(--accent))' : 'rgb(var(--border-strong))', position: 'relative', flex: 'none', transition: 'background var(--dur) var(--ease)' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: checked ? 'rgb(var(--accent-ink))' : 'rgb(var(--surface))', transition: 'left var(--dur) var(--ease)' }}></span>
      </span>
      {label}
      {meta && <span style={{ marginLeft: 'auto', fontSize: 13, color: 'rgb(var(--ink-muted))' }}>{meta}</span>}
    </button>
  );
}