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
- The top bar is the library, then the work: `Materials  Labor  Functions › Calculators ›
  Quotes` (the arrows show the flow: the library feeds calculators, which feed quotes).
  Every page is a top-level tab; `Layout.tsx` maps a route to its tab (`mainTabFor`).
- `/` — Calculators by category, with the chosen one (`?id=`) in a quick view; shows the
  loaded pack's date
- `/calculator?id=…` — staff view of a calculator; `/calculator/edit[?id=…]` — the builder
- `/quotes/board` — quotes list; `/quotes` — the open quote
- `/functions` — functions by category, with the chosen one (`?id=`) in a quick view to try;
  `/functions/edit[?id=…]` — the function editor (see the editor header contract below)
- `/materials`, `/labor` — categories, a table, and the editor for the chosen row

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
- `shared/browse/` — what the four browse pages (Calculators, Functions, Materials, Labor)
  share: `BrowseLayout` (header, category rail, list, side pane; the grid, heights and
  scrolling), `useBrowseList` (search, category options, the dragged order, whether
  dragging is allowed), `SortableRow` (the draggable row of the Calculators and Functions
  lists), `BrowseActions` (search and the + button), `FirstRunPane` (the side pane's
  message while nothing exists yet). `shared/catalog/` has `CatalogPageShell` (Materials
  and Labor: `BrowseLayout` plus the table and its editor pane), `CatalogTableRow` and the
  editor panel frame
- `ui/` primitives (Button, IconButton, Chip, Input, Select, Checkbox, Textarea, Toggle,
  Segmented, Field, SearchInput, RailRow, LedgerTable, DashedAdd, Eyebrow, Card), `live/`
  (LiveLabel, ResultRow, CommitBlock: the one inverted total per screen), and `shared/`
  (PageHeader, SaveButton, HeaderDivider, ModalDialog, ConfirmDialog, NotificationHost,
  EmptyState, SortableList, …)
- Styling: see "Design system" below

### Design system ("Ledger")
- Tokens are CSS variables in `app/globals.css` (light, `.dark`, and optional
  `data-accent` chalk/lime), exposed to Tailwind under the same names in
  `tailwind.config.ts`: warm-paper neutrals (canvas → panel → surface, sunken wells),
  ink / ink-muted / ink-faint, one accent, status colours, and the formula colours
  (`token-input`, `-result`, `-function`, `-property`).
- Rules: the accent is a fill (page-primary button, focus halo, active tab bar, total
  pill), never body text; one inverted block (`live/CommitBlock`) per screen, for the
  money total and the action that commits it; every number, unit and formula name is
  mono (`font-numeric`, ligatures off); no shadows, hierarchy from surface steps and
  hairlines; 150 ms colour transitions only.
- Screens are panes: a full-bleed `PageHeader`, then rail → editor → live pane (`bg-panel`),
  exactly the window's height from lg with each pane scrolling on its own; below lg they
  stack. Browse pages (Calculators, Functions) keep the choice in `?id=` and the category
  filter in `?category=`, with a quick view. From lg a click picks a row for the quick
  view; its arrow icon opens the calculator to use and a double-click opens its editor. A
  use-only device has no quick view and no side pane (`BrowseLayout` without `side`): a
  click opens the calculator.
  Nothing is chosen until the user chooses: the side pane says "Choose a … to try it out"
  and the quick view has a ✕ that clears the choice. Before anything exists the side pane
  explains the page and points at the + in the header (`FirstRunPane`).
