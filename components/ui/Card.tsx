import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  interactive?: boolean; // If true, card shows hover states (implies clickability)
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  actions,
  interactive = false,
}) => {
  return (
    <div className={cn(
      'bg-card border border-border rounded-xl p-6 shadow-lg transition-all relative',
      interactive && 'hover:shadow-xl hover-overlay',
      className
    )}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-5 relative z-10">
          {title && (
            <h3 className="text-lg font-bold text-card-foreground tracking-tight">{title}</h3>
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

