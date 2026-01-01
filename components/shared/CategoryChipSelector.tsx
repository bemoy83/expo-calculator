'use client';

import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

/**
 * CategoryChipSelector Component
 *
 * A chip-based category selector with inline category creation.
 * Allows users to select from existing categories or add new ones.
 *
 * @example
 * ```tsx
 * <CategoryChipSelector
 *   label="Category"
 *   availableCategories={['Construction', 'Electrical', 'Plumbing']}
 *   selectedCategory={selectedCategory}
 *   onSelectCategory={setSelectedCategory}
 *   onAddCategory={(newCat) => {
 *     // Add to your categories store
 *     addCategory(newCat);
 *   }}
 *   allowDeselect={true}
 * />
 * ```
 */

export interface CategoryChipSelectorProps {
  /** Label text for the selector */
  label?: string;
  /** Available categories to choose from */
  availableCategories: string[];
  /** Currently selected category (null if none selected) */
  selectedCategory: string | null;
  /** Callback when a category is selected */
  onSelectCategory: (category: string) => void;
  /** Optional callback to add a new category (if not provided, add button is hidden) */
  onAddCategory?: (newCategory: string) => void;
  /** Allow deselecting the current category */
  allowDeselect?: boolean;
  /** Size of the chips */
  chipSize?: 'sm' | 'md' | 'lg';
}

export function CategoryChipSelector({
  label = 'Category',
  availableCategories,
  selectedCategory,
  onSelectCategory,
  onAddCategory,
  allowDeselect = true,
  chipSize = 'md',
}: CategoryChipSelectorProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category && allowDeselect) {
      // Deselect by selecting empty string
      onSelectCategory('');
    } else {
      onSelectCategory(category);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    if (onAddCategory) {
      onAddCategory(newCategoryName.trim());
      onSelectCategory(newCategoryName.trim());
    }

    // Reset state
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleCancelAdd = () => {
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleClearCategory = () => {
    onSelectCategory('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-3">
        {label}
      </label>

      <div className="flex flex-wrap gap-2 mb-3">
        {/* Existing categories */}
        {availableCategories.map((category) => (
          <Chip
            key={category}
            size={chipSize}
            variant={selectedCategory === category ? 'selected' : 'outline'}
            onClick={() => handleCategoryClick(category)}
          >
            {category}
          </Chip>
        ))}

        {/* Add category button */}
        {onAddCategory && !isAddingCategory && (
          <Chip
            size={chipSize}
            variant="dashed"
            onClick={() => setIsAddingCategory(true)}
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Add Category
          </Chip>
        )}
      </div>

      {/* Add category form */}
      {isAddingCategory && (
        <div className="flex gap-2 items-center mb-3">
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
                handleCancelAdd();
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
            onClick={handleCancelAdd}
            variant="ghost"
            size="sm"
            className="rounded-full"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Clear category button */}
      {allowDeselect && selectedCategory && (
        <button
          type="button"
          onClick={handleClearCategory}
          className="text-xs text-md-on-surface-variant hover:text-md-on-surface transition-colors"
        >
          Clear category
        </button>
      )}
    </div>
  );
}
