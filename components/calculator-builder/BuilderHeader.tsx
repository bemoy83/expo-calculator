import { Trash2, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Segmented } from '@/components/ui/Segmented';
import { Breadcrumb, browseHref } from '@/components/shared/Breadcrumb';
import { HeaderDivider } from '@/components/shared/HeaderDivider';
import { PageHeader } from '@/components/shared/PageHeader';
import { SaveButton } from '@/components/shared/SaveButton';
import type { BuilderStatus } from '@/lib/calculator/builder-status';

interface BuilderHeaderProps {
  calculatorId: string;
  isSaved: boolean;
  dirty: boolean;
  nameDraft: string;
  nameError?: string;
  category: string;
  view: 'parts' | 'layout';
  status?: BuilderStatus;
  onNameChange: (name: string) => void;
  onViewChange: (view: 'parts' | 'layout') => void;
  onDelete: () => void;
  onClose: () => void;
  onSave: () => void;
}

// The builder's page header: where it is, the name, how the steps are doing, and the tools.
export function BuilderHeader({
  calculatorId,
  isSaved,
  dirty,
  nameDraft,
  nameError,
  category,
  view,
  status,
  onNameChange,
  onViewChange,
  onDelete,
  onClose,
  onSave,
}: BuilderHeaderProps) {
  return (
    <PageHeader
      eyebrow={
        <Breadcrumb
          items={[
            { label: 'Calculators', href: browseHref('/', { id: isSaved ? calculatorId : undefined }) },
            ...(category ? [{ label: category, href: browseHref('/', { category, id: isSaved ? calculatorId : undefined }) }] : []),
            ...(isSaved ? [{ label: nameDraft.trim() || 'Calculator', href: `/calculator?id=${encodeURIComponent(calculatorId)}` }] : []),
          ]}
          meta={`Editing${dirty ? ' · Unsaved' : ''}`}
        />
      }
      editing
      title={
        <input
          id="calculator-name"
          value={nameDraft}
          placeholder="New calculator"
          aria-label="Calculator name"
          aria-invalid={nameError ? 'true' : undefined}
          size={Math.max(nameDraft.length, 14)}
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full min-w-0 bg-transparent placeholder:text-ink-faint focus:outline-none"
        />
      }
      status={status}
      description={nameError && <span className="text-danger">{nameError}</span>}
      actions={
        <>
          <Segmented
            aria-label="Builder view"
            options={[
              { value: 'parts', label: 'Parts' },
              { value: 'layout', label: 'Layout' },
            ]}
            value={view}
            onChange={onViewChange}
          />
          <HeaderDivider />
          {isSaved && (
            <IconButton
              label="Delete calculator"
              size="lg"
              variant="danger"
              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              onClick={onDelete}
            />
          )}
          <IconButton label="Close" size="lg" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={onClose} />
          <SaveButton dirty={dirty} onClick={onSave} />
        </>
      }
    />
  );
}
