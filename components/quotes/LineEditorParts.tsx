import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { ResultRow } from '@/components/live/ResultRow';
import { cn } from '@/lib/utils';

export interface LineAction {
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}

// The pieces of a quote line editor (mockup 2a) that the calculator layout editor's "Quote line"
// preview draws too, so the two can't drift apart.

/**
 * The line's header: its name on the quote, the calculator chip and the icon actions. With a
 * colour it is a solid band. `bleed` cancels the padding of the scroller it sits in so the band
 * runs edge to edge; `framed` pads it itself (and gives an uncoloured header a canvas ground),
 * and `inert` draws the name and actions without letting them be used (the layout preview).
 */
export function LineHeader({
  color,
  nickname,
  placeholder,
  calculatorName,
  actions,
  onNicknameChange,
  placement = 'bleed',
  inert = false,
}: {
  /** A CSS colour: the calculator's line colour */
  color?: string;
  nickname: string;
  placeholder: string;
  calculatorName: string;
  actions: LineAction[];
  onNicknameChange?: (nickname: string) => void;
  placement?: 'bleed' | 'framed';
  inert?: boolean;
}) {
  return (
    <div
      style={color ? { backgroundColor: color } : undefined}
      className={cn(
        'flex flex-wrap items-center gap-3',
        placement === 'framed'
          ? cn('px-8 pt-[22px] pb-[18px]', color ? 'text-[var(--on-line)]' : 'bg-canvas text-ink')
          : color && '-mx-4 sm:-mx-8 -mt-6 px-4 sm:px-8 pt-[22px] pb-[18px] text-[var(--on-line)]',
        inert && '[&_button]:pointer-events-none [&_input]:pointer-events-none'
      )}
    >
      <input
        value={nickname}
        placeholder={placeholder}
        onChange={(event) => onNicknameChange?.(event.target.value)}
        readOnly={inert}
        tabIndex={inert ? -1 : undefined}
        aria-label="Name on the quote"
        className={cn(
          'flex-1 min-w-[12rem] pb-1.5 bg-transparent border-b text-[22px] font-bold tracking-[-.02em] focus:outline-none transition-colors',
          color
            ? 'border-[var(--on-line-rule)] text-[var(--on-line)] placeholder:text-[var(--on-line)] focus:placeholder:text-[var(--on-line-rule)] focus:border-[var(--on-line)] caret-[var(--on-line)]'
            : 'border-border-strong text-ink placeholder:text-ink focus:placeholder:text-ink-faint focus:border-accent'
        )}
      />
      <span className={cn('px-2.5 py-[5px] rounded-full text-xs', color ? 'bg-[var(--on-line-soft)] text-[var(--on-line)]' : 'bg-sunken text-ink-muted')}>
        {calculatorName}
      </span>
      <div className="flex gap-0.5">
        {actions.map((action) =>
          color ? (
            <button
              key={action.label}
              type="button"
              title={action.label}
              aria-label={action.ariaLabel}
              onClick={action.onClick}
              disabled={action.disabled}
              tabIndex={inert ? -1 : undefined}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--on-line)] transition-colors duration-150 hover:bg-[var(--on-line-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {action.icon}
            </button>
          ) : (
            <IconButton
              key={action.label}
              label={action.label}
              aria-label={action.ariaLabel}
              size="lg"
              variant={action.danger ? 'danger' : 'default'}
              icon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
              tabIndex={inert ? -1 : undefined}
            />
          )
        )}
      </div>
    </div>
  );
}

/** The line total under the form: a pill when the calculator has a colour, "Not finished" when it isn't worked out. */
export function LineTotal({ color, value, unfinished }: { color?: string; value: string; unfinished?: string }) {
  return (
    <div className="border-t border-border pt-[18px]">
      {unfinished ? (
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-semibold text-ink">Line total</span>
          <span className="flex-1" />
          <span className="text-sm text-draft">Not finished · {unfinished}</span>
        </div>
      ) : (
        <ResultRow label="Line total" value={value} total totalColor={color} />
      )}
    </div>
  );
}
