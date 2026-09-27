import React from 'react';
export function FormulaWell({ children, focused = false }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgb(var(--sunken))', border: '1px solid ' + (focused ? 'rgb(var(--accent))' : 'rgb(var(--border-strong))'), boxShadow: focused ? 'var(--focus-ring)' : 'none', fontFamily: 'var(--font-numeric)', fontSize: 15, lineHeight: 1.6, color: 'rgb(var(--ink))' }}>
      {children}
    </div>
  );
}