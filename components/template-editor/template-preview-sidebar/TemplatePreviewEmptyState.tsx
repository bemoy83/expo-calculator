import { Card } from "@/components/ui/Card";
import { Link2 } from "lucide-react";

export function TemplatePreviewEmptyState() {
  return (
    <Card density="dense">
      <div className="text-center py-6">
        <Link2 className="h-8 w-8 text-ink-faint mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-ink-muted">
          Add modules to see how their fields can share values.
        </p>
      </div>
    </Card>
  );
}
