import { useSyncExternalStore } from 'react';
import { useDeviceStore } from '@/lib/stores/device-store';

const subscribeNever = () => () => {};

/**
 * False while hydrating the prerendered HTML, true after; true straight away when a page is
 * reached by client navigation. Lets persisted settings change what renders without a
 * hydration mismatch, and without a flash on every navigation (as a mounted flag would give).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

/** Whether this browser is in use-only mode (see the device store). */
export function useUseOnlyMode(): boolean {
  const hydrated = useHydrated();
  const useOnly = useDeviceStore((state) => state.useOnly);
  return hydrated && useOnly;
}

/** Pages hidden in use-only mode: the builder and the library pages. */
const BUILDER_ROUTES = ['/calculator/edit', '/functions', '/materials', '/labor'];

export function isBuilderRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return BUILDER_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}
