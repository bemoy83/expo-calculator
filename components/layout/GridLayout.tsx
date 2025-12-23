'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { useGridLayout } from './useGridLayout';
import { ROW_HEIGHT } from '@/lib/grid-layout-config';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Define Layouts type to match react-grid-layout's ResponsiveLayouts
// ResponsiveLayouts is Partial<Record<string, Layout>> where Layout is readonly LayoutItem[]
export type Layouts = Partial<Record<string, Layout>>;

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridLayoutProps {
  moduleId: string | null;
  children: React.ReactNode;
  className?: string;
}

/**
 * Grid Layout Container Component
 * Manages responsive grid layout with drag-and-drop and resizing
 */
export function GridLayout({ moduleId, children, className }: GridLayoutProps) {
  const { layouts, isInitialized, handleLayoutChange, breakpoints, cols } = useGridLayout(moduleId);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're on client side before rendering grid
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoize layout props to prevent unnecessary re-renders
  const layoutProps = useMemo(
    () => ({
      layouts,
      breakpoints,
      cols,
      rowHeight: ROW_HEIGHT,
      isDraggable: true,
      isResizable: true,
      preventCollision: false,
      compactType: 'vertical' as const,
      margin: [16, 16] as [number, number],
      containerPadding: [16, 16] as [number, number],
      onLayoutChange: handleLayoutChange,
      draggableHandle: '.drag-handle',
      resizeHandle: (
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-1 right-1 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-muted-foreground/50"></div>
        </div>
      ),
    }),
    [layouts, breakpoints, cols, handleLayoutChange]
  );

  if (!isInitialized || !isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading layout...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveGridLayout {...layoutProps}>
        {children}
      </ResponsiveGridLayout>
    </div>
  );
}

