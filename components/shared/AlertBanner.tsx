'use client';

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
  warning: { icon: AlertTriangle, boxClass: 'border-draft-border bg-draft-bg', iconClass: 'text-draft' },
  error: { icon: AlertCircle, boxClass: 'border-danger-border bg-danger-bg', iconClass: 'text-danger' },
  info: { icon: Info, boxClass: 'border-action-border bg-action-bg', iconClass: 'text-action' },
  success: { icon: CheckCircle2, boxClass: 'border-committed-border bg-committed-bg', iconClass: 'text-committed' },
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
    <div role={variant === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-[10px] border px-4 py-3 ${config.boxClass}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`h-4 w-4 ${config.iconClass} shrink-0 mt-0.5`} aria-hidden="true" />

        <div className="flex-1">
          {title && (
            <p className="text-sm font-semibold text-ink mb-1">
              {title}
            </p>
          )}

          {showAsList ? (
            <ul className="list-disc list-inside space-y-1 text-[13px] text-ink-body">
              {messageArray.map((message, idx) => (
                <li key={idx}>{message}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-body">
              {messageArray[0]}
            </p>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-0.5 rounded text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
