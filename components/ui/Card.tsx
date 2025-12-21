import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  actions,
}) => {
  return (
    <div className={cn('bg-card border border-border rounded-2xl p-6 shadow-elevated transition-all hover:shadow-floating', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-5">
          {title && (
            <h3 className="text-lg font-bold text-card-foreground tracking-tight">{title}</h3>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

