import { Select } from "@/components/ui/Select";
import type { Material } from "@/lib/types";
import { FieldInputShell } from "./FieldInputShell";
import type { FieldRendererProps } from "./types";

interface MaterialSelectFieldInputProps extends FieldRendererProps {
  materialOptions: Material[];
  formatCurrency: (amount: number) => string;
}

export function MaterialSelectFieldInput({
  field,
  value,
  onChange,
  materialOptions,
  formatCurrency,
}: MaterialSelectFieldInputProps) {
  const materialCategory = field.materialCategory;

  const emptyCategoryMessage = materialCategory && materialOptions.length === 0 && (
    <p className="text-xs text-md-on-surface-variant mt-1">
      No materials available in category &quot;{materialCategory}&quot;. Please add materials or adjust
      the field&apos;s category.
    </p>
  );

  return (
    <FieldInputShell field={field} footer={emptyCategoryMessage}>
      <div className="h-[46px] flex items-center">
        <Select
          label=""
          value={value?.toString() || ""}
          onChange={(e) => onChange(e.target.value)}
          options={[
            { value: "", label: "Select a material..." },
            ...materialOptions.map((mat) => ({
              value: mat.variableName,
              label: `${mat.name} - ${formatCurrency(mat.price)}/${mat.unit}`,
            })),
          ]}
          className="w-full"
        />
      </div>
    </FieldInputShell>
  );
}
