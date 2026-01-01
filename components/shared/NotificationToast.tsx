'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * NotificationToast Component
 *
 * A fixed-position notification toast for success, error, warning, or info messages.
 * Supports auto-dismiss and manual dismissal.
 *
 * @example
 * ```tsx
 * const [showToast, setShowToast] = useState(false);
 *
 * <NotificationToast
 *   message="Template saved successfully"
 *   variant="success"
 *   isVisible={showToast}
 *   onDismiss={() => setShowToast(false)}
 *   autoHideDuration={3000}
 * />
 * ```
 */

export interface NotificationToastProps {
  /** The notification message to display */
  message: string;
  /** Visual style variant - determines icon and colors */
  variant?: 'success' | 'error' | 'warning' | 'info';
  /** Controls visibility of the toast */
  isVisible: boolean;
  /** Callback when toast is dismissed (auto or manual) */
  onDismiss?: () => void;
  /** Auto-hide duration in milliseconds (0 = no auto-hide) */
  autoHideDuration?: number;
  /** Show manual dismiss button */
  showDismissButton?: boolean;
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    cardClass: 'bg-success/10 border-success/30',
    textClass: 'text-success',
    iconClass: 'text-success',
  },
  error: {
    icon: AlertCircle,
    cardClass: 'bg-destructive/10 border-destructive/30',
    textClass: 'text-destructive',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    cardClass: 'bg-warning/10 border-warning/30',
    textClass: 'text-warning',
    iconClass: 'text-warning',
  },
  info: {
    icon: Info,
    cardClass: 'bg-md-primary/10 border-md-primary/30',
    textClass: 'text-md-primary',
    iconClass: 'text-md-primary',
  },
};

export function NotificationToast({
  message,
  variant = 'success',
  isVisible,
  onDismiss,
  autoHideDuration = 3000,
  showDismissButton = false,
}: NotificationToastProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  // Auto-dismiss effect
  useEffect(() => {
    if (isVisible && autoHideDuration > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className={config.cardClass}>
        <div className="flex items-center gap-2 p-3">
          <Icon className={`h-4 w-4 ${config.iconClass} shrink-0`} />
          <p className={`text-sm ${config.textClass}`}>{message}</p>
          {showDismissButton && onDismiss && (
            <button
              onClick={onDismiss}
              className={`ml-2 ${config.textClass} hover:opacity-70 transition-opacity`}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
