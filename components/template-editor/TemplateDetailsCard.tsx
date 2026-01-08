'use client';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

/**
 * TemplateDetailsCard Component
 *
 * Card for editing template name and description.
 * Categories are automatically derived from modules in the template.
 */

export interface TemplateDetailsCardProps {
  formData: { name: string; description: string };
  errors: Record<string, string>;
  onFormDataChange: (updates: Partial<{ name: string; description: string }>) => void;
}

export function TemplateDetailsCard({ formData, errors, onFormDataChange }: TemplateDetailsCardProps) {
  return (
    <Card title="Template Details">
      <div className="space-y-4">
        <Input
          label="Template Name"
          value={formData.name}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          error={errors.name}
          placeholder=""
        />
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          rows={3}
          placeholder=""
        />
      </div>
    </Card>
  );
}
