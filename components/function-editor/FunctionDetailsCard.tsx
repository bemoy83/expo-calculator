'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Plus } from 'lucide-react';

interface FunctionDetailsCardProps {
  formData: {
    displayName: string;
    name: string;
    description: string;
    category: string;
  };
  errors: {
    displayName?: string;
    name?: string;
  };
  onFormDataChange: (updates: Partial<{ displayName: string; name: string; description: string; category: string }>) => void;
  onVariableNameChange?: (name: string) => void;
  getAllCategories: () => string[];
  addCategory: (category: string) => void;
}

export function FunctionDetailsCard({
  formData,
  errors,
  onFormDataChange,
  onVariableNameChange,
  getAllCategories,
  addCategory,
}: FunctionDetailsCardProps) {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      onFormDataChange({ category: newCategoryName.trim() });
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleCancelAddCategory = () => {
    setShowAddCategory(false);
    setNewCategoryName('');
  };

  return (
    <Card title="Function Details">
      <div className="space-y-4">
        <Input
          label="Display Name"
          value={formData.displayName}
          onChange={(e) => onFormDataChange({ displayName: e.target.value })}
          error={errors.displayName}
          placeholder="e.g., Calculate Area, Square Meters, Volume Calculator"
        />
        <div>
          <Input
            label="Variable Name"
          value={formData.name}
            onChange={(e) => {
              if (onVariableNameChange) {
                onVariableNameChange(e.target.value);
              } else {
                onFormDataChange({ name: e.target.value });
              }
            }}
          error={errors.name}
          placeholder="e.g., m2, area, volume"
        />
          <p className="mt-1 text-xs text-md-on-surface-variant">
            Used in formulas. Must be a valid identifier (letters, numbers, underscores only, starting with letter or underscore). Auto-generated from display name.
          </p>
        </div>
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          rows={3}
          placeholder="Describe what this function calculates..."
        />
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">Category</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {getAllCategories().map((cat) => (
              <Chip
                key={cat}
                size="md"
                variant={formData.category === cat ? 'selected' : 'outline'}
                onClick={() => onFormDataChange({ category: cat })}
              >
                {cat}
              </Chip>
            ))}
            {!showAddCategory && (
              <Chip size="md" variant="dashed" onClick={() => setShowAddCategory(true)}>
                <Plus className="h-4 w-4 inline mr-1" />
                Add Category
              </Chip>
            )}
          </div>
          {showAddCategory && (
            <div className="flex gap-2 items-center">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  } else if (e.key === 'Escape') {
                    handleCancelAddCategory();
                  }
                }}
                autoFocus
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()} size="sm" className="rounded-full">
                Add
              </Button>
              <Button onClick={handleCancelAddCategory} variant="ghost" size="sm" className="rounded-full">
                Cancel
              </Button>
            </div>
          )}
          {formData.category && (
            <button
              type="button"
              onClick={() => onFormDataChange({ category: '' })}
              className="mt-2 text-xs text-md-on-surface-variant hover:text-md-on-surface transition-colors"
            >
              Clear category
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}


