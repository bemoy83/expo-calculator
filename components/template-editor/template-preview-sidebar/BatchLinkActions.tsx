import { Button } from "@/components/ui/Button";

interface BatchLinkActionsProps {
  opportunityCount: number;
  excellentCount: number;
  goodCount: number;
  onBatchLink: (minConfidence: number) => void;
}

// "Exact" = same field name and unit (score ≥ 80); "close" adds similar names or compatible
// units (≥ 60). Thresholds unchanged; only the wording is plain.
export function BatchLinkActions({ opportunityCount, excellentCount, goodCount, onBatchLink }: BatchLinkActionsProps) {
  if (opportunityCount <= 1 || (excellentCount === 0 && goodCount === 0)) return null;

  return (
    <div className="pt-3 border-t border-border flex flex-wrap gap-2">
      {excellentCount > 0 && (
        <Button size="sm" onClick={() => onBatchLink(80)} title="Same field name and unit">
          Link {excellentCount} exact {excellentCount === 1 ? "match" : "matches"}
        </Button>
      )}
      {goodCount > excellentCount && (
        <Button size="sm" variant="secondary" onClick={() => onBatchLink(60)} title="Also similar names or compatible units">
          Link {goodCount} close {goodCount === 1 ? "match" : "matches"}
        </Button>
      )}
    </div>
  );
}
