import { foldName, isNameChar } from './identifiers';

// What a formula editor offers as you type a name: a suggestion's shape, where the name under the
// caret starts and ends, and the ranking of the candidates for it.

export interface AutocompleteSuggestion {
  name: string;
  displayName: string;
  type: 'field' | 'material' | 'property' | 'function' | 'constant' | 'labor' | 'laborProperty';
  description?: string;
  functionSignature?: string; // For user-defined functions: parameter names
  /** Set for something stored elsewhere that inserting also adds (a parameter); says which one */
  storedKey?: string;
}

export interface WordInfo {
  word: string;
  start: number;
  end: number;
  hasDot: boolean;
  baseWord: string;
}

export function getWordAtCursor(formulaText: string, cursorPos: number): WordInfo {
  if (cursorPos < 0 || cursorPos > formulaText.length) {
    return { word: '', start: cursorPos, end: cursorPos, hasDot: false, baseWord: '' };
  }

  // Find the start of the current word
  let start = cursorPos;
  while (start > 0 && (isNameChar(formulaText[start - 1]) || formulaText[start - 1] === '.')) {
    start--;
  }

  // Find the end of the current word
  let end = cursorPos;
  while (end < formulaText.length && (isNameChar(formulaText[end]) || formulaText[end] === '.')) {
    end++;
  }

  const word = formulaText.substring(start, end);
  const hasDot = word.includes('.');

  // If dot notation, extract base word (before dot)
  let baseWord = word;
  if (hasDot) {
    const dotIndex = word.lastIndexOf('.');
    baseWord = word.substring(0, dotIndex);
  }

  return { word, start, end, hasDot, baseWord };
}

/** Suggestions for what's being typed, in priority order: exact, starts with, recent, contains, functions. */
export function filterSuggestions(
  word: string,
  allSuggestions: AutocompleteSuggestion[],
  recentVariables: string[],
  hasDot: boolean,
  baseWord: string
): AutocompleteSuggestion[] {
  if (!word && !hasDot) {
    // If no word, show all suggestions (prioritize recent)
    return allSuggestions
      .sort((a, b) => {
        const aRecent = recentVariables.includes(a.name);
        const bRecent = recentVariables.includes(b.name);
        if (aRecent && !bRecent) return -1;
        if (!aRecent && bRecent) return 1;
        // Functions/constants last
        if (a.type === 'function' || a.type === 'constant') return 1;
        if (b.type === 'function' || b.type === 'constant') return -1;
        return 0;
      })
      .slice(0, 30);
  }

  const searchTerm = foldName(word);
  const exactMatches: AutocompleteSuggestion[] = [];
  const startsWithMatches: AutocompleteSuggestion[] = [];
  const containsMatches: AutocompleteSuggestion[] = [];
  const recentMatches: AutocompleteSuggestion[] = [];
  const functionMatches: AutocompleteSuggestion[] = [];

  // If dot notation, filter to only properties of the base word
  let candidates = allSuggestions;
  if (hasDot && baseWord) {
    candidates = allSuggestions.filter((s) => s.name.startsWith(`${baseWord}.`) || s.name === baseWord);
    // If we're typing after the dot, search in property names only
    if (word.includes('.')) {
      const afterDot = word.substring(word.lastIndexOf('.') + 1).toLowerCase();
      if (afterDot) {
        // Only filter if there's text after the dot
        candidates = candidates.filter((s) => {
          if (s.name === baseWord) return true;
          const propName = s.name.substring(s.name.lastIndexOf('.') + 1).toLowerCase();
          return propName.startsWith(afterDot) || propName.includes(afterDot);
        });
      }
    }
  }

  candidates.forEach((suggestion) => {
    const nameLower = foldName(suggestion.name);
    const displayLower = foldName(suggestion.displayName);
    const isRecent = recentVariables.includes(suggestion.name);
    const isFunction = suggestion.type === 'function' || suggestion.type === 'constant';

    // Exact match
    if (nameLower === searchTerm || displayLower === searchTerm) {
      exactMatches.push(suggestion);
    }
    // Starts with
    else if (nameLower.startsWith(searchTerm) || displayLower.startsWith(searchTerm)) {
      if (isRecent && !isFunction) {
        recentMatches.push(suggestion);
      } else {
        startsWithMatches.push(suggestion);
      }
    }
    // Contains (partial/fuzzy)
    else if (nameLower.includes(searchTerm) || displayLower.includes(searchTerm)) {
      if (isRecent && !isFunction) {
        recentMatches.push(suggestion);
      } else if (isFunction) {
        functionMatches.push(suggestion);
      } else {
        containsMatches.push(suggestion);
      }
    }
  });

  // Combine in priority order: exact → starts-with → recent → contains → functions
  const result = [
    ...exactMatches,
    ...startsWithMatches,
    ...recentMatches.filter((s) => !exactMatches.includes(s) && !startsWithMatches.includes(s)),
    ...containsMatches.filter((s) => !exactMatches.includes(s) && !startsWithMatches.includes(s) && !recentMatches.includes(s)),
    ...functionMatches.filter(
      (s) => !exactMatches.includes(s) && !startsWithMatches.includes(s) && !containsMatches.includes(s) && !recentMatches.includes(s)
    ),
  ];

  return result.slice(0, 30);
}