- Lists (all four browse pages): a hairline between rows, a surface fill on hover, and the
  chosen row a surface card with the accent ring (from lg). Every list can be reordered by
  its drag handle, except while a search or category filter is on; the order is saved on
  the items (`order`), and items never dragged keep their default order. Page headers have
  the same shape everywhere (eyebrow with the count, title, search, a + icon button for
  the page's own thing), so nothing shifts between pages.
- Inputs are borderless fills, not outlined boxes: `--field` (and `--field-hover`, one
  step stronger on hover; `--field-raised`, the chosen segment of a segmented control) in
  `globals.css`. In dark mode the fill follows the surface it sits on (`.dark .bg-panel`,
  `.bg-surface` and so on set the variables for their children): a step lighter on the
  page, near-black on panels and cards. Focus is an inset accent ring plus the soft halo;
  an error is a standing red ring (`--field-focus`, `--field-error`). The yes/no toggle
  and the slider track use the same fill.
- Buttons that are only an action are icons (Lucide, via `ui/IconButton` with its name in
  the tooltip): Duplicate, Edit, Delete, Close, Reset, Save, the + in headers. Text stays
  for the main action of a pane ("Edit function", "Send to quote", "Save material"),
  and first-run messages.
- A step that isn't filled in yet (no formula, no function chosen) is "Incomplete" in
  amber, not an error; a real error is red and, while it's still being typed, waits 700 ms
  (`hooks/use-settled-errors`, `use-settled-value`) before it shows. The full message
  appears once, under the formula, in plain words (`friendlyEvaluationMessage`); everywhere
  else it's just "Error" with the message as a tooltip. Syntax errors are found without
  test values (`findSyntaxError`).
- Pages below the top level (a calculator, the builder, a quote, the function editor) show
  a `shared/Breadcrumb` in the header eyebrow: parent links (`browseHref` brings the list
  back with the category and the item selected), then the state after " · ". Top-level
  pages have no crumbs; the top bar says where you are.
- Editor header contract (builder, function editor, quote), all icon buttons. Left:
  breadcrumb with state, the editable title, status dot. Right, always in this order: the
  editor's own tools, if any (builder: Preview — the staff view, the calculator's full-size page, asking to save first when there are unsaved edits, and its Close returns to the builder's Layout tab (`?back=`, `builderHref(…, 'layout')`) — and Parts/Layout; quote: + Add calculator),
  then a thin divider (`HeaderDivider`); the occasional actions as icons — Duplicate,
  Export JSON, and Delete last (red on hover, confirmed); Close (✕), back to where the
  editor is opened from: the function editor to the functions list with the function
  selected, a quote to the board; the builder, which opens from two places, to the
  calculators list (category kept, the calculator selected) when the list opened it
  (`?from=list&category=`, `builderHref`), else to the calculator; Save (`SaveButton`: the
  page's one accent button, a disk icon with a dot while there are unsaved edits), which
  saves and stays, also on ⌘S / Ctrl+S (`useSaveShortcut`). A new item's first Save moves
  the address to its id (`router.replace`) and stays. The quote saves every change as it's
  made, so it has no Save: its eyebrow says "Saved automatically", "+ Add calculator"
  keeps the accent and its words, and Close goes to the board. A calculator's full-size
  page isn't an editor but follows the same order, as icons: Reset · Edit │ Close, with no Save;
  Close goes to the calculators list with the calculator selected, in its category.
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
- `use-formula-autocomplete.ts`, `use-parameter-manager.ts`, `use-sortable-list.ts`,
  `use-save-shortcut.ts`, `use-settled-errors.ts` (a step's typed error, held back a moment),
  `use-settled-value.ts`

## Staff devices

- **Calculator pack**: Settings → Export calculator pack… The owner ticks the calculators
  to share (those in the last pack start ticked; new ones start unticked, so tests and
  drafts stay out). The file holds them, the functions they call (including nested calls),
  the whole materials and labor catalogs and categories, and `exportedAt`.
- **Loading a pack** (Import data) always replaces calculators, functions, materials, labor
  and categories, after a confirmation that lists what's in it, which calculators it
  removes, and whether it's older than the loaded pack. Quotes are untouched. The device
  remembers the pack (`device-store.loadedPack`), shown on the Calculators page.
- **Use-only mode** hides New calculator, Edit, the Materials, Labor and Functions tabs and the builder and
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
