import React from 'react';
const STATUS = { ok: 'rgb(var(--committed))', error: 'rgb(var(--danger))' };
export function PageHeader({ eyebrow, title, description, status, editing = false, actions, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: children ? '22px var(--page-pad-x) 0' : 'var(--page-header-pad)', borderBottom: '1px solid rgb(var(--border))', fontFamily: 'var(--font-ui)', color: 'rgb(var(--ink))' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 12, color: 'rgb(var(--ink-faint))', letterSpacing: 'var(--tracking-meta)', textTransform: 'uppercase' }}>{eyebrow}</div>}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 'var(--text-display)', fontWeight: 700, letterSpacing: 'var(--tracking-display)', lineHeight: 1.15, borderBottom: editing ? '1px solid rgb(var(--border-strong))' : 0 }}>{title}</h1>
          {status && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: STATUS[status.tone] }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS[status.tone] }}></span>{status.label}
            </span>
          )}
        </div>
        {description && <div style={{ fontSize: 14, color: 'rgb(var(--ink-muted))', marginTop: 4 }}>{description}</div>}
        {children && <div style={{ marginTop: 14 }}>{children}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: children ? 14 : 0 }}>{actions}</div>}
    </div>
  );
}