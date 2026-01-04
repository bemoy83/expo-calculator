'use client';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CurrencySelector } from '@/components/shared/CurrencySelector';

/**
 * QuoteDetailsCard Component
 *
 * Card for editing quote name, tax rate, and markup percentage.
 * Follows the same pattern as ModuleDetailsCard and TemplateDetailsCard.
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
  return (
    <Card title="Quote Details">
      <div className="space-y-4">
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
    </Card>
  );
}
