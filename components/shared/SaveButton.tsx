import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// The editor header's Save: the page's one accent button, icon only. A dot on it says there are
// unsaved edits. ⌘S / Ctrl+S saves too.
export function SaveButton({ dirty, onClick }: { dirty: boolean; onClick: () => void }) {
  const label = dirty ? 'Save changes (⌘S)' : 'Save (⌘S)';
  return (
    <Button variant="accent" onClick={onClick} title={label} aria-label={label} className="relative shrink-0 w-9 px-0">
      <Save className="h-4 w-4" aria-hidden="true" />
      {dirty && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-ink ring-2 ring-canvas"
        />
      )}
    </Button>
  );
}
