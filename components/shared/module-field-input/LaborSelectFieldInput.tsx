import { Select } from "@/components/ui/Select";
import type { Labor } from "@/lib/types";
import { FieldInputShell } from "./FieldInputShell";
import type { FieldRendererProps } from "./types";

interface LaborSelectFieldInputProps extends FieldRendererProps {
  laborOptions: Labor[];
  formatCurrency: (amount: number) => string;
}

export function LaborSelectFieldInput({
  field,
  value,
  onChange,
  laborOptions,
  formatCurrency,
}: LaborSelectFieldInputProps) {
  const laborCategory = field.laborCategory;

  const emptyCategoryMessage = laborCategory && laborOptions.length === 0 && (
    <p className="text-xs text-md-on-surface-variant mt-1">
      No labor available in category &quot;{laborCategory}&quot;. Please add labor or adjust the
      field&apos;s category.
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
            { value: "", label: "Select labor..." },
            ...laborOptions.map((l) => ({
              value: l.variableName,
              label: `${l.name} - ${formatCurrency(l.cost)}/hour`,
            })),
          ]}
          className="w-full"
        />
      </div>
    </FieldInputShell>
  );
}
