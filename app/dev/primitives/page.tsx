'use client';

// TEMPORARY review page for the Ledger redesign's Phase 2 primitives. Delete before the
// redesign branch merges (the screens in Phase 4 use these for real).

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Plus } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { PageHeader } from '@/components/shared/PageHeader';
import { CatalogTabs } from '@/components/shared/catalog/CatalogTabs';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';
import { Textarea } from '@/components/ui/Textarea';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { DashedAdd } from '@/components/ui/DashedAdd';
import { LedgerRow, LedgerTable } from '@/components/ui/LedgerTable';
import { RailRow } from '@/components/ui/RailRow';
import { FormulaWell } from '@/components/formula/FormulaWell';
import { CommitBlock } from '@/components/live/CommitBlock';
import { LiveLabel } from '@/components/live/LiveLabel';
import { ResultRow } from '@/components/live/ResultRow';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <Eyebrow as="h2">{title}</Eyebrow>
      {children}
    </section>
  );
}

export default function PrimitivesPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [tab, setTab] = useState('quotes');
  const [catalogTab, setCatalogTab] = useState('materials');
  const [view, setView] = useState('parts');
  const [cc, setCc] = useState('60');
  const [filter, setFilter] = useState('all');
  const [insulate, setInsulate] = useState(true);
  const [rail, setRail] = useState(1);
  const [ledger, setLedger] = useState(0);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar
        tabs={[
          { id: 'calculators', label: 'Calculators' },
          { id: 'quotes', label: 'Quotes' },
          { id: 'catalog', label: 'Catalog' },
        ]}
        active={tab}
        onSelect={setTab}
        right={
          <Button variant="ghost" size="sm" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        }
      />
      <PageHeader
        eyebrow="Ledger redesign · Phase 2"
        title="Primitives"
        description="Temporary review page. Every piece in its states, in the current theme."
        actions={
          <>
            <Button variant="secondary">Export JSON</Button>
            <Button variant="accent" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              New calculator
            </Button>
          </>
        }
      />
      <PageHeader
        eyebrow="Catalog"
        title="Materials"
        actions={<Button variant="accent">+ New material</Button>}
      >
        <CatalogTabs
          items={[
            { id: 'materials', label: 'Materials', count: 24 },
            { id: 'labor', label: 'Labor', count: 9 },
            { id: 'functions', label: 'Functions', count: 6 },
          ]}
          active={catalogTab}
          onSelect={setCatalogTab}
        />
      </PageHeader>
      <PageHeader
        eyebrow="Calculators / Vegger · Editing · Unsaved"
        title="Bindingsverk"
        editing
        status={{ tone: 'error', label: '1 step has an error' }}
        actions={
          <>
            <Segmented
              options={[
                { value: 'parts', label: 'Parts' },
                { value: 'layout', label: 'Layout' },
              ]}
              value={view}
              onChange={setView}
            />
            <Button variant="secondary">Cancel</Button>
            <Button variant="accent">Save</Button>
          </>
        }
      />

      <div className="grid gap-10 p-6 lg:grid-cols-[1fr_1fr_360px]">
        <div className="space-y-10 min-w-0">
          <Section title="Buttons">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="accent">Accent</Button>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm">
                Small 32
              </Button>
              <Button variant="secondary">Medium 36</Button>
              <Button variant="secondary" size="lg">
                Large 44
              </Button>
            </div>
            <Button variant="primary" block>
              Save material
            </Button>
          </Section>

          <Section title="Fields">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Høyde" unit="m">
                <Input type="number" size="large" defaultValue="2.5" />
              </Field>
              <Field label="Lengde" unit="m" hint="Outside wall">
                <Input type="number" defaultValue="4" />
              </Field>
              <Field label="Bredde" unit="m" error="Enter a number">
                <Input type="number" size="compact" defaultValue="" />
              </Field>
              <Field label="Name" span={2}>
                <Input defaultValue="Gable end" />
              </Field>
              <Field label="Disabled">
                <Input defaultValue="Locked" disabled />
              </Field>
              <Field label="Material" span={2}>
                <Select
                  options={[
                    { value: 'kv48', label: 'K.VIRKE 48x98', meta: '37.90/m' },
                    { value: 'kv198', label: 'K.VIRKE 48x198', meta: '79.80/m' },
                  ]}
                  defaultValue="kv48"
                />
              </Field>
              <Field label="Spacing" unit="cm">
                <Segmented
                  block
                  size="large"
                  mono
                  options={[
                    { value: '40', label: '40' },
                    { value: '60', label: '60' },
                  ]}
                  value={cc}
                  onChange={setCc}
                />
              </Field>
            </div>
            <Input label="With label and error (Input's own)" error="Fill in Height" defaultValue="" />
            <Textarea label="Description" defaultValue="Plain second-person copy goes here." />
            <Toggle checked={insulate} onChange={setInsulate} label="Isoler veggen" meta="Glava 70 mm" />
            <Toggle checked={!insulate} onChange={(value) => setInsulate(!value)} framed={false} label="Bare switch" />
          </Section>

          <Section title="Filter chips · Dashed add">
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'All', 24],
                ['treverk', 'Treverk', 8],
                ['plater', 'Plater', 5],
                ['maling', 'Maling', 3],
              ].map(([id, label, count]) => (
                <FilterChip key={id} selected={filter === id} count={count as number} onClick={() => setFilter(id as string)}>
                  {label}
                </FilterChip>
              ))}
            </div>
            <DashedAdd>+ Add step</DashedAdd>
            <DashedAdd radius="lg">+ Add section</DashedAdd>
          </Section>
        </div>

        <div className="space-y-10 min-w-0">
          <Section title="Rail rows">
            <div className="space-y-1">
              {[
                { title: 'Bakvegg', subtitle: '30.8 m', value: '1 167.32' },
                { title: 'Gable end', subtitle: 'Wood wall', value: '842.10' },
                { title: 'Kledning', subtitle: '12 m²', status: 'error' as const },
              ].map((row, index) => (
                <RailRow
                  key={row.title}
                  index={index + 1}
                  title={row.title}
                  subtitle={row.subtitle}
                  value={row.value}
                  status={row.status}
                  selected={rail === index + 1}
                  onClick={() => setRail(index + 1)}
                />
              ))}
            </div>
          </Section>

          <Section title="Ledger table">
            <LedgerTable columns={[{ label: 'Quote' }, { label: 'Lines', align: 'right', width: '64px' }, { label: 'Total', align: 'right', width: '120px' }, { label: '', align: 'right', width: '56px' }]}>
              {[
                ['Stand A04', '8', '12 480.00'],
                ['Stand B12', '5', '4 299.30'],
                ['Norway Expo', '12', '38 112.00'],
              ].map(([name, lines, total], index) => (
                <LedgerRow
                  key={name}
                  selected={ledger === index}
                  onClick={() => setLedger(index)}
                  cells={[name, <span key="l" className="font-numeric">{lines}</span>, <span key="t" className="font-numeric">{total}</span>, '⋯']}
                  hoverCell={<span className="text-danger text-[13px]">Delete</span>}
                />
              ))}
            </LedgerTable>
          </Section>

          <Section title="Formula well">
            <FormulaWell>
              <span className="text-token-input">lengde</span> / <span className="text-token-input">cc</span> + 1
            </FormulaWell>
            <FormulaWell focused>
              <span className="text-token-result">antall</span> × <span className="text-token-property">material.price</span>
            </FormulaWell>
          </Section>
        </div>

        <div className="space-y-6 min-w-0 rounded-lg border border-border bg-panel px-6 py-5">
          <LiveLabel context="In the quote" />
          <div className="space-y-3">
            <ResultRow label="Bindingsverk antall" value="30.8" unit="m" />
            <ResultRow label="Stendere" value="8" unit="stk" highlight />
            <ResultRow label="Bakvegg" detail="30.8 m · 4 × 2.5 m" value="1 167.32" />
            <ResultRow label="Line total" value="$1 167.32" total />
          </div>
          <CommitBlock label="Total incl. VAT" amount="$4 299.30" actionLabel="Export quote" note="Adds a line to Stand B12" />
          <CommitBlock layout="compact" label="Total" amount="$1 167.32" actionLabel="Send to quote" note="Stand B12" />
        </div>
      </div>

      <div className="px-6 pb-10">
        <CommitBlock
          layout="row"
          eyebrow="Continue where you left off"
          title="Stand B12 — Norway Expo"
          meta="5 lines · edited 2 h ago"
          label="Total"
          amount="$4 299.30"
          actionLabel="Continue"
        />
      </div>
    </div>
  );
}
