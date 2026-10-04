import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
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

const ICON = 'h-4 w-4';

/** Duplicate · Move up · Move down · Remove, for a line named `name`. Handlers are left out where the actions are only drawn. */
export function lineActions(
  name: string,
  handlers: { onDuplicate?: () => void; onMove?: (direction: -1 | 1) => void; onRemove?: () => void; isFirst?: boolean; isLast?: boolean } = {},
  /** False for a line that can't be copied (its calculator is gone) */
  canDuplicate = true
): LineAction[] {
  const { onDuplicate, onMove, onRemove, isFirst, isLast } = handlers;
  return [
    ...(canDuplicate
      ? [{ label: 'Duplicate', ariaLabel: `Duplicate ${name}`, icon: <Copy className={ICON} aria-hidden="true" />, onClick: onDuplicate }]
      : []),
    { label: 'Move up', ariaLabel: `Move ${name} up`, icon: <ArrowUp className={ICON} aria-hidden="true" />, onClick: () => onMove?.(-1), disabled: isFirst },
    { label: 'Move down', ariaLabel: `Move ${name} down`, icon: <ArrowDown className={ICON} aria-hidden="true" />, onClick: () => onMove?.(1), disabled: isLast },
    { label: 'Remove', ariaLabel: `Remove ${name} from the quote`, icon: <Trash2 className={ICON} aria-hidden="true" />, onClick: onRemove, danger: true },
  ];
}

// The pieces of a quote line editor (mockup 2a) that the calculator layout editor's "Quote line"
// preview draws too, so the two can't drift apart.

/**
 * The line's header: its name on the quote, the calculator chip and the icon actions. With a
 * colour it is a solid band that runs edge to edge across the scroller it sits in, cancelling
 * its padding. `preview` is the layout editor's copy: it pads itself (and gives an uncoloured
 * header a canvas ground), and draws the name and actions without letting them be used.
 */
export function LineHeader({
  color,
  nickname,
  placeholder,
  calculatorName,
  actions,
  onNicknameChange,
  preview = false,
}: {
  /** A CSS colour: the calculator's line colour */
  color?: string;
  nickname: string;
  placeholder: string;
  calculatorName: string;
  actions: LineAction[];
  onNicknameChange?: (nickname: string) => void;
  preview?: boolean;
}) {
  return (
    <div
      style={color ? { backgroundColor: color } : undefined}
      className={cn(
        'flex flex-wrap items-center gap-3',
        preview
          ? cn('px-8 pt-[22px] pb-[18px]', color ? 'text-[var(--on-line)]' : 'bg-canvas text-ink')
          : color && '-mx-4 sm:-mx-8 -mt-6 px-4 sm:px-8 pt-[22px] pb-[18px] text-[var(--on-line)]',
        preview && '[&_button]:pointer-events-none [&_input]:pointer-events-none'
      )}
    >
      <input
        value={nickname}
        placeholder={placeholder}
        onChange={(event) => onNicknameChange?.(event.target.value)}
        readOnly={preview}
        tabIndex={preview ? -1 : undefined}
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
        {actions.map((action) => (
          <IconButton
            key={action.label}
            label={action.label}
            aria-label={action.ariaLabel}
            // On a colour the icons follow the band: --on-line, with a --on-line-soft hover.
            size={color ? 'md' : 'lg'}
            variant={action.danger && !color ? 'danger' : 'default'}
            className={color ? 'text-[var(--on-line)] hover:bg-[var(--on-line-soft)] hover:text-[var(--on-line)] rounded-lg' : undefined}
            icon={action.icon}
            onClick={action.onClick}
            disabled={action.disabled}
            tabIndex={preview ? -1 : undefined}
          />
        ))}
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
