import React from 'react';
const KIND = { input: '--token-input', result: '--token-result', function: '--token-function', property: '--token-property' };
export function FormulaText({ expression = '', names = {}, block = false }) {
  const parts = [];
  const re = /([A-Za-z_\u00C0-\u017F][\w\u00C0-\u017F]*)|(\.[A-Za-z_]\w*)|([^A-Za-z_\u00C0-\u017F.]+|\.)/g;
  let m, i = 0;
  while ((m = re.exec(expression))) {
    if (m[1] && names[m[1]]) parts.push(<span key={i++} style={{ color: 'rgb(var(' + KIND[names[m[1]]] + '))' }}>{m[1]}</span>);
    else if (m[2]) parts.push(<span key={i++} style={{ color: 'rgb(var(--token-property))' }}>{m[2]}</span>);
    else parts.push(<React.Fragment key={i++}>{m[0]}</React.Fragment>);
  }
  return <code style={{ display: block ? 'block' : 'inline', fontFamily: 'var(--font-numeric)', fontSize: 'inherit', color: 'rgb(var(--ink))', background: 'none', whiteSpace: 'pre-wrap' }}>{parts}</code>;
}