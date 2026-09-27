'use client';

import { useState } from 'react';
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
  /** Shown under the call name when renaming a function that formulas already call. */
  renameWarning?: string;
}

export function FunctionDetailsCard({
  formData,
  errors,
  onFormDataChange,
  onVariableNameChange,
  getAllCategories,
  addCategory,
  renameWarning,
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

  // The display name is the editor's title; these are the call name and the optional details.
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="function-variable-name"
          className="flex items-center gap-1.5 text-xs text-ink-muted mb-1.5"
        >
          <span>Call name</span>
          <ClickTooltip content="The name formulas use to call this function, e.g. stud_count(width, spacing). Letters, numbers and underscores, starting with a letter or underscore. Suggested from the display name while creating.">
            <button
              type="button"
              className="inline-flex items-center text-ink-faint hover:text-ink transition-colors"
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
          placeholder=""
          numeric
        />
        {renameWarning && (
          <p className="mt-1 text-xs text-draft" role="status">
            {renameWarning}
          </p>
        )}
      </div>

      <details open={isAdvancedOpen} onToggle={(e) => setIsAdvancedOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
          More details
        </summary>
        <div className="mt-4 space-y-4">
          <Textarea
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => onFormDataChange({ description: e.target.value })}
            rows={2}
            placeholder=""
          />
          <div>
            <label className="block text-xs text-ink-muted mb-2">Category</label>
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
                  Add category
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
                <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()} size="sm">
                  Add
                </Button>
                <Button onClick={handleCancelAddCategory} variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            )}
            {formData.category && (
              <button
                type="button"
                onClick={() => onFormDataChange({ category: '' })}
                className="mt-2 text-xs text-ink-muted hover:text-ink transition-colors"
              >
                Clear category
              </button>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
