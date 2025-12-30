"use client";

import React from "react";
import { Field, Material } from "@/lib/types";
import { normalizeToBase, convertFromBase } from "@/lib/units";
import { FieldHeader, FieldDescription } from "@/components/module-editor/FieldHeader";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { Link2, Unlink, X } from "lucide-react";

type LinkOption = { value: string; label: string };

interface LinkProps {
  canLink: boolean;
  isLinked: boolean;
  isLinkBroken: boolean;
  linkDisplayName: string;
  linkUIOpen: boolean;
  currentLinkValue: string;
  linkOptions: LinkOption[];
  onToggleLink: () => void;
  onLinkChange: (value: string) => void;
  onUnlink: () => void;
}

interface ModuleFieldInputProps {
  field: Field;
  value: string | number | boolean | undefined;
  materials: Material[];
  onChange: (val: string | number | boolean) => void; // expects base value
  linkProps?: LinkProps;
}

export function ModuleFieldInput({
  field,
  value,
  materials,
  onChange,
  linkProps,
}: ModuleFieldInputProps) {
  const isLinked = linkProps?.isLinked ?? false;
  const canLink = linkProps?.canLink ?? false;
  const linkUIOpenForField = linkProps?.linkUIOpen ?? false;

  const renderLinkStatus = () => {
    if (!linkProps || !linkProps.isLinked) return null;
    const { isLinkBroken, linkDisplayName, onUnlink } = linkProps;
    return (
      <div className="mt-2 flex items-center gap-2 p-2 rounded-md">
        {isLinkBroken ? (
          <X className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : (
          <Link2 className="h-3.5 w-3.5 text-md-primary shrink-0" />
        )}
        <span
          className={`text-xs flex-1 ${
            isLinkBroken ? "text-destructive" : "text-md-primary"
          }`}
        >
          {isLinkBroken
            ? "Link broken: source unavailable"
            : `Linked to: ${linkDisplayName}`}
        </span>
        <button
          type="button"
          onClick={onUnlink}
          className="h-6 text-xs text-md-on-surface-variant hover:text-md-on-surface inline-flex items-center gap-1"
        >
          <Unlink className="h-3 w-3" />
          {isLinkBroken ? "Remove Link" : "Unlink"}
        </button>
      </div>
    );
  };

  const renderLinkSelector = () => {
    if (!linkProps || !canLink || isLinked || !linkUIOpenForField) return null;
    const { currentLinkValue, linkOptions, onLinkChange } = linkProps;
    return (
      <div className="mt-2">
        <Select
          label="Link value from"
          value={currentLinkValue}
          onChange={(e) => onLinkChange(e.target.value)}
          options={linkOptions}
        />
      </div>
    );
  };

  switch (field.type) {
    case "number": {
      const displayValue =
        typeof value === "number"
          ? field.unitSymbol
            ? convertFromBase(value, field.unitSymbol)
            : value
          : 0;

      return (
        <div>
          <FieldHeader
            label={field.label}
            unit={field.unit}
            unitSymbol={field.unitSymbol}
            required={field.required}
            showLink={canLink}
            isLinked={isLinked}
            onLinkClick={() => linkProps?.onToggleLink()}
          />

          <div className="h-[46px] flex items-center">
            <Input
              type="number"
              value={displayValue.toString()}
              onChange={(e) => {
                if (isLinked) return;
                const inputValue = e.target.value === "" ? 0 : Number(e.target.value) || 0;
                const baseValue =
                  field.unitSymbol && typeof inputValue === "number"
                    ? normalizeToBase(inputValue, field.unitSymbol)
                    : inputValue;
                onChange(baseValue);
              }}
              required={field.required}
              disabled={isLinked}
              className="w-full"
            />
          </div>

          <FieldDescription description={field.description} />
          {renderLinkStatus()}
          {renderLinkSelector()}
        </div>
      );
    }
    case "boolean": {
      return (
        <div>
          <FieldHeader
            label={field.label}
            unit={field.unit}
            unitSymbol={field.unitSymbol}
            required={field.required}
            showLink={canLink}
            isLinked={isLinked}
            onLinkClick={() => linkProps?.onToggleLink()}
          />

          <div className="h-[46px] flex items-center">
            <Checkbox
              label=""
              checked={Boolean(value)}
              onChange={(e) => {
                if (isLinked) return;
                onChange(e.target.checked);
              }}
              disabled={isLinked}
            />
          </div>

          <FieldDescription description={field.description} />
          {renderLinkStatus()}
          {renderLinkSelector()}
        </div>
      );
    }
    case "dropdown": {
      const options = field.options || [];
      const isNumeric = field.dropdownMode === "numeric" && field.unitSymbol;
      const linkUIOpenForDropdown = linkUIOpenForField;

      if (isNumeric && field.unitSymbol) {
        const displayOptions = options.map((opt) => {
          const numValue = Number(opt.trim());
          return !isNaN(numValue) ? `${opt.trim()} ${field.unitSymbol}` : opt;
        });

        let currentDisplayValue = "";
        if (typeof value === "number") {
          const displayVal = convertFromBase(value, field.unitSymbol);
          const matchIdx = options.findIndex((opt) => {
            const optNum = Number(opt.trim());
            return !isNaN(optNum) && Math.abs(optNum - displayVal) < 0.0001;
          });
          currentDisplayValue =
            matchIdx >= 0 ? displayOptions[matchIdx] : `${displayVal} ${field.unitSymbol}`;
        } else {
          currentDisplayValue = value?.toString() || "";
        }

        return (
          <div>
            <FieldHeader
              label={field.label}
              unit={field.unit}
              unitSymbol={field.unitSymbol}
              required={field.required}
              showLink={canLink}
              isLinked={isLinked}
              onLinkClick={() => linkProps?.onToggleLink()}
            />

            <div className="h-[46px] flex items-center">
              <Select
                label=""
                value={currentDisplayValue}
                onChange={(e) => {
                  if (isLinked) return;
                  const selectedDisplay = e.target.value;
                  const match = selectedDisplay.match(/^([\d.]+)/);
                  if (match && field.unitSymbol) {
                    const numValue = Number(match[1]);
                    if (!isNaN(numValue)) {
                      const baseValue = normalizeToBase(numValue, field.unitSymbol);
                      onChange(baseValue);
                    }
                  }
                }}
                options={[
                  { value: "", label: "Select..." },
                  ...displayOptions.map((displayOpt) => ({
                    value: displayOpt,
                    label: displayOpt,
                  })),
                ]}
                disabled={isLinked}
                className="w-full"
              />
            </div>

            <FieldDescription description={field.description} />
            {renderLinkStatus()}
            {canLink && !isLinked && linkUIOpenForDropdown && renderLinkSelector()}
          </div>
        );
      }

      // String dropdown mode
      return (
        <div>
          <FieldHeader
            label={field.label}
            unit={field.unit}
            unitSymbol={field.unitSymbol}
            required={field.required}
            showLink={canLink}
            isLinked={isLinked}
            onLinkClick={() => linkProps?.onToggleLink()}
          />

          <div className="h-[46px] flex items-center">
            <Select
              label=""
              value={value?.toString() || ""}
              onChange={(e) => {
                if (isLinked) return;
                onChange(e.target.value);
              }}
              options={[
                { value: "", label: "Select..." },
                ...options.map((opt) => ({ value: opt, label: opt })),
              ]}
              disabled={isLinked}
              className="w-full"
            />
          </div>

          <FieldDescription description={field.description} />
          {renderLinkStatus()}
          {renderLinkSelector()}
        </div>
      );
    }
    case "material": {
      const materialCategory = field.materialCategory;
      let availableMaterials = materials;
      if (materialCategory && materialCategory.trim()) {
        availableMaterials = materials.filter((mat) => mat.category === materialCategory);
      }
      const sortedMaterials = availableMaterials.sort((a, b) => a.name.localeCompare(b.name));

      return (
        <div>
          <FieldHeader
            label={field.label}
            unit={field.unit}
            unitSymbol={field.unitSymbol}
            required={field.required}
          />

          <div className="h-[46px] flex items-center">
            <Select
              label=""
              value={value?.toString() || ""}
              onChange={(e) => onChange(e.target.value)}
              options={[
                { value: "", label: "Select a material..." },
                ...sortedMaterials.map((mat) => ({
                  value: mat.variableName,
                  label: `${mat.name} - $${mat.price.toFixed(2)}/${mat.unit}`,
                })),
              ]}
              className="w-full"
            />
          </div>

          <FieldDescription description={field.description} />
          {materialCategory && sortedMaterials.length === 0 && (
            <p className="text-xs text-md-on-surface-variant mt-1">
              No materials available in category &quot;{materialCategory}&quot;. Please add materials or adjust the field&apos;s category.
            </p>
          )}
        </div>
      );
    }
    case "text": {
      return (
        <div>
          <FieldHeader
            label={field.label}
            unit={field.unit}
            unitSymbol={field.unitSymbol}
            required={field.required}
            showLink={canLink}
            isLinked={isLinked}
            onLinkClick={() => linkProps?.onToggleLink()}
          />

          <div className="h-[46px] flex items-center">
            <Input
              label=""
              value={value?.toString() || ""}
              onChange={(e) => {
                if (isLinked) return;
                onChange(e.target.value);
              }}
              required={field.required}
              disabled={isLinked}
              className="w-full"
            />
          </div>

          <FieldDescription description={field.description} />
          {renderLinkStatus()}
          {renderLinkSelector()}
        </div>
      );
    }
    default:
      return null;
  }
}
