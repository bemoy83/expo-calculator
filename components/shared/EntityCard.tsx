'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ActionIconButton, ActionIconButtonProps } from '@/components/shared/ActionIconButton';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * EntityCard Component
 *
 * A flexible, reusable card component for displaying entities (templates, modules, etc.)
 * with consistent styling, action buttons, and content sections.
 *
 * @example
 * ```tsx
 * // Template Card
 * <EntityCard
 *   title={template.name}
 *   description={template.description}
 *   categories={template.categories}
 *   onClick={onEdit}
 *   actions={[
 *     { icon: Copy, actionType: 'duplicate', onAction: onDuplicate, ariaLabel: 'Duplicate' },
 *     { icon: Trash2, actionType: 'delete', onAction: onDelete, ariaLabel: 'Delete', confirmation: { title: 'Delete?' } }
 *   ]}
 *   sections={[
 *     {
 *       label: 'Modules',
 *       content: <div>...</div>,
 *       spacing: 'small'
 *     }
 *   ]}
 * />
 * ```
 */

export interface EntityCardSection {
  /** Section label (displayed as SectionHeading) */
  label: string;
  /** Section content (React node) */
  content: React.ReactNode;
  /** Spacing variant for the heading */
  spacing?: 'small' | 'default';
}

export interface EntityCardAction extends Omit<ActionIconButtonProps, 'icon'> {
  /** Lucide icon component */
  icon: LucideIcon;
}

export interface EntityCardProps {
  /** Card title/name */
  title: string;
  /** Optional click handler for the entire card */
  onClick?: () => void;
  /** Optional description text */
  description?: string;
  /** Single category */
  category?: string;
  /** Multiple categories */
  categories?: string[];
  /** Action buttons to display in top-right corner */
  actions?: EntityCardAction[];
  /** Content sections to display */
  sections?: EntityCardSection[];
  /** Footer content */
  footer?: React.ReactNode;
  /** Additional CSS classes for the card wrapper */
  wrapperClassName?: string;
  /** Additional CSS classes for the card */
  cardClassName?: string;
}

export function EntityCard({
  title,
  onClick,
  description,
  category,
  categories,
  actions = [],
  sections = [],
  footer,
  wrapperClassName = '',
  cardClassName = '',
}: EntityCardProps) {
  // Calculate title padding based on action button count
  // 2 buttons = pr-20, 1 button = pr-10, 0 buttons = no padding
  const titlePaddingClass =
    actions.length >= 2 ? 'pr-20' : actions.length === 1 ? 'pr-10' : '';

  // Determine which categories to display
  const displayCategories = categories || (category ? [category] : []);

  const cardContent = (
    <Card
      className={cn(
        'h-full relative',
        onClick && 'group hover:bg-surface-hover focus-within:border-action',
        cardClassName,
        wrapperClassName
      )}
    >
      {/* Action Buttons */}
      {actions.length > 0 && (
        <div className="absolute top-4 right-4 flex gap-1 z-10">
          {actions.map((action, index) => {
            const { icon: Icon, ...actionProps } = action;
            return (
              <ActionIconButton
                key={index}
                icon={Icon}
                {...actionProps}
              />
            );
          })}
        </div>
      )}

      {/* Title. When the card opens something, the title is a real button whose ::after
          covers the whole card, so it's reachable by keyboard; actions sit above it. */}
      <h3 className={cn('text-base font-semibold text-ink mb-3', titlePaddingClass)}>
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="text-left focus:outline-none after:absolute after:inset-0 after:rounded-[10px] focus-visible:after:ring-2 focus-visible:after:ring-action"
          >
            {title}
          </button>
        ) : (
          title
        )}
      </h3>

      {/* Description */}
      {description && (
        <div className="mb-4">
          <SectionHeading spacing="small">Description</SectionHeading>
          <p className="text-sm text-ink-muted line-clamp-2">
            {description}
          </p>
        </div>
      )}

      {/* Categories */}
      {displayCategories.length > 0 && (
        <div className="mb-4">
          <SectionHeading spacing="small">Categories</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {displayCategories.map((cat) => (
              <Chip key={cat} size="sm">
                {cat}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Content Sections */}
      {sections.map((section, index) => (
        <div key={index} className={index < sections.length - 1 ? 'mb-5' : 'mb-5'}>
          <SectionHeading spacing={section.spacing || 'default'}>
            {section.label}
          </SectionHeading>
          {section.content}
        </div>
      ))}

      {/* Footer */}
      {footer && <div className="mt-auto">{footer}</div>}
    </Card>
  );

  return cardContent;
}

