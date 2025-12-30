"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Plus, Package, LayoutDashboard } from "lucide-react";
import { CalculationModule, ModuleTemplate } from "@/lib/types";

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
}: ModulePickerCardProps) {
  if (!show) return null;

  return (
    <Card
      title={title}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="rounded-full"
        >
          Cancel
        </Button>
      }
    >
      {allCategories.length > 0 && (
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex flex-wrap gap-2">
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

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-md-primary mb-3">
          Single Modules
        </h4>
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredModules.map((module) => (
              <button
                key={module.id}
                onClick={() => onAddModule(module.id)}
                className="font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-md-surface inline-flex items-center justify-center active:scale-[0.98] bg-md-primary text-md-on-primary focus:ring-md-primary elevation-1 hover-glow hover-overlay px-4 py-2 text-base w-full"
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate flex-1 text-left">{module.name}</span>
                {module.category && (
                  <Chip size="sm" className="ml-2 shrink-0">
                    {module.category}
                  </Chip>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-md-on-surface-variant">
            {selectedCategory
              ? `No modules in "${selectedCategory}" category.`
              : "No modules available."}
          </p>
        )}
      </div>

      {onApplyTemplate && templatesCount > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-md-primary mb-3">
            Module Templates
          </h4>
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onApplyTemplate(template.id)}
                  className="font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-md-surface inline-flex items-center justify-center active:scale-[0.98] bg-md-primary text-md-on-primary focus:ring-md-primary elevation-1 hover-glow hover-overlay px-4 py-2 text-base w-full"
                >
                  <Package className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate flex-1 text-left">{template.name}</span>
                  <span className="ml-2 px-2 py-0.5 bg-md-primary/20 text-md-primary text-xs rounded-full shrink-0">
                    {template.moduleInstances.length}{" "}
                    {template.moduleInstances.length === 1 ? "module" : "modules"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-md-on-surface-variant">
              {selectedCategory
                ? `No templates in "${selectedCategory}" category.`
                : "No templates available."}
            </p>
          )}
        </div>
      )}

      {modulesCount === 0 && (!onApplyTemplate || templatesCount === 0) && (
        <div className="text-center py-8">
          <LayoutDashboard className="h-10 w-10 text-md-on-surface-variant mx-auto mb-3 opacity-50" />
          <p className="text-sm text-md-on-surface-variant">No modules available.</p>
          <p className="text-xs text-md-on-surface-variant mt-1">
            Create modules first to add them to quotes.
          </p>
        </div>
      )}
    </Card>
  );
}
