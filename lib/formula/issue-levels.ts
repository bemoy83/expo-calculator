// What a formula editor has to say about a formula, sorted by what it means for the formula. The
// function editor and the calculator builder's step editor share these levels:
//   broken      the formula can't be read or called as written: it can't calculate
//   unresolved  well formed, but it names something that doesn't exist yet (a parameter, an input,
//               a function): it can't calculate until that's resolved, and there's a fix for it
//   heads-up    it calculates, but something is probably not what was meant
// Broken and unresolved block; a heads-up never does. A value still missing from the form (an
// input nobody has filled in) is none of these: it's "incomplete", and each editor words it itself.
export type FormulaIssueLevel = 'broken' | 'unresolved' | 'heads-up';

export interface FormulaIssue {
  level: FormulaIssueLevel;
  message: string;
  /** For an unresolved name: the name, so it can be offered "Create" or "Reuse" */
  name?: string;
}
