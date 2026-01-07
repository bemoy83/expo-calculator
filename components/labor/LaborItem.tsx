"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Labor, LaborProperty } from "@/lib/types";
import { Chip } from "@/components/ui/Chip";
import { Edit2 } from "lucide-react";
import { ModuleCardShell } from "@/components/shared/ModuleCardShell";
import { useCurrencyStore } from "@/lib/stores/currency-store";

interface LaborItemProps {
  labor: Labor;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onEdit: (labor: Labor) => void;
  onDelete: (id: string) => void;
  disableDrag?: boolean;
}

function formatPropertyValue(prop: LaborProperty, variableName: string) {
  const base = `${variableName}.${prop.name}`;
  const unit = prop.unitSymbol;
  return `${base}: ${String(prop.value)}${unit ? ` ${unit}` : ""}`;
}

export function LaborItem({
  labor,
  isCollapsed,
  onToggleCollapse,
  onEdit,
  onDelete,
  disableDrag = false,
}: LaborItemProps) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: labor.id,
    disabled: disableDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : "auto",
  };

  return (
    <ModuleCardShell
      cardRef={setNodeRef}
      style={style}
      dragHandleProps={disableDrag ? { attributes: {}, listeners: {} } : { attributes, listeners }}
      title={labor.name}
      category={labor.category}
      isCollapsed={isCollapsed}
      onToggle={() => onToggleCollapse(labor.id)}
      onRemove={() => onDelete(labor.id)}
      removeConfirmMessage={`Are you sure you want to delete "${labor.name}"?`}
      rightExtras={
        <>
          <span className="text-xl font-semibold text-success tabular-nums">
            {formatCurrency(labor.cost)}
          </span>
          <span className="text-xs text-md-on-surface-variant">/ hour</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(labor);
            }}
            className="p-2 text-md-on-surface-variant hover:text-md-primary hover:bg-md-surface-variant rounded-full transition-smooth active:scale-95"
            aria-label={`Edit labor: ${labor.name}`}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      }
    >
      {!isCollapsed && (
        <div className="px-4 pb-3 space-y-5">
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs text-md-on-surface-variant uppercase tracking-wide shrink-0">
                Variable
              </span>
              <Chip size="sm" variant="primaryTonal">
                {labor.variableName}
              </Chip>
            </div>
          </div>
          {labor.description && (
            <div className="space-y-1.5">
              <span className="text-xs text-md-on-surface-variant uppercase tracking-wide">
                Description
              </span>
              <p className="text-sm text-md-on-surface-variant leading-relaxed">
                {labor.description}
              </p>
            </div>
          )}
          {labor.properties && labor.properties.length > 0 && (
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-md-on-surface-variant uppercase tracking-wide">
                  Properties
                </span>
                <span className="text-xs text-md-on-surface-variant">
                  {labor.properties.length}{" "}
                  {labor.properties.length === 1 ? "property" : "properties"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {labor.properties.map((prop) => (
                  <Chip
                    key={prop.id}
                    size="sm"
                    variant="outline"
                    title={formatPropertyValue(prop, labor.variableName)}
                  >
                    {labor.variableName}.{prop.name}
                    {prop.unitSymbol && (
                      <span className="ml-1">({prop.unitSymbol})</span>
                    )}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ModuleCardShell>
  );
}

