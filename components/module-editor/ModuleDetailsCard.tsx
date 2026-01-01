'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Plus } from 'lucide-react';

interface ModuleDetailsCardProps {
  formData: {
    name: string;
    description: string;
    category: string;
  };
  errors: {
    name?: string;
  };
  onFormDataChange: (updates: Partial<{ name: string; description: string; category: string }>) => void;
  getAllCategories: () => string[];
  addCategory: (category: string) => void;
}

export function ModuleDetailsCard({
  formData,
  errors,
  onFormDataChange,
  getAllCategories,
  addCategory,
}: ModuleDetailsCardProps) {
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
    <Card title="Module Details">
      <div className="space-y-4">
        <Input
          label="Module Name"
          value={formData.name}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          error={errors.name}
          placeholder="e.g., Floor Area Calculator"
        />
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          rows={3}
          placeholder="Describe what this module calculates..."
        />
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Category
          </label>
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
              <Chip
                size="md"
                variant="dashed"
                onClick={() => setShowAddCategory(true)}
              >
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
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                size="sm"
                className="rounded-full"
              >
                Add
              </Button>
              <Button
                onClick={handleCancelAddCategory}
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
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








