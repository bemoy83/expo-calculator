import React from 'react';
export function RailRow({ index, title, subtitle, value, selected = false, status, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} aria-current={selected || undefined}
      style={{ display: 'flex', gap: 10, width: '100%', padding: '12px 10px', borderRadius: 'var(--radius-row)', border: '1px solid ' + (selected ? 'rgb(var(--border-strong))' : 'transparent'), background: selected ? 'rgb(var(--surface))' : hover ? 'var(--surface-hover)' : 'transparent', color: 'rgb(var(--ink))', fontFamily: 'var(--font-ui)', textAlign: 'left', cursor: 'pointer' }}>
      {index != null && (
        <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 12, padding: '2px 5px', borderRadius: 5, height: 'fit-content', background: selected ? 'rgb(var(--accent))' : 'transparent', color: selected ? 'rgb(var(--accent-ink))' : 'rgb(var(--ink-faint))', fontWeight: selected ? 600 : 400 }}>{String(index).padStart(2, '0')}</span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{title}</span>
        {subtitle && <span style={{ display: 'block', fontSize: 12, color: 'rgb(var(--ink-muted))', marginTop: 2 }}>{subtitle}</span>}
      </span>
      {(value != null || status === 'error') && (
        <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-numeric)', fontSize: 13, color: status === 'error' ? 'rgb(var(--danger))' : selected ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))' }}>
          {status === 'error' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--danger))' }}></span>}
          {value != null ? value : '—'}
        </span>
      )}
    </button>
  );
}