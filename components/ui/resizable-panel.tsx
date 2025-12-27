'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelProps {
  id: string;
  children: React.ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  side: 'left' | 'right';
  className?: string;
}

/**
 * Hook for managing resizable panel state with localStorage persistence
 */
function useResizablePanel(
  id: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number
) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`panel-width-${id}`);
      if (saved) {
        const savedWidth = Number(saved);
        if (!isNaN(savedWidth) && savedWidth >= minWidth && savedWidth <= maxWidth) {
          setWidth(savedWidth);
        }
      }
    }
  }, [id, minWidth, maxWidth]);

  // Save width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !isResizing) {
      localStorage.setItem(`panel-width-${id}`, String(width));
    }
  }, [id, width, isResizing]);

  const startResize = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;
        // For left panel, dragging right increases width
        // For right panel, dragging left increases width
        const newWidth =
          side === 'left'
            ? startWidthRef.current + deltaX
            : startWidthRef.current - deltaX;

        const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
        setWidth(clampedWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, minWidth, maxWidth]
  );

  return { width, isResizing, startResize };
}

/**
 * Resizable panel component with drag handle
 */
export function ResizablePanel({
  id,
  children,
  defaultWidth,
  minWidth,
  maxWidth,
  side,
  className,
}: ResizablePanelProps) {
  const { width, isResizing, startResize } = useResizablePanel(
    id,
    defaultWidth,
    minWidth,
    maxWidth
  );

  return (
    <div
      className={cn(
        'relative flex-shrink-0 bg-md-surface-container border border-md-outline rounded-xl elevation-1 overflow-hidden',
        isResizing && 'select-none',
        className
      )}
      style={{ width: `${width}px` }}
    >
      {/* Panel content */}
      <div className="h-full overflow-y-auto overflow-x-hidden">{children}</div>

      {/* Drag handle */}
      <div
        className={cn(
          'absolute top-0 bottom-0 w-1 cursor-col-resize z-10 group',
          'hover:bg-md-primary/50 active:bg-md-primary transition-colors',
          side === 'left' ? 'right-0' : 'left-0'
        )}
        onMouseDown={(e) => startResize(e, side)}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${side} panel`}
      >
        {/* Visual indicator on hover */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-1 h-8 rounded-full',
            'bg-md-on-surface-variant/30 group-hover:bg-md-on-primary/50',
            'transition-all opacity-0 group-hover:opacity-100',
            side === 'left' ? 'right-0' : 'left-0'
          )}
        />
      </div>
    </div>
  );
}

/**
 * Container for three-panel layout
 */
interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelId?: string;
  rightPanelId?: string;
  leftDefaultWidth?: number;
  rightDefaultWidth?: number;
  leftMinWidth?: number;
  rightMinWidth?: number;
  leftMaxWidth?: number;
  rightMaxWidth?: number;
  className?: string;
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftPanelId = 'left-panel',
  rightPanelId = 'right-panel',
  leftDefaultWidth = 280,
  rightDefaultWidth = 280,
  leftMinWidth = 200,
  rightMinWidth = 200,
  leftMaxWidth = 400,
  rightMaxWidth = 400,
  className,
}: ThreePanelLayoutProps) {
  return (
    <div className={cn('flex h-full w-full', className)}>
      {/* Left Panel */}
      <ResizablePanel
        id={leftPanelId}
        defaultWidth={leftDefaultWidth}
        minWidth={leftMinWidth}
        maxWidth={leftMaxWidth}
        side="left"
        className="bg-transparent border-0 rounded-none elevation-0"
      >
        {leftPanel}
      </ResizablePanel>

      {/* Center Panel */}
      <div className="flex-1 min-w-[400px] overflow-hidden">{centerPanel}</div>

      {/* Right Panel */}
      <ResizablePanel
        id={rightPanelId}
        defaultWidth={rightDefaultWidth}
        minWidth={rightMinWidth}
        maxWidth={rightMaxWidth}
        side="right"
      >
        {rightPanel}
      </ResizablePanel>
    </div>
  );
}

export { useResizablePanel };

