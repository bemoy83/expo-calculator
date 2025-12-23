'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from 'react-grid-layout';

// Define Layouts type to match react-grid-layout's ResponsiveLayouts
// ResponsiveLayouts is Partial<Record<string, Layout>> where Layout is readonly LayoutItem[]
export type Layouts = Partial<Record<string, Layout>>;
import {
  DEFAULT_LAYOUTS,
  BREAKPOINTS,
  COLS,
  getLayoutStorageKey,
  getAllLayoutStorageKeys,
  ResponsiveLayout,
  CARD_CONFIGS,
} from '@/lib/grid-layout-config';

/**
 * Hook for managing grid layout state with persistence
 */
export function useGridLayout(moduleId: string | null) {
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Load layouts from localStorage and ensure constraints are applied
  const loadLayouts = useCallback((): Layouts => {
    if (!moduleId || typeof window === 'undefined') {
      return DEFAULT_LAYOUTS as Layouts;
    }

    const loaded: Layouts = {};
    let hasSavedLayout = false;

    // Try to load saved layouts for each breakpoint
    Object.keys(BREAKPOINTS).forEach((breakpoint) => {
      const key = getLayoutStorageKey(moduleId, breakpoint);
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Ensure each layout item has proper constraints from CARD_CONFIGS
            // Also fix any unreasonably large heights (likely from legacy sidebar code)
            const constrainedLayout = parsed.map((item: Layout[0]) => {
              const config = CARD_CONFIGS[item.i];
              // If height is unreasonably large (>20 grid units), reset to default
              const maxReasonableHeight = 20;
              const fixedH = item.h > maxReasonableHeight ? (config?.defaultH ?? 2) : item.h;
              
              if (config) {
                return {
                  ...item,
                  h: fixedH,
                  minW: config.minW,
                  minH: config.minH,
                  maxW: config.maxW,
                  maxH: config.maxH,
                };
              }
              return { ...item, h: fixedH };
            });
            loaded[breakpoint] = constrainedLayout;
            hasSavedLayout = true;
          }
        } catch (e) {
          console.warn(`Failed to parse layout for ${breakpoint}:`, e);
        }
      }
    });

    // If no saved layouts, use defaults
    if (!hasSavedLayout) {
      return DEFAULT_LAYOUTS as Layouts;
    }

    // Merge with defaults to ensure all breakpoints are covered
    const merged: Layouts = {
      ...DEFAULT_LAYOUTS,
      ...loaded,
    };

    // Ensure all layout items have constraints applied
    Object.keys(merged).forEach((breakpoint) => {
      const layout = merged[breakpoint];
      if (layout && Array.isArray(layout)) {
        merged[breakpoint] = layout.map((item: Layout[0]) => {
          const config = CARD_CONFIGS[item.i];
          if (config) {
            return {
              ...item,
              minW: config.minW,
              minH: config.minH,
              maxW: config.maxW,
              maxH: config.maxH,
            };
          }
          return item;
        });
      }
    });

    return merged;
  }, [moduleId]);

  // Initialize layouts on mount or moduleId change
  useEffect(() => {
    if (moduleId) {
      const loaded = loadLayouts();
      setLayouts(loaded);
      setIsInitialized(true);
    } else {
      setLayouts(DEFAULT_LAYOUTS as Layouts);
      setIsInitialized(true);
    }
  }, [moduleId, loadLayouts]);

  // Handle layout changes with debouncing
  // Note: Legacy API signature is (layout: Layout, layouts: Layouts)
  // where Layout is readonly LayoutItem[] and Layouts is Partial<Record<string, Layout>>
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleLayoutChange = useCallback(
    (currentLayout: Layout, allLayouts: Layouts) => {
      setLayouts(allLayouts);
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for saving
      timeoutRef.current = setTimeout(() => {
        if (!moduleId || typeof window === 'undefined') return;
        
        Object.keys(BREAKPOINTS).forEach((breakpoint) => {
          const layout = allLayouts[breakpoint];
          if (layout && Array.isArray(layout)) {
            const key = getLayoutStorageKey(moduleId, breakpoint);
            try {
              localStorage.setItem(key, JSON.stringify(layout));
            } catch (e) {
              console.warn(`Failed to save layout for ${breakpoint}:`, e);
            }
          }
        });
      }, 300);
    },
    [moduleId]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset to default layouts
  const resetLayouts = useCallback(() => {
    if (!moduleId || typeof window === 'undefined') {
      setLayouts(DEFAULT_LAYOUTS as Layouts);
      return;
    }

    // Clear saved layouts
    getAllLayoutStorageKeys(moduleId).forEach((key) => {
      localStorage.removeItem(key);
    });

    // Reset to defaults
    setLayouts(DEFAULT_LAYOUTS as Layouts);
  }, [moduleId]);

  return {
    layouts,
    isInitialized,
    handleLayoutChange,
    resetLayouts,
    breakpoints: BREAKPOINTS,
    cols: COLS,
  };
}

