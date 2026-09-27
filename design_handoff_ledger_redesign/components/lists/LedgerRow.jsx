import React from 'react';
import { LedgerContext } from './LedgerTable.jsx';
export function LedgerRow({ cells = [], selected = false, onClick, hoverCell }) {
  const { template, aligns } = React.useContext(LedgerContext);
  const [hover, setHover] = React.useState(false);
  return (
    <div role="row" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: template, gap: 16, alignItems: 'center', padding: 14, borderBottom: '1px solid rgb(var(--border))', borderRadius: selected || hover ? 'var(--radius-md)' : 0, background: selected || hover ? 'rgb(var(--surface))' : 'transparent', cursor: onClick ? 'pointer' : 'default', fontSize: 14 }}>
      {cells.map((c, i) => {
        const last = i === cells.length - 1;
        const content = last && hoverCell && (hover || selected) ? hoverCell : c;
        return <span key={i} role="cell" style={{ textAlign: aligns[i], minWidth: 0 }}>{content}</span>;
      })}
    </div>
  );
}