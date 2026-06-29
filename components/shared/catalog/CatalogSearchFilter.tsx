'use client';

import { Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CategoryChipSelector } from '@/components/shared/CategoryChipSelector';

interface CatalogSearchFilterProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  categories: string[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
}

export function CatalogSearchFilter({
  searchQuery,
  onSearchQueryChange,
  categories,
  categoryFilter,
  onCategoryFilterChange,
}: CatalogSearchFilterProps) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-md-on-surface-variant pointer-events-none" />
          <Input
            placeholder=""
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>
      <div className="mt-3">
        <CategoryChipSelector
          label="Categories"
          availableCategories={categories.filter((category) => category.toLowerCase() !== 'custom')}
          selectedCategory={categoryFilter === 'all' ? null : categoryFilter}
          onSelectCategory={(category) => onCategoryFilterChange(category || 'all')}
          allowDeselect
        />
      </div>
    </Card>
  );
}
