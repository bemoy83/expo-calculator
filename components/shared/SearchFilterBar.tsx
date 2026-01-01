'use client';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Search } from 'lucide-react';

/**
 * SearchFilterBar Component
 *
 * A search input with optional category filter dropdown.
 * Provides a consistent search and filter experience across list views.
 *
 * @example
 * ```tsx
 * // With filter
 * <SearchFilterBar
 *   searchValue={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   searchPlaceholder="Search materials..."
 *   filterValue={categoryFilter}
 *   onFilterChange={setCategoryFilter}
 *   filterOptions={[
 *     { value: 'all', label: 'All Categories' },
 *     { value: 'lumber', label: 'Lumber' },
 *     { value: 'paint', label: 'Paint' },
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Search only (no filter)
 * <SearchFilterBar
 *   searchValue={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   searchPlaceholder="Search modules..."
 * />
 * ```
 */

export interface SearchFilterBarProps {
  /** Current search query value */
  searchValue: string;
  /** Callback when search value changes */
  onSearchChange: (value: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Current filter value (only used if filterOptions provided) */
  filterValue?: string;
  /** Callback when filter value changes (only used if filterOptions provided) */
  onFilterChange?: (value: string) => void;
  /** Filter dropdown options (if not provided, filter dropdown is hidden) */
  filterOptions?: Array<{ value: string; label: string }>;
}

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterValue,
  onFilterChange,
  filterOptions,
}: SearchFilterBarProps) {
  const showFilter = filterOptions && filterOptions.length > 0 && filterValue !== undefined && onFilterChange;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input - Dominant, flex-grows to fill space */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-md-on-surface-variant pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Filter Dropdown - Fixed width, no flex-grow */}
        {showFilter && (
          <div className="w-full sm:w-auto sm:min-w-[180px]">
            <Select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              options={filterOptions}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
