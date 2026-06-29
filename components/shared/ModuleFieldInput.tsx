"use client";

import { useMemo } from "react";
import {
  createCatalogIndex,
  getSortedLaborForCategory,
  getSortedMaterialsForCategory,
} from "@/lib/calculations/catalog-index";
import { useCurrencyStore } from "@/lib/stores/currency-store";
import { BooleanFieldInput } from "./module-field-input/BooleanFieldInput";
import { DropdownFieldInput } from "./module-field-input/DropdownFieldInput";
import { LaborSelectFieldInput } from "./module-field-input/LaborSelectFieldInput";
import { MaterialSelectFieldInput } from "./module-field-input/MaterialSelectFieldInput";
import { NumberFieldInput } from "./module-field-input/NumberFieldInput";
import { TextFieldInput } from "./module-field-input/TextFieldInput";
import type { ModuleFieldInputProps } from "./module-field-input/types";

export type { LinkOption, LinkProps, ModuleFieldInputProps } from "./module-field-input/types";

export function ModuleFieldInput({
  field,
  value,
  materials = [],
  labor = [],
  onChange,
  linkProps,
}: ModuleFieldInputProps) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const isLinked = linkProps?.isLinked ?? false;
  const canLink = linkProps?.canLink ?? false;

  const catalogIndex = useMemo(() => createCatalogIndex(materials, labor), [materials, labor]);
  const materialOptions = useMemo(
    () => getSortedMaterialsForCategory(catalogIndex, field.materialCategory),
    [catalogIndex, field.materialCategory]
  );
  const laborOptions = useMemo(
    () => getSortedLaborForCategory(catalogIndex, field.laborCategory),
    [catalogIndex, field.laborCategory]
  );

  const commonProps = {
    field,
    value,
    onChange,
    isLinked,
    canLink,
    linkProps,
  };

  switch (field.type) {
    case "number":
      return <NumberFieldInput {...commonProps} />;
    case "boolean":
      return <BooleanFieldInput {...commonProps} />;
    case "dropdown":
      return <DropdownFieldInput {...commonProps} />;
    case "material":
      return (
        <MaterialSelectFieldInput
          {...commonProps}
          materialOptions={materialOptions}
          formatCurrency={formatCurrency}
        />
      );
    case "labor":
      return (
        <LaborSelectFieldInput
          {...commonProps}
          laborOptions={laborOptions}
          formatCurrency={formatCurrency}
        />
      );
    case "text":
      return <TextFieldInput {...commonProps} />;
    default:
      return null;
  }
}
