import React from 'react';
export function ResultRow({ label, value, unit, highlight = false, total = false, leader = true, detail }) {
  if (total) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'var(--font-ui)', color: 'rgb(var(--ink))' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span><span style={{ flex: 1 }}></span>
        <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--num-medium)', fontWeight: 600, letterSpacing: '-.02em' }}>{value}</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'var(--font-ui)', fontSize: 15, color: 'rgb(var(--ink))', ...(highlight ? { padding: '8px 10px', margin: '0 -10px', borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)' } : null) }}>
      <span style={{ minWidth: 0 }}>{label}{detail && <span style={{ display: 'block', fontFamily: 'var(--font-numeric)', fontSize: 12, color: 'rgb(var(--ink-faint))', marginTop: 3 }}>{detail}</span>}</span>
      <span style={{ flex: 1, borderBottom: leader && !highlight ? '1px dotted rgb(var(--border-strong))' : 0 }}></span>
      <span style={{ fontFamily: 'var(--font-numeric)', whiteSpace: 'nowrap' }}>{value}{unit && <span style={{ color: 'rgb(var(--ink-faint))' }}> {unit}</span>}</span>
    </div>
  );
}