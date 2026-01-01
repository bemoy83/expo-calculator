'use client';

import { Card } from '@/components/ui/Card';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

/**
 * AlertBanner Component
 *
 * An inline alert banner for displaying warnings, errors, info, or success messages.
 * Supports single or multiple messages with optional dismiss functionality.
 *
 * @example
 * ```tsx
 * // Single message
 * <AlertBanner
 *   variant="warning"
 *   title="Action required"
 *   messages="Please review the following items before continuing."
 *   isVisible={showAlert}
 *   onDismiss={() => setShowAlert(false)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Multiple messages
 * <AlertBanner
 *   variant="error"
 *   title="Validation errors"
 *   messages={[
 *     'Name field is required',
 *     'Email format is invalid',
 *     'Password must be at least 8 characters'
 *   ]}
 *   isVisible={errors.length > 0}
 *   onDismiss={clearErrors}
 * />
 * ```
 */

export interface AlertBannerProps {
  /** Alert type - determines icon and colors */
  variant: 'warning' | 'error' | 'info' | 'success';
  /** Optional title/heading for the alert */
  title?: string;
  /** Single message or array of messages */
  messages: string | string[];
  /** Controls visibility of the banner */
  isVisible: boolean;
  /** Optional callback to dismiss the banner */
  onDismiss?: () => void;
}

const variantConfig = {
  warning: {
    icon: AlertTriangle,
    cardClass: 'border-warning bg-warning/10',
    textClass: 'text-warning',
    iconClass: 'text-warning',
  },
  error: {
    icon: AlertCircle,
    cardClass: 'border-destructive bg-destructive/10',
    textClass: 'text-destructive',
    iconClass: 'text-destructive',
  },
  info: {
    icon: Info,
    cardClass: 'border-md-primary bg-md-primary/10',
    textClass: 'text-md-primary',
    iconClass: 'text-md-primary',
  },
  success: {
    icon: CheckCircle2,
    cardClass: 'border-success bg-success/10',
    textClass: 'text-success',
    iconClass: 'text-success',
  },
};

export function AlertBanner({
  variant,
  title,
  messages,
  isVisible,
  onDismiss,
}: AlertBannerProps) {
  if (!isVisible) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;
  const messageArray = Array.isArray(messages) ? messages : [messages];
  const showAsList = Array.isArray(messages) && messages.length > 1;

  return (
    <Card className={config.cardClass}>
      <div className="flex items-start gap-2">
        <Icon className={`h-5 w-5 ${config.iconClass} shrink-0 mt-0.5`} />

        <div className="flex-1">
          {title && (
            <p className={`text-sm font-medium ${config.textClass} mb-2`}>
              {title}
            </p>
          )}

          {showAsList ? (
            <ul className={`list-disc list-inside space-y-1 text-xs ${config.textClass}`}>
              {messageArray.map((message, idx) => (
                <li key={idx}>{message}</li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${config.textClass}`}>
              {messageArray[0]}
            </p>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${config.textClass} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
