/** The smallest single change turning `from` into `to`, so a rename in the middle keeps the caret where it was. */
export function minimalChange(from: string, to: string) {
  let start = 0;
  const max = Math.min(from.length, to.length);
  while (start < max && from[start] === to[start]) start += 1;
  let endFrom = from.length;
  let endTo = to.length;
  while (endFrom > start && endTo > start && from[endFrom - 1] === to[endTo - 1]) {
    endFrom -= 1;
    endTo -= 1;
  }
  return { from: start, to: endFrom, insert: to.slice(start, endTo) };
}
