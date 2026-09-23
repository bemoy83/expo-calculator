"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { GripVertical, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/components/shared/ActionIconButton";

interface DragHandleProps {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners?: Record<string, any>;
}

export interface ModuleCardShellProps {
  cardRef: (node: HTMLDivElement | null) => void;
  style?: React.CSSProperties;
  dragHandleProps: DragHandleProps;
  title: string;
  titleDetail?: string;
  category?: string;
  metaChips?: React.ReactNode[];
  subtitle?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  removeConfirmMessage?: string;
  removeConfirmLabel?: string;
  rightExtras?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Shared shell for sortable module cards to keep header styling consistent across contexts.
 * The shell leaves body/content rendering to callers.
 */
export function ModuleCardShell({
  cardRef,
  style,
  dragHandleProps,
  title,
  titleDetail,
  category,
  metaChips,
  subtitle,
  isCollapsed,
  onToggle,
  onRemove,
  removeConfirmMessage,
  removeConfirmLabel = 'Remove',
  rightExtras,
  children,
}: ModuleCardShellProps) {
  const chips = metaChips?.filter(Boolean);
  const accessibleTitle = titleDetail ? `${title}, ${titleDetail}` : title;

  return (
    <Card ref={cardRef} style={style}>
      <div className="flex items-center">
        <button
          {...dragHandleProps.attributes}
          {...(dragHandleProps.listeners || {})}
          className="text-md-on-surface-variant hover:text-md-primary cursor-grab active:cursor-grabbing focus:outline-none transition-smooth"
          aria-label={`Drag to reorder ${accessibleTitle}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div
          className="flex items-center justify-between flex-1 min-w-0 p-4 cursor-pointer hover-overlay transition-smooth relative rounded-extra-large"
          onClick={onToggle}
          onKeyDown={(e) => {
            // Only when the header itself is focused; keys on its nested buttons must activate those buttons.
            if (e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} module ${accessibleTitle}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-md-primary">{title}</span>
              {titleDetail && (
                <span className="text-sm text-md-on-surface-variant break-words">· {titleDetail}</span>
              )}
              {category && <Chip variant="default" size="sm">{category}</Chip>}
              {chips?.map((chip, idx) => (
                <React.Fragment key={idx}>{chip}</React.Fragment>
              ))}
            </div>
            {subtitle && (
              <p className="text-sm text-md-on-surface-variant mt-1.5 truncate">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            {rightExtras}
            {onRemove && (
              <ActionIconButton
                icon={Trash2}
                actionType="delete"
                onAction={onRemove}
                ariaLabel={`Remove ${accessibleTitle}`}
                confirmationMessage={removeConfirmMessage}
                confirmLabel={removeConfirmLabel}
              />
            )}
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {children}
    </Card>
  );
}
