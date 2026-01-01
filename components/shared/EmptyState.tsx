'use client';

import { Card } from '@/components/ui/Card';

/**
 * EmptyState Component
 *
 * A standardized empty state display for collections or lists.
 * Shows an icon, title, description, and optional action button.
 * Used across the app for consistent empty state UX.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Calculator}
 *   title="No Modules Yet"
 *   description="Create your first calculation module to get started building professional estimates."
 *   actions={
 *     <Button onClick={handleCreate} className="rounded-full">
 *       <Plus className="h-4 w-4 mr-2" />
 *       Create Module
 *     </Button>
 *   }
 * />
 * ```
 */

export interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: React.ElementType;
  /** Main heading text */
  title: string;
  /** Descriptive text explaining the empty state */
  description: string;
  /** Optional action button(s) or other action elements */
  actions?: React.ReactNode;
  /** Icon size variant - determines icon container and icon dimensions */
  iconSize?: 'small' | 'medium' | 'large';
}

const iconSizeStyles = {
  small: {
    container: 'w-16 h-16',
    icon: 'h-8 w-8',
    padding: 'py-16',
  },
  medium: {
    container: 'w-20 h-20',
    icon: 'h-10 w-10',
    padding: 'py-20',
  },
  large: {
    container: 'w-24 h-24',
    icon: 'h-12 w-12',
    padding: 'py-24',
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  iconSize = 'large',
}: EmptyStateProps) {
  const styles = iconSizeStyles[iconSize];

  return (
    <Card>
      <div className={`text-center ${styles.padding}`}>
        <div
          className={`inline-flex items-center justify-center ${styles.container} rounded-full bg-md-surface-variant elevation-4 mb-6`}
          aria-hidden="true"
        >
          <Icon className={`${styles.icon} text-md-on-surface-variant`} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
          {title}
        </h3>
        <p className="text-base text-md-on-surface-variant mb-8 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        {actions}
      </div>
    </Card>
  );
}
