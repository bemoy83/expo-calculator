"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Plus, Package, LayoutDashboard } from "lucide-react";
import { CalculationModule, ModuleTemplate } from "@/lib/types";

const SECTION_HEADING = "text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted mb-2";
const PICKER_ITEM =
  "w-full h-9 inline-flex items-center px-3 rounded-md border border-border-strong bg-surface text-[13px] font-medium text-ink hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action";

interface ModulePickerCardProps {
  title?: string;
  show: boolean;
  allCategories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  filteredModules: CalculationModule[];
  filteredTemplates?: ModuleTemplate[]; // optional, only shown if provided
  modulesCount: number;
  templatesCount?: number;
  onAddModule: (moduleId: string) => void;
  onApplyTemplate?: (templateId: string) => void;
  onClose: () => void;
  /** Which lists to show; the Quote Builder's "From template" opens templates only. */
  section?: "all" | "modules" | "templates";
}

export function ModulePickerCard({
  title = "Select Module to Add",
  show,
  allCategories,
  selectedCategory,
  onSelectCategory,
  filteredModules,
  filteredTemplates = [],
  modulesCount,
  templatesCount = 0,
  onAddModule,
  onApplyTemplate,
  onClose,
  section = "all",
}: ModulePickerCardProps) {
  if (!show) return null;

  const showModules = section !== "templates";
  const showTemplates = section !== "modules" && !!onApplyTemplate && templatesCount > 0;

  return (
    <Card
      title={title}
      actions={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {allCategories.length > 0 && (
        <div className="mb-4 pb-3 border-b border-border">
          <div className="flex flex-wrap gap-1.5">
            <Chip
              size="sm"
              variant={selectedCategory === null ? "selected" : "default"}
              onClick={() => onSelectCategory(null)}
            >
              All
            </Chip>
            {allCategories.map((category) => (
              <Chip
                key={category}
                size="sm"
                variant={selectedCategory === category ? "selected" : "default"}
                onClick={() => onSelectCategory(category)}
              >
                {category}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {showModules && (
        <div className="mb-5 last:mb-0">
          <h4 className={SECTION_HEADING}>Modules</h4>
          {filteredModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredModules.map((module) => (
                <button key={module.id} type="button" onClick={() => onAddModule(module.id)} className={PICKER_ITEM}>
                  <Plus className="h-4 w-4 mr-2 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="truncate flex-1 text-left">{module.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              {selectedCategory ? `No modules in "${selectedCategory}" category.` : "No modules available."}
            </p>
          )}
        </div>
      )}

      {showTemplates && (
        <div>
          <h4 className={SECTION_HEADING}>Templates</h4>
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onApplyTemplate?.(template.id)}
                  className={PICKER_ITEM}
                >
                  <Package className="h-4 w-4 mr-2 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="truncate flex-1 text-left">{template.name}</span>
                  <span className="ml-2 text-[11px] font-numeric text-ink-faint shrink-0">
                    {template.moduleInstances.length}{" "}
                    {template.moduleInstances.length === 1 ? "module" : "modules"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              {selectedCategory ? `No templates in "${selectedCategory}" category.` : "No templates available."}
            </p>
          )}
        </div>
      )}

      {section === "templates" && !showTemplates && (
        <p className="text-sm text-ink-muted">
          No templates yet. Save a workspace as a template to reuse it here.
        </p>
      )}

      {showModules && modulesCount === 0 && !showTemplates && (
        <div className="text-center py-8">
          <LayoutDashboard className="h-8 w-8 text-ink-faint mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-ink-muted">No modules available.</p>
          <p className="text-xs text-ink-faint mt-1">Create modules first to add them to quotes.</p>
        </div>
      )}
    </Card>
  );
}
