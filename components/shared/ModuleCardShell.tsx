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
  removeConfirmation?: { title: string; message?: string };
  removeConfirmLabel?: string;
  rightExtras?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Shared shell for collapsible cards (function parameters) to keep header styling consistent.
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
  removeConfirmation,
  removeConfirmLabel = 'Remove',
  rightExtras,
  children,
}: ModuleCardShellProps) {
  const chips = metaChips?.filter(Boolean);
  const accessibleTitle = titleDetail ? `${title}, ${titleDetail}` : title;

  return (
    // Compact header (design: row actions and metadata on one line); callers' bodies bring
    // their own padding and top border.
    <Card ref={cardRef} style={style} className="p-0 overflow-hidden">
      <div className="flex items-center pl-2">
        <button
          {...dragHandleProps.attributes}
          {...(dragHandleProps.listeners || {})}
          className="p-1 rounded text-ink-subtle hover:text-ink cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          aria-label={`Drag to reorder ${accessibleTitle}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <div
          className="flex items-center justify-between flex-1 min-w-0 px-2.5 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action"
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
          aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${accessibleTitle}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-ink">{title}</span>
              {titleDetail && (
                <span className="text-sm text-ink-muted break-words">· {titleDetail}</span>
              )}
              {category && <Chip variant="default" size="sm">{category}</Chip>}
              {chips?.map((chip, idx) => (
                <React.Fragment key={idx}>{chip}</React.Fragment>
              ))}
            </div>
            {subtitle && (
              <p className="text-xs text-ink-muted mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-3 shrink-0 text-ink-muted">
            {rightExtras}
            {onRemove && (
              <ActionIconButton
                icon={Trash2}
                actionType="delete"
                onAction={onRemove}
                ariaLabel={`Remove ${accessibleTitle}`}
                confirmation={removeConfirmation}
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
