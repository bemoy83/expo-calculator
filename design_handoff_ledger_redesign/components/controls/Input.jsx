import React from 'react';
const H = { compact: 38, md: 42, large: 46 };
export function Input({ size = 'md', numeric = true, invalid = false, style, onFocus, onBlur, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'rgb(var(--danger))' : focus ? 'rgb(var(--accent))' : 'rgb(var(--border-strong))';
  return (
    <input onFocus={(e) => { setFocus(true); onFocus && onFocus(e); }} onBlur={(e) => { setFocus(false); onBlur && onBlur(e); }}
      style={{ height: H[size], width: '100%', boxSizing: 'border-box', padding: '0 12px', borderRadius: 'var(--radius-md)', border: '1px solid ' + border, boxShadow: focus ? 'var(--focus-ring)' : 'none', background: 'rgb(var(--sunken))', color: 'rgb(var(--ink))', fontFamily: numeric ? 'var(--font-numeric)' : 'var(--font-ui)', fontSize: size === 'large' ? 16 : size === 'compact' ? 14 : 15, outline: 'none', caretColor: 'rgb(var(--accent))', ...style }}
      {...rest} />
  );
}