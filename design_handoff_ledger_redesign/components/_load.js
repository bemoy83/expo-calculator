// Card-only loader: transpiles sibling .jsx components in the browser (the generated bundle replaces this in consumers).
window.loadDS = async function (paths) {
  const DS = window.DS || (window.DS = {});
  for (const p of paths) {
    let src = await (await fetch(p)).text();
    const names = [];
    src = src
      .replace(/^import .*$/gm, '')
      .replace(/export (function|const) (\w+)/g, (_, kind, name) => { names.push(name); return kind + ' ' + name; });
    const code = Babel.transform(src, { presets: ['react'] }).code;
    const prior = Object.keys(DS).filter((k) => !names.includes(k));
    new Function('React', 'DS', 'const {' + prior.join(',') + '} = DS;\n' + code + '\n' + names.map((n) => 'DS.' + n + ' = ' + n + ';').join('\n'))(React, DS);
  }
  return DS;
};
