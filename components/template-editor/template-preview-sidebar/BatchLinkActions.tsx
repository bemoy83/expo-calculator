import { Button } from "@/components/ui/Button";
import { Zap } from "lucide-react";

interface BatchLinkActionsProps {
  opportunityCount: number;
  excellentCount: number;
  goodCount: number;
  onBatchLink: (minConfidence: number) => void;
}

export function BatchLinkActions({
  opportunityCount,
  excellentCount,
  goodCount,
  onBatchLink,
}: BatchLinkActionsProps) {
  if (opportunityCount <= 1) return null;

  return (
    <div className="pt-4 border-t border-border/50 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-md-primary" />
        <span className="text-xs font-semibold text-md-primary uppercase tracking-wide">
          Batch Actions
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onBatchLink(80)}
          disabled={excellentCount === 0}
          variant="primary"
          size="sm"
          className="text-xs font-medium transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
          title={`Link ${excellentCount} suggestion${
            excellentCount !== 1 ? "s" : ""
          } with 80% or higher confidence`}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>Link Excellent</span>
            </div>
            <span className="text-[10px] opacity-80">({excellentCount} at ≥80%)</span>
          </div>
        </Button>
        <Button
          onClick={() => onBatchLink(60)}
          disabled={goodCount === 0}
          variant="secondary"
          size="sm"
          className="text-xs font-medium transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
          title={`Link ${goodCount} suggestion${
            goodCount !== 1 ? "s" : ""
          } with 60% or higher confidence`}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>Link Good</span>
            </div>
            <span className="text-[8px] opacity-80">({goodCount} at ≥60%)</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
