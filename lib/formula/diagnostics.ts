import type { FormulaDiagnostic } from './issue-levels';

// The one place that turns what a formula editor host knows (where the syntax breaks, which names
// nothing matches, problems that carry their own range) into the diagnostics the editor underlines.
// Both hosts, a function's formula and a calculator step's, describe their problems the same way.

/** A syntax message without the parser's "(character N)", since the underline already shows where. */
export function plainSyntaxMessage(message: string): string {
  return message.replace(/\s*\(character \d+\)$/, '');
}

export interface DiagnosticSources {
  /** Where the syntax breaks and what to say about it; nothing is drawn unless both are known */
  syntax?: { range: { start: number; end: number } | null | undefined; message: string | undefined };
  /** Every use of a name nothing matches; only those of `names` (settled as unknown) are drawn, each with its fixes */
  unknownNames?: {
    ranges: Array<{ name: string; from: number; to: number }>;
    names: string[];
    message: (name: string) => string;
    fixes: (name: string) => FormulaDiagnostic['fixes'];
  };
  /** Problems that already carry a range and a level */
  problems?: FormulaDiagnostic[];
}

export function collectDiagnostics({ syntax, unknownNames, problems = [] }: DiagnosticSources): FormulaDiagnostic[] {
  const diagnostics: FormulaDiagnostic[] = [];
  const message = syntax?.message ? plainSyntaxMessage(syntax.message) : '';
  if (syntax?.range && message) diagnostics.push({ from: syntax.range.start, to: syntax.range.end, level: 'broken', message });
  for (const range of unknownNames?.ranges ?? []) {
    if (!unknownNames!.names.includes(range.name)) continue;
    diagnostics.push({
      from: range.from,
      to: range.to,
      level: 'unresolved',
      message: unknownNames!.message(range.name),
      fixes: unknownNames!.fixes(range.name),
    });
  }
  diagnostics.push(...problems);
  return diagnostics;
}
