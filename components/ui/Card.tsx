import React from 'react';
import { cn } from '@/lib/utils';

// Shared card styling constants
export const CARD_BACKGROUND = 'bg-md-surface-container';
export const CARD_BORDER = 'border border-md-outline';
export const CARD_ROUNDED = 'rounded-extra-large';
export const CARD_BASE_CLASSES = `${CARD_BACKGROUND} ${CARD_BORDER} ${CARD_ROUNDED} transition-all relative`;

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  interactive?: boolean; // If true, card shows hover states (implies clickability)
  elevation?: 0 | 1 | 2 | 3 | 4 | 5 | 8 | 12 | 16 | 24; // MD3 elevation level
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  actions,
  interactive = false,
  elevation = 1, // Default to 1dp elevation
}) => {
  return (
    <div className={cn(
      CARD_BASE_CLASSES,
      'p-6',
      `elevation-${elevation}`, // Apply MD3 elevation utility
      interactive && 'hover-overlay',
      className
    )}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-5 relative z-10">
          {title && (
            <h3 className="text-lg font-bold text-md-on-surface tracking-tight">{title}</h3>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

