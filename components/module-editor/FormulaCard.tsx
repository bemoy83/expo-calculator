'use client';

import React from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { Calculator, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormulaCardProps {
  formula: string;
  onFormulaChange: (formula: string) => void;
  validation: {
    valid: boolean;
    error?: string;
    preview?: number;
  };
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export const FormulaCard = React.memo(function FormulaCard({
  formula,
  onFormulaChange,
  validation,
  textareaRef,
}: FormulaCardProps) {

  // Determine status chip state
  const getStatusChip = () => {
    if (validation.valid) {
      return {
        icon: CheckCircle2,
        label: 'Evaluates safely',
        className: 'text-success',
        bgClassName: 'bg-success/10 border-success/30',
      };
    } else if (validation.error) {
      return {
        icon: XCircle,
        label: 'Error',
        className: 'text-md-error',
        bgClassName: 'bg-md-error/10 border-destructive/30',
      };
    } else {
      return {
        icon: AlertCircle,
        label: 'May have issues',
        className: 'text-warning',
        bgClassName: 'bg-warning/10 border-warning/30',
      };
    }
  };

  const statusChip = getStatusChip();
  const StatusIcon = statusChip.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="formula-input" className="text-sm font-semibold text-md-on-surface">
          Formula
        </label>
        <div className="flex items-center gap-2">
          {validation.valid && validation.preview !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-success/10 border-success/30">
              <Calculator className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              <span className="text-xs font-medium text-success">
                ${validation.preview.toFixed(2)}
              </span>
            </div>
          )}
          {formula && (
            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border", statusChip.bgClassName)} role="status" aria-live="polite">
              <StatusIcon className={cn("h-3.5 w-3.5", statusChip.className)} aria-hidden="true" />
              <span className={cn("text-xs font-medium", statusChip.className)}>{statusChip.label}</span>
            </div>
          )}
        </div>
      </div>
      <Textarea
        ref={textareaRef || undefined}
        id="formula-input"
        value={formula}
        onChange={(e) => onFormulaChange(e.target.value)}
        placeholder="Click variables on the left to build your formula..."
        rows={3}
        className={cn(
          "font-mono text-sm resize-none",
          validation.valid && formula && "border-success/50 focus:ring-success/50",
          formula && !validation.valid && "border-destructive/50 focus:ring-destructive/50"
        )}
      />
      {validation.error && (
        <p className="text-xs text-md-error" role="alert" aria-live="polite">
          {validation.error}
        </p>
      )}
    </div>
  );
});

