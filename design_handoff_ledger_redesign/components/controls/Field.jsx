import React from 'react';
export function Field({ label, unit, hint, error, span = 1, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span > 1 ? 'span ' + span : undefined, minWidth: 0, fontFamily: 'var(--font-ui)' }}>
      <span style={{ fontSize: 12, color: 'rgb(var(--ink-muted))' }}>
        {label}{unit && <span style={{ fontFamily: 'var(--font-numeric)', color: 'rgb(var(--ink-faint))' }}> {unit}</span>}
      </span>
      {children}
      {(error || hint) && <span style={{ fontSize: 12, color: error ? 'rgb(var(--danger))' : 'rgb(var(--ink-faint))' }}>{error || hint}</span>}
    </label>
  );
}