'use client';

import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationVariant } from '@/lib/stores/notifications-store';

/**
 * NotificationToastCard
 *
 * One toast: a raised surface with the variant's icon and a tinted edge. Toasts are raised
 * with `notify()` (lib/stores/notifications-store) and rendered by NotificationHost, which
 * is mounted once in Layout; there is no other toast path.
 */

interface NotificationToastCardProps {
  message: string;
  variant?: NotificationVariant;
  onDismiss?: () => void;
  showDismissButton?: boolean;
}

const variantConfig = {
  success: { icon: CheckCircle2, iconClass: 'text-committed', edgeClass: 'border-l-committed' },
  error: { icon: AlertCircle, iconClass: 'text-danger', edgeClass: 'border-l-danger' },
  warning: { icon: AlertTriangle, iconClass: 'text-draft', edgeClass: 'border-l-draft' },
  info: { icon: Info, iconClass: 'text-action', edgeClass: 'border-l-action' },
};

export function NotificationToastCard({
  message,
  variant = 'success',
  onDismiss,
  showDismissButton = false,
}: NotificationToastCardProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-[10px] border border-border-strong border-l-[3px] bg-surface px-3.5 py-3 shadow-panel',
        config.edgeClass
      )}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.iconClass)} aria-hidden="true" />
      <p className="text-sm text-ink whitespace-pre-line">{message}</p>
      {showDismissButton && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 -mr-1 p-0.5 rounded text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
