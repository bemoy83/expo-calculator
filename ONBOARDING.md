# Project Context

## Project name
**Event Construction Cost Estimator** (expo-calculator)

## Purpose
Purpose-built construction and event-build calculators, made in the app by the owner and
used by staff, with quotes built from their results.

**Users**
- **The owner** builds calculators, functions and catalogs. Doesn't write code, so
  everything must be doable in the UI.
- **Staff** only use calculators and quotes, usually on their own devices in use-only mode.

**What it solves**
- A calculator asks each input once (width, height, stud spacing) and any number of steps
  read it, so there's no linking of fields between modules.
- The math lives in reusable **functions**; a calculator wires inputs to them and lays out
  the page.
- Big calculators are built part by part (Framing, Sheeting, Paint), each tested on its own,
  while staff see one form.
- Prices live in the materials and labor catalogs, so changing a price updates every
  calculator.

`CALCULATOR_DESIGN.md` is the source of truth for this direction: decisions, data model,
and implementation notes for each build step (1–11).

## Platform
Web app, Next.js 14 App Router with **static export** (GitHub Pages under
`/expo-calculator`). Client-only: no backend, no database, no accounts. All data is in the
browser's localStorage via Zustand `persist`. Devices share data by exporting and importing
JSON files.

## Concepts

| Layer | Stored in | Notes |
|---|---|---|
| Functions | `functions-store` | Typed, unit-aware parameters with a kind (number, material, labor, yes/no); can call other functions |
| Catalogs | `materials-store`, `labor-store`, `categories-store` | Materials have a default price (Price / Per) plus price properties (`price_per_m2`, …) and other properties; labor has a rate |
| Calculators | `calculators-store` | `lib/calculator/types.ts`: inputs, parts, steps, layout, optional quote cost step |
| Quotes | `quotes-store` | Line items are snapshots with `calculatorId` and the values sent; never exported or imported |
| Device settings | `device-store` | Use-only mode, the calculator pack loaded, the last pack exported; per browser, never exported |

Retired: modules, templates, field linking and the quote workspace (removed in step 10).
On first load their stored data becomes calculators (`lib/calculator/legacy.ts`), and old
export files with modules/templates still import. `CalculationModule` and `ModuleTemplate`
remain only as types for that conversion.

## Architecture

### Pages (`app/`)
- `/` — Calculators, grouped by category; shows the loaded pack's date
- `/calculator?id=…` — staff view of a calculator; `/calculator/edit[?id=…]` — the builder
- `/quotes/board` — quotes list; `/quotes` — the open quote
- `/functions`, `/materials`, `/labor` — the library pages

Calculators are addressed by query string because they live in the browser and the static
export can't have a page per calculator.

### Engine and pure logic (`lib/`)
- `lib/calculator/` — no React:
  - `evaluate.ts` — `resolveInputValues`, `evaluateCalculator` (per-step status: ok,
    disabled, missing, blocked, error; per-part cost and status; total)
  - `dependencies.ts` — expression scanning, step dependencies, dependency order and cycles
  - `call-function.ts` — `callFunction`, the one way to call a function (engine and
    function test panel)
  - `conditions.ts`, `requirements.ts`, `format.ts`, `step-source.ts`
  - `editing.ts` — pure edits used by the builder (rename keys everywhere, add/remove
    inputs, steps, parts, layout items, conditions)
  - `pack.ts` — calculator packs: functions a set of calculators needs, pack building,
    default selection, date comparison
  - `from-module.ts`, `from-template.ts`, `legacy.ts` — conversion of retired data
- `lib/formula/` — parser, validator, unit validation, math runtime (mathjs)
- `lib/functions/`, `lib/catalog/` (price conversion), `lib/quotes/` (line items, board,
  export/print)
- `lib/utils/data-export.ts`, `data-import.ts` — export format 2.0.0 (`kind: 'pack'` marks
  a calculator pack); import validates, converts old files, merges or replaces

### Components (`components/`)
- `calculator/` — staff view (`CalculatorRunView`, layout renderer, inputs by widget,
  results, `SendToQuoteDialog`) and the Calculators list
- `calculator-builder/` — `CalculatorBuilder` (Parts | Layout tabs), part cards, step
  editors (function call or formula), input dialog, layout canvas and inspector, condition
  editor
- `function-editor/`, `materials/`, `labor/`, `quotes/`
- `AppSidebar.tsx` (navigation and the Settings menu: appearance, currency, use-only mode,
  export/import), `Layout.tsx` (shell, import and pack export dialogs, use-only page gate),
  `DataImporter.tsx`, `PackExporter.tsx`
- `ui/` primitives (Button, Card, Chip, Input, Select, Checkbox, Textarea) and `shared/`
  (ModalDialog, ConfirmDialog, NotificationHost, EmptyState, SortableList, …)

### Hooks (`hooks/`)
- `use-calculators.ts` — saved calculators and the library (materials, labor, functions)
- `use-device.ts` — `useHydrated`, `useUseOnlyMode`, `isBuilderRoute`
- `use-formula-autocomplete.ts`, `use-parameter-manager.ts`, `use-sortable-list.ts`

## Staff devices

- **Calculator pack**: Settings → Export calculator pack… The owner ticks the calculators
  to share (those in the last pack start ticked; new ones start unticked, so tests and
  drafts stay out). The file holds them, the functions they call (including nested calls),
  the whole materials and labor catalogs and categories, and `exportedAt`.
- **Loading a pack** (Import data) always replaces calculators, functions, materials, labor
  and categories, after a confirmation that lists what's in it, which calculators it
  removes, and whether it's older than the loaded pack. Quotes are untouched. The device
  remembers the pack (`device-store.loadedPack`), shown on the Calculators page.
- **Use-only mode** hides New calculator, Edit, the Catalog navigation and the builder and
  library pages (they show a notice instead), and the export items. Loading a pack offers
  to turn it on. It's a convenience, not security.

## Tech stack
- Next.js 14.2, React 18.3, TypeScript 5.9 (strict)
- Zustand 4.5 with `persist`
- Tailwind CSS 3.4 with the Ink design tokens (CSS variables in `app/globals.css`, light and
  dark), next-themes for Light/Dark
- mathjs 12.3 (formulas), dnd-kit (drag and drop), Lucide icons
- ESLint (Next config), ts-node for the regression tests

## Working on it

- Checks: `npx tsc --noEmit -p .`, `npm run lint`, `npm run eval:test` (regression tests
  in `lib/regression-tests/`, entry `run-all.ts`; add tests for new pure logic there).
- `npm run build` must pass (static export).
- Persisted stores hydrate from localStorage, so anything rendered from them must match the
  prerendered HTML on first render: use a mounted flag or `useHydrated`.
- Keep math out of components: engine and edits are pure functions in `lib/`, tested.
- Use the design tokens (`bg-surface`, `text-ink-muted`, `border-border`, `text-danger`, …),
  not raw colors. Dialogs go through `ModalDialog`, confirmations through `ConfirmDialog`,
  toasts through `notify()`.
- UI text is plain and short, written for someone who doesn't code.

## Known limits
- localStorage only (typically 5–10 MB per origin); no sync, backup is an export file.
- Use-only mode is per browser and can be switched off by anyone.
- Open questions (saved runs, repeating groups) are listed in `CALCULATOR_DESIGN.md`.
