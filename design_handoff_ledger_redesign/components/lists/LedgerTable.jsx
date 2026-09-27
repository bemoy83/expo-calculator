import React from 'react';
export const LedgerContext = React.createContext({ template: '1fr', aligns: [] });
export function LedgerTable({ columns = [], children }) {
  const template = columns.map((c) => c.width || 'minmax(0,1fr)').join(' ');
  const aligns = columns.map((c) => c.align || 'left');
  return (
    <LedgerContext.Provider value={{ template, aligns }}>
      <div role="table" style={{ display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-ui)', color: 'rgb(var(--ink))' }}>
        <div role="row" style={{ display: 'grid', gridTemplateColumns: template, gap: 16, padding: '0 14px 10px', borderBottom: '1px solid rgb(var(--border))', fontFamily: 'var(--font-numeric)', fontSize: 12, letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', color: 'rgb(var(--ink-faint))' }}>
          {columns.map((c, i) => <span key={i} role="columnheader" style={{ textAlign: aligns[i] }}>{c.label}</span>)}
        </div>
        {children}
      </div>
    </LedgerContext.Provider>
  );
}