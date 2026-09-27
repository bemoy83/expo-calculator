import React from 'react';
const VARIANTS = {
  accent: { background: 'rgb(var(--accent))', color: 'rgb(var(--accent-ink))', borderColor: 'transparent' },
  primary: { background: 'rgb(var(--action-solid))', color: 'rgb(var(--on-accent))', borderColor: 'transparent' },
  secondary: { background: 'transparent', color: 'rgb(var(--ink))', borderColor: 'rgb(var(--border-strong))' },
  ghost: { background: 'transparent', color: 'rgb(var(--ink-muted))', borderColor: 'transparent' },
  danger: { background: 'transparent', color: 'rgb(var(--danger))', borderColor: 'transparent' },
  inverse: { background: 'rgb(var(--on-inverse))', color: 'rgb(var(--inverse))', borderColor: 'transparent' },
};
const HOVER = {
  accent: { opacity: 0.9 }, primary: { opacity: 0.85 }, inverse: { opacity: 0.9 },
  secondary: { background: 'var(--surface-hover)' }, ghost: { color: 'rgb(var(--ink))' }, danger: { background: 'rgb(var(--danger-bg))' },
};
const SIZES = { sm: { height: 32, padding: '0 12px', fontSize: 12 }, md: { height: 36, padding: '0 14px', fontSize: 13 }, lg: { height: 44, padding: '0 18px', fontSize: 14 } };
export function Button({ variant = 'primary', size = 'md', block = false, icon, disabled, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const v = disabled ? { background: 'rgb(var(--sunken))', color: 'rgb(var(--ink-faint))', borderColor: 'transparent' } : VARIANTS[variant];
  return (
    <button type="button" disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid', borderRadius: block ? 'var(--radius-row)' : 'var(--radius-md)', fontFamily: 'var(--font-ui)', fontWeight: 600, whiteSpace: 'nowrap', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background var(--dur) var(--ease), opacity var(--dur) var(--ease), color var(--dur) var(--ease)', ...SIZES[size], ...(block ? { width: '100%', height: 46 } : null), ...v, ...(hover && !disabled ? HOVER[variant] : null), ...style }}
      {...rest}>
      {icon}{children}
    </button>
  );
}