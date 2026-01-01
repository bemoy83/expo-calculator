import { useState, useEffect, useCallback, useRef } from 'react';

interface AutocompleteSuggestion {
  name: string;
  displayName: string;
  type: 'field' | 'material' | 'property' | 'function' | 'constant';
  description?: string;
}

interface WordInfo {
  word: string;
  start: number;
  end: number;
  hasDot: boolean;
  baseWord: string;
}

interface UseFormulaAutocompleteProps {
  formula: string;
  formulaTextareaRef: React.RefObject<HTMLTextAreaElement>;
  collectAutocompleteCandidates: AutocompleteSuggestion[];
  onFormulaChange: (formula: string) => void;
}

export function useFormulaAutocomplete({
  formula,
  formulaTextareaRef,
  collectAutocompleteCandidates,
  onFormulaChange,
}: UseFormulaAutocompleteProps) {
  const [recentlyUsedVariables, setRecentlyUsedVariables] = useState<string[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [currentWord, setCurrentWord] = useState<WordInfo>({ word: '', start: 0, end: 0, hasDot: false, baseWord: '' });

  // Helper function to escape regex special characters
  const escapeRegex = useCallback((str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }, []);

  // Get word at cursor position, handling dot notation
  const getWordAtCursor = useCallback((formulaText: string, cursorPos: number): WordInfo => {
    if (cursorPos < 0 || cursorPos > formulaText.length) {
      return { word: '', start: cursorPos, end: cursorPos, hasDot: false, baseWord: '' };
    }

    // Find the start of the current word
    let start = cursorPos;
    while (start > 0 && /[\w.]/.test(formulaText[start - 1])) {
      start--;
    }

    // Find the end of the current word
    let end = cursorPos;
    while (end < formulaText.length && /[\w.]/.test(formulaText[end])) {
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
  }, []);

  // Filter suggestions with priority ordering
  const filterSuggestions = useCallback((
    word: string,
    allSuggestions: AutocompleteSuggestion[],
    recentVariables: string[],
    hasDot: boolean,
    baseWord: string
  ): AutocompleteSuggestion[] => {
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

    const searchTerm = word.toLowerCase();
    const exactMatches: AutocompleteSuggestion[] = [];
    const startsWithMatches: AutocompleteSuggestion[] = [];
    const containsMatches: AutocompleteSuggestion[] = [];
    const recentMatches: AutocompleteSuggestion[] = [];
    const functionMatches: AutocompleteSuggestion[] = [];

    // If dot notation, filter to only properties of the base word
    let candidates = allSuggestions;
    if (hasDot && baseWord) {
      candidates = allSuggestions.filter(s => 
        s.name.startsWith(`${baseWord}.`) || s.name === baseWord
      );
      // If we're typing after the dot, search in property names only
      if (word.includes('.')) {
        const afterDot = word.substring(word.lastIndexOf('.') + 1).toLowerCase();
        if (afterDot) { // Only filter if there's text after the dot
          candidates = candidates.filter(s => {
            if (s.name === baseWord) return true;
            const propName = s.name.substring(s.name.lastIndexOf('.') + 1).toLowerCase();
            return propName.startsWith(afterDot) || propName.includes(afterDot);
          });
        }
      }
    }

    candidates.forEach((suggestion) => {
      const nameLower = suggestion.name.toLowerCase();
      const displayLower = suggestion.displayName.toLowerCase();
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
      ...recentMatches.filter(s => !exactMatches.includes(s) && !startsWithMatches.includes(s)),
      ...containsMatches.filter(s => !exactMatches.includes(s) && !startsWithMatches.includes(s) && !recentMatches.includes(s)),
      ...functionMatches.filter(s => !exactMatches.includes(s) && !startsWithMatches.includes(s) && !containsMatches.includes(s) && !recentMatches.includes(s)),
    ];

    return result.slice(0, 30);
  }, []);

  // Insert suggestion with dot notation handling
  const insertSuggestion = useCallback((suggestion: AutocompleteSuggestion, wordInfo: WordInfo) => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) return;

    let variableToInsert = suggestion.name;
    
    // Handle dot notation: if typing "mat_plank." and selecting "width", insert just "width"
    if (wordInfo.hasDot && wordInfo.baseWord) {
      if (suggestion.name.startsWith(`${wordInfo.baseWord}.`)) {
        // Extract property name only
        variableToInsert = suggestion.name.substring(wordInfo.baseWord.length + 1);
      } else if (suggestion.name === wordInfo.baseWord) {
        // Keep the base word
        variableToInsert = wordInfo.baseWord;
      }
    }

    const before = formula.substring(0, wordInfo.start);
    const after = formula.substring(wordInfo.end);
    
    // Determine if we need spaces around the variable
    const charBefore = wordInfo.start > 0 ? formula[wordInfo.start - 1] : '';
    const needsSpaceBefore = wordInfo.start > 0 && 
      charBefore !== ' ' && 
      charBefore !== '\t' && 
      !/[+\-*/(]/.test(charBefore);
    
    const charAfter = wordInfo.end < formula.length ? formula[wordInfo.end] : '';
    const needsSpaceAfter = wordInfo.end < formula.length && 
      charAfter !== ' ' && 
      charAfter !== '\t' && 
      !/[+\-*/)]/.test(charAfter);
    
    const spaceBefore = needsSpaceBefore ? ' ' : '';
    const spaceAfter = needsSpaceAfter ? ' ' : '';
    
    // If we had dot notation and are inserting property, don't add space before
    const finalBefore = wordInfo.hasDot && variableToInsert !== wordInfo.baseWord ? '' : spaceBefore;
    
    const insertedText = `${finalBefore}${variableToInsert}${spaceAfter}`;
    const newValue = before + insertedText + after;
    const newCursorPos = wordInfo.start + insertedText.length;
    
    onFormulaChange(newValue);
    
    // Track recently used variable
    setRecentlyUsedVariables((prev) => {
      const updated = [suggestion.name, ...prev.filter(v => v !== suggestion.name)].slice(0, 15);
      return updated;
    });
    
    setIsAutocompleteOpen(false);
    setSelectedSuggestionIndex(-1);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [formula, formulaTextareaRef, onFormulaChange]);

  // Update autocomplete suggestions
  const updateAutocompleteSuggestionsFinal = useCallback(() => {
    const textarea = formulaTextareaRef.current;
    if (!textarea) {
      setIsAutocompleteOpen(false);
      return;
    }

    // Read current value directly from textarea to get the latest typed character
    const currentFormula = textarea.value;
    const cursorPos = textarea.selectionStart;
    const wordInfo = getWordAtCursor(currentFormula, cursorPos);
    
    setCurrentWord(wordInfo);

    // Only show suggestions if there's actual input (word being typed)
    // Don't show suggestions on empty focus/click
    if (!wordInfo.word && !wordInfo.hasDot) {
      setIsAutocompleteOpen(false);
      return;
    }

    // Filter suggestions
    const filtered = filterSuggestions(
      wordInfo.word,
      collectAutocompleteCandidates,
      recentlyUsedVariables,
      wordInfo.hasDot,
      wordInfo.baseWord
    );

    if (filtered.length > 0) {
      setAutocompleteSuggestions(filtered);
      setSelectedSuggestionIndex(-1);
      
      // Calculate cursor position accurately using text measurement up to cursor
      const rect = textarea.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(textarea);
      
      // Get text before cursor to measure exact cursor position
      const textBeforeCursor = currentFormula.substring(0, cursorPos);
      
      // Split to get current line and line number
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Create a temporary element to measure text width up to cursor position
      const measureDiv = document.createElement('div');
      measureDiv.style.position = 'fixed'; // Use fixed to match dropdown positioning
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.whiteSpace = 'pre-wrap';
      measureDiv.style.wordWrap = 'break-word';
      measureDiv.style.font = computedStyle.font;
      measureDiv.style.fontFamily = computedStyle.fontFamily;
      measureDiv.style.fontSize = computedStyle.fontSize;
      measureDiv.style.fontWeight = computedStyle.fontWeight;
      measureDiv.style.lineHeight = computedStyle.lineHeight;
      measureDiv.style.letterSpacing = computedStyle.letterSpacing;
      measureDiv.style.padding = computedStyle.padding;
      measureDiv.style.width = `${rect.width}px`;
      measureDiv.style.boxSizing = computedStyle.boxSizing;
      measureDiv.style.border = computedStyle.border;
      measureDiv.style.borderWidth = computedStyle.borderWidth;
      // Position at textarea location
      measureDiv.style.top = `${rect.top}px`;
      measureDiv.style.left = `${rect.left}px`;
      
      // Create a span to measure only the text up to cursor on current line
      const textSpan = document.createElement('span');
      textSpan.textContent = currentLine;
      measureDiv.appendChild(textSpan);
      
      // Create a cursor marker span
      const cursorSpan = document.createElement('span');
      cursorSpan.textContent = '|';
      measureDiv.appendChild(cursorSpan);
      
      document.body.appendChild(measureDiv);
      
      try {
        // Get the position of the cursor span (viewport coordinates)
        const cursorSpanRect = cursorSpan.getBoundingClientRect();
        
        // Position dropdown at cursor position
        const top = cursorSpanRect.bottom + 2; // Small offset below cursor
        const left = cursorSpanRect.left;
        
        // Validate positions are numbers
        if (isNaN(top) || isNaN(left) || top < 0 || left < 0) {
          throw new Error('Invalid cursor position');
        }
        
        // Use fixed positioning (viewport coordinates, no scroll offset needed)
        setAutocompletePosition({ top, left });
        setIsAutocompleteOpen(true);
      } catch (error) {
        // Fallback to simple positioning if measurement fails
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        
        // Simple fallback: position below textarea
        const top = rect.bottom + 2;
        const left = rect.left + paddingLeft;
        
        setAutocompletePosition({ top, left });
        setIsAutocompleteOpen(true);
      } finally {
        document.body.removeChild(measureDiv);
      }
    } else {
      setIsAutocompleteOpen(false);
    }
  }, [formulaTextareaRef, getWordAtCursor, filterSuggestions, collectAutocompleteCandidates, recentlyUsedVariables]);

  // Handle keyboard navigation for autocomplete
  const handleAutocompleteKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isAutocompleteOpen || autocompleteSuggestions.length === 0) {
      return false; // Let event propagate normally
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
        );
        return true;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
        );
        return true;
      
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        const index = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
        if (autocompleteSuggestions[index]) {
          insertSuggestion(autocompleteSuggestions[index], currentWord);
        }
        return true;
      
      case 'Escape':
        e.preventDefault();
        setIsAutocompleteOpen(false);
        setSelectedSuggestionIndex(-1);
        return true;
      
      case 'ArrowLeft':
      case 'ArrowRight':
        setIsAutocompleteOpen(false);
        return false; // Let navigation happen
      
      default:
        return false; // Let other keys through
    }
  }, [isAutocompleteOpen, autocompleteSuggestions, selectedSuggestionIndex, currentWord, insertSuggestion]);

  // Update autocomplete position on scroll/resize
  useEffect(() => {
    if (!isAutocompleteOpen) return;
    
    const handleScroll = () => {
      // Use requestAnimationFrame to debounce and ensure smooth updates
      requestAnimationFrame(() => {
        updateAutocompleteSuggestionsFinal();
      });
    };
    
    // Listen to scroll on window and all scrollable parents (capture phase)
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isAutocompleteOpen, updateAutocompleteSuggestionsFinal]);

  return {
    autocompleteSuggestions,
    selectedSuggestionIndex,
    isAutocompleteOpen,
    autocompletePosition,
    currentWord,
    recentlyUsedVariables,
    insertSuggestion,
    handleAutocompleteKeyDown,
    updateAutocompleteSuggestionsFinal,
    setSelectedSuggestionIndex,
    setIsAutocompleteOpen,
    getWordAtCursor,
    filterSuggestions,
    escapeRegex,
  };
}







