import { Card } from "@/components/ui/Card";
import { Link2 } from "lucide-react";

export function TemplatePreviewEmptyState() {
  return (
    <div className="lg:col-span-2">
      <Card className="sticky top-[88px] z-40">
        <div className="text-center py-8">
          <Link2 className="h-12 w-12 text-md-on-surface-variant/30 mx-auto mb-3" />
          <p className="text-sm text-md-on-surface-variant">
            Add modules to see link analysis
          </p>
        </div>
      </Card>
    </div>
  );
}
