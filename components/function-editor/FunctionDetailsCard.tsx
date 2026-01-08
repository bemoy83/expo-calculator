'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ClickTooltip } from '@/components/shared/ClickTooltip';
import { Info, Plus } from 'lucide-react';

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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    () => Boolean(formData.description || formData.category)
  );

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Display Name"
            value={formData.displayName}
            onChange={(e) => onFormDataChange({ displayName: e.target.value })}
            error={errors.displayName}
            placeholder="e.g., Calculate Area, Square Meters, Volume Calculator"
          />
          <div>
            <label
              htmlFor="function-variable-name"
              className="flex items-center gap-2 text-sm font-medium text-md-on-surface mb-1.5"
            >
              <span>Variable Name</span>
              <ClickTooltip content="Used in formulas. Must be a valid identifier (letters, numbers, underscores only, starting with letter or underscore). Auto-generated from display name.">
                <button
                  type="button"
                  className="inline-flex items-center text-md-on-surface-variant hover:text-md-on-surface transition-colors"
                  aria-label="Variable name help"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </ClickTooltip>
            </label>
            <Input
              id="function-variable-name"
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
          </div>
        </div>

        <details open={isAdvancedOpen} onToggle={(e) => setIsAdvancedOpen(e.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-semibold text-md-primary">
            Advanced details
          </summary>
          <div className="mt-4 space-y-4">
            <Textarea
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => onFormDataChange({ description: e.target.value })}
              rows={2}
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
        </details>
      </div>
    </Card>
  );
}
