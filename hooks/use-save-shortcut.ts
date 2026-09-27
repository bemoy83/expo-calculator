import { useEffect, useRef } from 'react';

/** ⌘S / Ctrl+S calls `onSave` instead of the browser saving the page. */
export function useSaveShortcut(onSave: () => void) {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!event.repeat) onSaveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
