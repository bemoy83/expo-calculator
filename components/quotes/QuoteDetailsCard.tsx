'use client';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

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
        <Input
          label="Tax Rate (%)"
          type="number"
          value={formData.taxRate}
          onChange={(e) => onFormDataChange({ taxRate: parseFloat(e.target.value) || 0 })}
          error={errors.taxRate}
          placeholder="e.g., 8.5"
          step="0.01"
          min="0"
          max="100"
        />
        <Input
          label="Markup (%)"
          type="number"
          value={formData.markupPercent}
          onChange={(e) => onFormDataChange({ markupPercent: parseFloat(e.target.value) || 0 })}
          error={errors.markupPercent}
          placeholder="e.g., 12.5"
          step="0.01"
          min="0"
          max="100"
        />
      </div>
    </Card>
  );
}
