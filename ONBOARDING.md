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
| Quotes | `quotes-store` | Line items hold `calculatorId`, the calculator's values, and the kept cost (`unfinished` when it can't calculate); the quote page lists them and edits the open one. Never exported or imported |
| Device settings | `device-store` | Use-only mode, the calculator pack loaded, the last pack exported; per browser, never exported |

Retired: modules, templates, field linking and the module quote workspace (removed in step
10). The quote page became a workspace of calculator cards again afterwards (W1–W2 in
CALCULATOR_DESIGN.md, "Quote workspace"); the Ledger redesign turned the cards into a
lines list with one line open in an editor.
On first load their stored data becomes calculators (`lib/calculator/legacy.ts`), and old
export files with modules/templates still import. `CalculationModule` and `ModuleTemplate`
remain only as types for that conversion.

## Architecture

### Pages (`app/`)
- `/` — Calculators by category, with the chosen one (`?id=`) in a quick view; shows the
  loaded pack's date
- `/calculator?id=…` — staff view of a calculator; `/calculator/edit[?id=…]` — the builder
- `/quotes/board` — quotes list; `/quotes` — the open quote
- `/functions` — functions by category, with the chosen one (`?id=`) in a quick view to try;
  `/functions/edit[?id=…]` — the function editor (Save/Discard go back to the list)
- `/materials`, `/labor` — the catalog pages

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
- `lib/functions/`, `lib/catalog/` (price conversion), `lib/quotes/` (line items and
  rebuilding them, board, export/print, `workspace.ts`: adding, duplicating, moving and
  removing lines)
- `lib/utils/data-export.ts`, `data-import.ts` — export format 2.0.0 (`kind: 'pack'` marks
  a calculator pack); import validates, converts old files, merges or replaces

### Components (`components/`)
- `calculator/` — staff view (`CalculatorRunView` full size and `CalculatorQuickView`,
  `useCalculatorRun`, `CalculatorForm` shared with the quote line editor,
  `CalculatorLivePane` with results and Send to quote, layout renderer, inputs by widget,
  results, `SendToQuoteDialog`) and the Calculators list
- `quotes/` — `QuoteView` (lines, line editor, receipt), `QuoteLineEditor`,
  `AddCalculatorDialog`, `QuoteSummaryCard` (the receipt)
- `calculator-builder/` — `CalculatorBuilder` (Parts | Layout), `PartSteps` and
  `PartLivePane`, step rows and editors (function call or formula), input dialog, layout
  canvas and inspector, condition editor
- `function-editor/` — `FunctionsBrowse` (list and quick view), `ParameterRail` (parameters
  edited in place, in call order), `FunctionFormulaCard` (formula box, autocomplete, and
  `formula/FormulaPalette`), `FunctionTestPanel` (`useFunctionTryIt`, shared with the quick view);
  the editor page is `app/functions/FunctionEditorView.tsx`
- `materials/`, `labor/`
- `TopBar.tsx` (the top tabs from lg), `AppSidebar.tsx` (the navigation drawer below lg,
  and the Settings menu: appearance, currency, use-only mode, export/import), `Layout.tsx`
  (shell, import and pack export dialogs, use-only page gate; pages draw their own header
  band and panes), `DataImporter.tsx`, `PackExporter.tsx`
- `ui/` primitives (Button, Chip/FilterChip, Input, Select, Checkbox, Textarea, Toggle,
  Segmented, Field, SearchInput, RailRow, LedgerTable, DashedAdd, Eyebrow, Card), `live/`
  (LiveLabel, ResultRow, CommitBlock: the one inverted total per screen), and `shared/`
  (PageHeader, ModalDialog, ConfirmDialog, NotificationHost, EmptyState, SortableList, …)
- Styling: see "Design system" below

### Design system ("Ledger")
- Tokens are CSS variables in `app/globals.css` (light, `.dark`, and optional
  `data-accent` chalk/lime), exposed to Tailwind under the same names in
  `tailwind.config.ts`: warm-paper neutrals (canvas → panel → surface, sunken wells),
  ink / ink-muted / ink-faint, one accent, status colours, and the formula colours
  (`token-input`, `-result`, `-function`, `-property`).
- Rules: the accent is a fill (page-primary button, focus halo, active sub-tab, total
  pill), never body text; one inverted block (`live/CommitBlock`) per screen, for the
  money total and the action that commits it; every number, unit and formula name is
  mono (`font-numeric`, ligatures off); no shadows, hierarchy from surface steps and
  hairlines; 150 ms colour transitions only.
- Screens are panes: a full-bleed `PageHeader`, then rail → editor → live pane (`bg-panel`),
  exactly the window's height from lg with each pane scrolling on its own; below lg they
  stack. Browse pages (Calculators, Functions) keep the choice in `?id=` and the category
  filter in `?category=`, with a quick view. From lg a click picks a row for the quick
  view and a double-click opens its editor (in use-only mode, a calculator opens to use).
- Pages below the top level (a calculator, the builder, a quote, the function editor) show
  a `shared/Breadcrumb` in the header eyebrow: parent links (`browseHref` brings the list
  back with the category and the item selected), then the state after " · ". Top-level
  pages have no crumbs; the top bar says where you are.
- Editor header contract (builder, function editor, quote). Left: breadcrumb with state,
  the editable title, status dot. Right, always in this order: the editor's own tools, if
  any (builder: Preview, Parts/Layout), then a thin divider (`HeaderDivider`); a ⋯ menu
  (`shared/OverflowMenu`) for occasional actions — Duplicate, Export JSON, and Delete last
  (red, confirmed); Close (secondary), back to where the editor is opened from: the
  function editor to the functions list with the function selected, a quote to the board;
  the builder, which opens from two places, to the calculators list (category kept, the
  calculator selected) when the list opened it (`?from=list&category=`, `builderHref`), else
  to the calculator; Save (accent, the page's one accent button), which saves and
  stays, also on ⌘S / Ctrl+S (`useSaveShortcut`). A new item's first Save moves the
  address to its id (`router.replace`) and stays. The quote saves every change as it's
  made, so it has no Save: its eyebrow says "Saved automatically", "+ Add calculator"
  keeps the accent, and Close goes to the board. A calculator's full-size page isn't an
  editor but follows the same order: Reset · Edit │ Close, with no ⋯ and no Save; Close goes
  to the calculators list with the calculator selected, in its category.
- Unsaved edits: Close, breadcrumb links and the app's own navigation (top bar tabs and
  brand, the navigation drawer) ask one question, "Save changes to {name}?" with Save,
  Discard and Keep editing (`shared/SaveChangesDialog`). Save that fails (e.g. a missing
  name) stays with the error shown. The app links go through `shared/NavigationGuard`:
  Layout provides it, the links call `useGuardLink`, and an editor calls
  `useLeaveEditor(dirty)`, which registers a guard while dirty and gives `leave(href)`
  and the `leavingTo` for its dialog. Browser back and closing the tab aren't guarded.
- The designer's handoff (mockups, token source, reference components, specs) is kept
  locally in `design_handoff_*/` and is not in git; ask for the latest one. Decisions that
  came from it are recorded here and in CALCULATOR_DESIGN.md.

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
