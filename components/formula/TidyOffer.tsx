'use client';

import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// "The spacing can be tidied" with a preview and a button, shown under a formula after it has
// rested (see useTidyOffer). The formula keeps focus on mousedown: leaving it would drop the hint
// above this line and shift it from under the click.
export function TidyOffer({ tidied, onApply }: { tidied: string; onApply: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 text-xs" onMouseDown={(event) => event.preventDefault()}>
      <span className="text-ink-muted">The spacing can be tidied.</span>
      <Button variant="ghost" size="sm" onClick={onApply} className="px-2">
        <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          Tidy up <span className="font-numeric text-ink-faint">· {tidied.length > 40 ? `${tidied.slice(0, 40)}…` : tidied}</span>
        </span>
      </Button>
    </div>
  );
}
