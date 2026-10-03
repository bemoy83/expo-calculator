import { AlertCircle } from 'lucide-react';
import { isStepShown, showsStaffResults } from '@/lib/calculator/editing';
import { stepDisplayLabel } from '@/lib/calculator/format';
import type { Calculator } from '@/lib/calculator/types';

const BANNER = 'mb-4 flex items-start gap-2.5 p-3 bg-draft-bg border border-draft-border rounded-row';

// What staff would be missing: no results at all, or results with no label.
export function BuilderWarnings({ calculator }: { calculator: Calculator }) {
  const showsNothing = calculator.steps.length > 0 && !showsStaffResults(calculator);
  const unnamedShown = calculator.steps.filter((step) => !step.label.trim() && isStepShown(calculator, step.id));
  return (
    <>
      {showsNothing && (
        <div role="status" className={BANNER}>
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-draft" aria-hidden="true" />
          <p className="text-sm text-ink-body">
            <span className="font-medium text-ink">Staff won&apos;t see any results.</span> Tick &ldquo;Show to staff&rdquo; on a
            step, or make a step a part&apos;s cost, so the calculator shows what it works out.
          </p>
        </div>
      )}
      {!showsNothing && unnamedShown.length > 0 && (
        <div role="status" className={BANNER}>
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-draft" aria-hidden="true" />
          <p className="text-sm text-ink-body">
            <span className="font-medium text-ink">
              {unnamedShown.length === 1 ? 'A step shown to staff has no label.' : `${unnamedShown.length} steps shown to staff have no label.`}
            </span>{' '}
            Staff see {unnamedShown.map((step) => `“${stepDisplayLabel(step)}”`).join(', ')} instead; give{' '}
            {unnamedShown.length === 1 ? 'it a label' : 'them labels'} that say what they are.
          </p>
        </div>
      )}
    </>
  );
}
