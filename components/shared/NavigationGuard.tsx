'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Returns true when it stopped the navigation, e.g. to ask about unsaved edits first. */
export type NavigationGuard = (href: string) => boolean;

interface NavigationGuardContextValue {
  setGuard: (guard: NavigationGuard | null) => void;
  /** onClick for an app link: stops it when the open editor's guard says so. */
  guardLink: (href: string, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue>({
  setGuard: () => {},
  guardLink: () => {},
});

// Lets an editor with unsaved edits stop the app's own links (top bar, navigation drawer,
// breadcrumb) and ask first. Layout provides it; an editor registers with useNavigationGuard
// and the links call useGuardLink. Only one editor is open at a time, so there's one guard.
// Links opened in a new tab or window aren't stopped; they don't leave the page.
export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const guardRef = useRef<NavigationGuard | null>(null);
  const setGuard = useCallback((guard: NavigationGuard | null) => {
    guardRef.current = guard;
  }, []);
  const guardLink = useCallback((href: string, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (guardRef.current?.(href)) event.preventDefault();
  }, []);
  const value = useMemo(() => ({ setGuard, guardLink }), [setGuard, guardLink]);
  return <NavigationGuardContext.Provider value={value}>{children}</NavigationGuardContext.Provider>;
}

/** Registers `guard` while the component is mounted; null (e.g. no unsaved edits) lets links through. */
export function useNavigationGuard(guard: NavigationGuard | null) {
  const { setGuard } = useContext(NavigationGuardContext);
  useEffect(() => {
    setGuard(guard);
    return () => setGuard(null);
  }, [guard, setGuard]);
}

export function useGuardLink() {
  return useContext(NavigationGuardContext).guardLink;
}

/**
 * An editor's way out: `leave(href)` goes straight there when nothing is unsaved, else sets
 * `leavingTo` for the editor's SaveChangesDialog. App links are stopped the same way while dirty.
 */
export function useLeaveEditor(dirty: boolean) {
  const router = useRouter();
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const guard = useCallback((href: string) => {
    setLeavingTo(href);
    return true;
  }, []);
  useNavigationGuard(dirty ? guard : null);
  const leave = (href: string) => (dirty ? setLeavingTo(href) : router.push(href));
  return { leavingTo, setLeavingTo, leave };
}
