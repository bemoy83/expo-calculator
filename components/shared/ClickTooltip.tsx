"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type TooltipPlacement = 'top' | 'bottom';
type TooltipAlign = 'start' | 'center' | 'end';

interface ClickTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<any>;
  placement?: TooltipPlacement;
  align?: TooltipAlign;
  className?: string;
  tooltipClassName?: string;
}

const PLACEMENT_CLASSES: Record<TooltipPlacement, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
};

const ALIGN_CLASSES: Record<TooltipAlign, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

export function ClickTooltip({
  content,
  children,
  placement = 'bottom',
  align = 'start',
  className,
  tooltipClassName,
}: ClickTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const child = React.cloneElement(children as React.ReactElement<any>, {
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      setIsOpen((prev) => !prev);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      children.props.onKeyDown?.(event);
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    },
    'aria-expanded': isOpen,
    'aria-describedby': isOpen ? tooltipId : undefined,
  });

  return (
    <span ref={wrapperRef} className={cn('relative inline-flex', className)}>
      {child}
      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-20 w-72 rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs leading-relaxed text-ink-body shadow-panel',
            PLACEMENT_CLASSES[placement],
            ALIGN_CLASSES[align],
            tooltipClassName
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
