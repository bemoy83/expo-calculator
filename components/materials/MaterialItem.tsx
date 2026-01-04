"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Material, MaterialProperty } from "@/lib/types";
import { Chip } from "@/components/ui/Chip";
import { Edit2 } from "lucide-react";
import { ModuleCardShell } from "@/components/shared/ModuleCardShell";
import { useCurrencyStore } from "@/lib/stores/currency-store";

interface MaterialItemProps {
  material: Material;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
  disableDrag?: boolean;
}

function formatPropertyValue(prop: MaterialProperty, variableName: string) {
  const base = `${variableName}.${prop.name}`;
  const unit = prop.unitSymbol || prop.unit;
  if (prop.type === "boolean") {
    const val = prop.value === true || prop.value === "true" ? "True" : "False";
    return `${base}: ${val}`;
  }
  return `${base}: ${String(prop.value)}${unit ? ` ${unit}` : ""}`;
}

export function MaterialItem({
  material,
  isCollapsed,
  onToggleCollapse,
  onEdit,
  onDelete,
  disableDrag = false,
}: MaterialItemProps) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: material.id,
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
      title={material.name}
      category={material.category}
      subtitle={material.supplier || undefined}
      isCollapsed={isCollapsed}
      onToggle={() => onToggleCollapse(material.id)}
      onRemove={() => onDelete(material.id)}
      removeConfirmMessage={`Are you sure you want to delete "${material.name}"?`}
      rightExtras={
        <>
          <span className="text-xl font-semibold text-success tabular-nums">
            {formatCurrency(material.price)}
          </span>
          <span className="text-xs text-md-on-surface-variant">/ {material.unit}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(material);
            }}
            className="p-2 text-md-on-surface-variant hover:text-md-primary hover:bg-md-surface-variant rounded-full transition-smooth active:scale-95"
            aria-label={`Edit material: ${material.name}`}
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
                Variables
              </span>
              <Chip size="sm" variant="primaryTonal">
                {material.variableName}
              </Chip>
              {material.sku && <Chip size="sm" variant="primaryTonal">SKU: {material.sku}</Chip>}
              {material.supplier && <Chip size="sm" variant="primaryTonal">{material.supplier}</Chip>}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs text-md-on-surface-variant uppercase tracking-wide">
              Description
            </span>
            <p className="text-sm text-md-on-surface-variant leading-relaxed">
              {material.description}
            </p>
          </div>
          {material.properties && material.properties.length > 0 && (
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-md-on-surface-variant uppercase tracking-wide">
                  Properties
                </span>
                <span className="text-xs text-md-on-surface-variant">
                  {material.properties.length}{" "}
                  {material.properties.length === 1 ? "property" : "properties"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {material.properties.map((prop) => (
                  <Chip
                    key={prop.id}
                    size="sm"
                    variant="outline"
                    title={formatPropertyValue(prop, material.variableName)}
                  >
                    {material.variableName}.{prop.name}
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
