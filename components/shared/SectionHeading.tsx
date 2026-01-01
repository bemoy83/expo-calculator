'use client';

/**
 * SectionHeading Component
 *
 * A small, uppercase section heading for organizing content within cards.
 * Provides consistent styling for section labels throughout the app.
 *
 * @example
 * ```tsx
 * <div className="mb-5">
 *   <SectionHeading>Fields</SectionHeading>
 *   <div className="flex flex-wrap gap-2">
 *     {fields.map(field => <Chip key={field.id}>{field.label}</Chip>)}
 *   </div>
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // With custom spacing
 * <SectionHeading spacing="small">Categories</SectionHeading>
 * <div className="flex gap-2">
 *   {categories.map(cat => <Chip key={cat}>{cat}</Chip>)}
 * </div>
 * ```
 */

export interface SectionHeadingProps {
  /** Heading text to display */
  children: string;
  /** Bottom margin spacing */
  spacing?: 'small' | 'default';
}

const spacingMap = {
  small: 'mb-1',
  default: 'mb-2',
};

export function SectionHeading({ children, spacing = 'default' }: SectionHeadingProps) {
  const spacingClass = spacingMap[spacing];

  return (
    <p className={`text-xs text-md-on-surface-variant uppercase tracking-wide ${spacingClass}`}>
      {children}
    </p>
  );
}
