import React from 'react';
function Pill({ amount, size }) {
  return <span style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-numeric)', fontSize: size, fontWeight: 600, letterSpacing: 'var(--tracking-num)', lineHeight: 1.15, padding: size > 30 ? '2px 12px' : '1px 10px', borderRadius: size > 30 ? 'var(--radius-row)' : 'var(--radius-md)', background: 'rgb(var(--accent))', color: 'rgb(var(--accent-ink))', whiteSpace: 'nowrap' }}>{amount}</span>;
}
function Cta({ label, onAction, block }) {
  return <button type="button" onClick={onAction} style={{ padding: block ? 12 : '12px 20px', width: block ? '100%' : 'auto', borderRadius: 'var(--radius-row)', border: 0, background: 'rgb(var(--on-inverse))', color: 'rgb(var(--inverse))', fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>;
}
export function CommitBlock({ layout = 'stack', eyebrow, title, meta, label = 'Total', amount, actionLabel, onAction, note }) {
  const base = { background: 'rgb(var(--inverse))', color: 'rgb(var(--on-inverse))', fontFamily: 'var(--font-ui)' };
  if (layout === 'row') {
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', gap: 24, padding: '18px 22px', borderRadius: 'var(--radius-inverse)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 12, letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', opacity: 0.6 }}>{eyebrow}</div>}
          {title && <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.015em', marginTop: 8 }}>{title}</div>}
          {meta && <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 12, opacity: 0.6, marginTop: 4 }}>{meta}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}><span style={{ fontSize: 14, opacity: 0.7 }}>{label}</span><Pill amount={amount} size={32} /></div>
        {actionLabel && <Cta label={actionLabel} onAction={onAction} />}
      </div>
    );
  }
  if (layout === 'compact') {
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px 12px 16px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span><Pill amount={amount} size={26} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {actionLabel && <Cta label={actionLabel} onAction={onAction} />}
          {note && <span style={{ fontSize: 11, opacity: 0.6 }}>{note}</span>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 'var(--radius-inverse)' }}>
      <span style={{ fontSize: 13, opacity: 0.7 }}>{label}</span>
      <Pill amount={amount} size={40} />
      {actionLabel && <div style={{ marginTop: 4 }}><Cta label={actionLabel} onAction={onAction} block /></div>}
      {note && <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center' }}>{note}</div>}
    </div>
  );
}