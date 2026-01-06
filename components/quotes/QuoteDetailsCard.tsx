'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CurrencySelector } from '@/components/shared/CurrencySelector';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * QuoteDetailsCard Component
 *
 * Collapsible card for editing quote name, tax rate, and markup percentage.
 * When collapsed, only shows the quote name to save space.
 */

export interface QuoteDetailsCardProps {
  formData: {
    name: string;
    taxRate: number;
    markupPercent: number;
  };
  errors: Record<string, string>;
  onFormDataChange: (updates: Partial<{ name: string; taxRate: number; markupPercent: number }>) => void;
}

export function QuoteDetailsCard({ formData, errors, onFormDataChange }: QuoteDetailsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between -m-6 p-6 hover:bg-md-surface-container-high/50 transition-colors rounded-extra-large"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-md-on-surface-variant shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-md-on-surface-variant shrink-0" />
          )}
          <div className="min-w-0 text-left">
            <h3 className="text-lg font-bold text-md-on-surface tracking-tight">
              {formData.name || 'Quote Details'}
            </h3>
            {!isExpanded && (
              <p className="text-sm text-md-on-surface-variant truncate">
                Tax: {formData.taxRate}% • Markup: {formData.markupPercent}%
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 mt-6">
          <Input
            label="Quote Name"
            value={formData.name}
            onChange={(e) => onFormDataChange({ name: e.target.value })}
            error={errors.name}
            placeholder="e.g., Office Renovation Project"
          />
          <CurrencySelector />
          <Input
            label="Tax Rate (%)"
            type="number"
            value={formData.taxRate}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              const rounded = Math.round(value * 100) / 100; // Round to 2 decimal places
              onFormDataChange({ taxRate: rounded });
            }}
            error={errors.taxRate}
            placeholder="e.g., 8.50"
            step="0.01"
            min="0"
            max="100"
          />
          <Input
            label="Markup (%)"
            type="number"
            value={formData.markupPercent}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              const rounded = Math.round(value * 100) / 100; // Round to 2 decimal places
              onFormDataChange({ markupPercent: rounded });
            }}
            error={errors.markupPercent}
            placeholder="e.g., 12.50"
            step="0.01"
            min="0"
            max="100"
          />
        </div>
      )}
    </Card>
  );
}
