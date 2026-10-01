# Code Quality Audit

Report-only audit of the codebase for dead code, duplication, and efficiency issues. No source files were changed as part of this audit.

**Scanned:** `app/`, `components/`, `lib/`, `hooks/` — 225 TS/TSX files, ~27,100 lines. Excluded `design_handoff_ledger_redesign/` and `design_handoff_ledger_redesign (completed)/` (gitignored design-reference material, not source).

**Tools run:** `knip`, `ts-prune`, `jscpd` (min 8 lines / 60 tokens), `tsc --noUnusedLocals --noUnusedParameters` — all ad hoc via `npx`, nothing added to `package.json`. Every tool-flagged finding below was cross-checked against a second tool or a direct `grep` before being reported; single-tool hits that turned out to have in-file usage (a common false positive for both knip and ts-prune) were discarded rather than reported as dead.

**Headline counts:** 2 unused files, 17 unused exported functions, 10 unused locals/params, 1 redundant duplicate export, 2 redundant re-export paths, ~15 duplicated code blocks across 6 file groupings (one spanning 4 file pairs), 2 high-severity efficiency issues (one component, one hook) plus one high-severity algorithmic issue in the formula validator.

The codebase is generally clean — recent refactors (reskin, MD3 removal, unified editor headers) left no orphaned files or leftover dead code from those changes specifically. The findings below come from a systematic first-time tooling pass and manual review, not lingering refactor debris.

---

## 1. Dead code

> **Status (2026-10-01): done.** Everything in §1 below was removed in a clean-up pass, along with what the UI polish work left unused (`FilterChip`, `OverflowMenu`, `CatalogTabs`/`CatalogCategoryChips`/`useCatalogListState`, the `PageHeader` sub-navigation slot, `CalculationResolver`, `shouldSelectAllOnFocus`), and `app/dev`/`hooks/__examples__` (empty folders). `HeaderDivider` moved to its own file. Left as they were: `analyzeFormulaVariables`'s unused `fields` parameter (a public signature the regression tests call), and the "unnecessary export keyword" cases. `tsc --noUnusedLocals` is clean.

### 1.1 Unused files — safe to delete
Both `knip` and a direct `grep` across `app/`, `components/`, `lib/`, `hooks/` confirm zero importers.

| File | Confidence | Note |
|---|---|---|
| [components/shared/ActionIconButton.tsx](components/shared/ActionIconButton.tsx) | High | No references anywhere. |
| [components/shared/SectionHeading.tsx](components/shared/SectionHeading.tsx) | High | No references anywhere. **Don't confuse with** the different, actively-used `SectionHeading` function defined in [components/calculator/CalculatorLayoutItem.tsx:99](components/calculator/CalculatorLayoutItem.tsx:99) — that one is real and in use; only the `shared/` file is dead. |

### 1.2 Unused exported functions — confirmed by knip + ts-prune agreement, zero references even within their own file

| Symbol | File:line | Confidence | Suggested action |
|---|---|---|---|
| `escapeRegex` | [lib/formula/parser.ts:210](lib/formula/parser.ts:210) | High | Delete — but see [§2.4](#24-triplicated-escaperegex-helper), this is also a duplication finding. |
| `convert`, `areCompatible`, `multiplyUnits`, `getUnitsByCategory` | [lib/units.ts:128,148,169,215](lib/units.ts:128) | High | Delete all four; no callers anywhere in the codebase. |
| `getMaterialPropertyUnitCategory`, `getLaborPropertyUnitCategory`, `createCalculationResolver` | [lib/formula/resolver.ts:133,238,288](lib/formula/resolver.ts:133) | High | Delete. |
| `otherPrices` | [lib/catalog/prices.ts:61](lib/catalog/prices.ts:61) | High | Delete. |
| `formatInstanceName` | [lib/quotes/nickname.ts:6](lib/quotes/nickname.ts:6) | High | Delete. |
| `validateComputedOutputVariableName`, `validateComputedOutputExpression` | [lib/utils/computed-outputs.ts:19,108](lib/utils/computed-outputs.ts:19) | High | Delete. |
| `validateParameterName` | [lib/utils/function-parameters.ts:67](lib/utils/function-parameters.ts:67) | High | Delete. |
| `getInitialFieldValue`, `getFieldInputPlaceholder`, `handleSelectDefaultOnFocus` | [lib/field-defaults.ts:4,42,63](lib/field-defaults.ts:4) | High | Delete. (Note: `shouldSelectAllOnFocus` in the same file, flagged by knip alone, is actually used internally — not dead, keep it.) |
| `containsStandalone` | [lib/formula/identifiers.ts:67](lib/formula/identifiers.ts:67) | High | Delete. |

Knip additionally flagged ~24 other exports (e.g. `takenKeys`, `resolveInputValues`, `formatInputValue`, `escapeHtml`) as "unused exports," but `ts-prune` and direct greps show these are all used internally within their own module — the `export` keyword is just unnecessary, not dead code. Not worth individual line items; lowest-priority cleanup if ever touching those files.

### 1.3 Unused locals/parameters — from `tsc --noUnusedLocals --noUnusedParameters`
All High confidence, all trivial one-line removals.

| File:line | Symbol |
|---|---|
| [components/calculator-builder/InputEditorDialog.tsx:58](components/calculator-builder/InputEditorDialog.tsx:58) | `calculator` param |
| [components/shared/SortableList.tsx:41](components/shared/SortableList.tsx:41) | `overId` |
| [components/ui/Chip.tsx:70](components/ui/Chip.tsx:70) | `Component` |
| [hooks/use-formula-autocomplete.ts:1](hooks/use-formula-autocomplete.ts:1) | `useRef` import |
| [hooks/use-formula-autocomplete.ts:347](hooks/use-formula-autocomplete.ts:347) | `paddingTop` |
| [lib/formula/debug-analysis.ts:11](lib/formula/debug-analysis.ts:11) | `fields` param |
| [lib/formula/validator.ts:3](lib/formula/validator.ts:3) | `MATH_FUNCTIONS` import |
| [lib/formula/validator.ts:275](lib/formula/validator.ts:275) | `computedOutputRefs` |
| [lib/utils/computed-outputs.ts:10](lib/utils/computed-outputs.ts:10) | `useFunctionsStore` import |
| [lib/utils/computed-outputs.ts:133](lib/utils/computed-outputs.ts:133) | `computedOutputNames` |

**Source:** `tsc --noUnusedLocals --noUnusedParameters`. Enabling these two flags permanently in `tsconfig.json` (see [§4.2](#42-enable-unused-codelint-checks)) would catch this class of issue automatically going forward.

### 1.4 Redundant duplicate export
- **File:** [components/ui/Chip.tsx:151](components/ui/Chip.tsx:151)
- **Finding:** The file exports both a named `Chip` and a `default` (a re-export of the same component). Every call site imports the named `Chip` or `FilterChip` — nothing imports the default.
- **Suggested fix:** Drop the `default` export.
- **Confidence:** High. **Source:** knip (flagged as "Duplicate exports").

---

## 2. Duplication

### 2.1 Materials/Labor parallel implementation (largest finding)
Four separate file pairs implement near-identical logic for Materials and Labor as hand-duplicated parallel code rather than a shared generic abstraction. `jscpd` found 15 clone blocks across these pairs (9–40 lines each).

**a) [components/labor/LaborEditorPanel.tsx](components/labor/LaborEditorPanel.tsx) ↔ [components/materials/MaterialEditorPanel.tsx](components/materials/MaterialEditorPanel.tsx)** — 9 clone blocks.
- **Shared shape:** both render a single-item catalog editor — name/category/rate-or-price fields, a properties list with add/edit/remove rows, an inline "add property" quick-picker chip set, identical reset-on-item-change `useEffect`, identical validation/submit wiring via `CatalogEditorPanel`. They differ only in Materials having an extra multi-price "Prices" section and a `type` field on properties, vs. Labor's single hourly `cost` and numeric-only properties.
- **Suggested fix:** Extract a generic `CatalogPropertyListEditor<TProperty>` (or a `useCatalogItemEditor` hook) parameterized by property type, with a slot for the type-specific fields (price sections vs. hourly rate). The add/edit/remove/quick-add property-list logic is byte-for-byte identical between the two files today.
- **Confidence:** High. **Source:** jscpd + manual read.

**b) [components/labor/LaborPropertyForm.tsx](components/labor/LaborPropertyForm.tsx) ↔ [components/materials/PropertyForm.tsx](components/materials/PropertyForm.tsx)** — 5 clone blocks, up to 40 lines each.
- **Shared shape:** both are controlled forms for a single property — display-name → auto-generated variable-name (with a "manually edited" escape hatch and identical `useEffect`), a unit-symbol `<Select>` from `getAllUnitSymbols()`, a value field, create/edit-mode submit buttons. `PropertyForm` additionally has a `type` selector (number/string/boolean/price); `LaborPropertyForm` is effectively the number-only special case of that same branch.
- **Suggested fix:** Make `LaborPropertyForm` a thin wrapper around `PropertyForm` with `type` fixed to `'number'` and the type selector hidden (e.g. `allowedTypes={['number']}`), eliminating ~150 duplicated lines.
- **Confidence:** High. **Source:** jscpd + manual read.

**c) [components/labor/LaborRow.tsx](components/labor/LaborRow.tsx) ↔ [components/materials/MaterialRow.tsx](components/materials/MaterialRow.tsx)** — 1 clone block (13 lines).
- **Shared shape:** both are catalog-table rows built on `CatalogTableRow`/`CatalogPropertiesCell`: name + subtitle, a hidden-on-mobile variable-name cell, a properties cell, a right-aligned formatted-currency cell.
- **Suggested fix:** Extract a generic `CatalogItemRow<T>` taking `{ id, name, subtitle, variableName, properties, priceCell }`; `MaterialRow`/`LaborRow` become one-line wrappers supplying field mapping and the price-cell suffix (`/unit` vs `/hr`).
- **Confidence:** High. **Source:** jscpd + manual read.

**d) [lib/formula/resolver.ts](lib/formula/resolver.ts) internal self-clone (lines 143-159 vs. 248-264)** — the material-property-resolution block and its labor equivalent are near-identical.
- **Suggested fix:** Factor out a shared `resolvePropertyGeneric(item, propertyKey, category)` helper that both `resolveMaterialProperty` and `resolveLaborProperty` call.
- **Confidence:** High. **Source:** jscpd.

### 2.2 Editor header/navigation-guard wiring
- **Files:** [components/calculator-builder/CalculatorBuilder.tsx](components/calculator-builder/CalculatorBuilder.tsx) (~lines 404-430, 774-789) ↔ [app/functions/FunctionEditorView.tsx](app/functions/FunctionEditorView.tsx) (~lines 178-203, 385-399)
- **Finding:** Both files independently wire up the same `leavingTo`/`setLeavingTo`/`router.push` state and the same `<SaveChangesDialog isOpen={leavingTo !== null} onSave={...} onDiscard={...} onCancel={...}>` block, and separately duplicate the "⋯ · Close · Save" header-action JSX, even though both already import the same shared primitives (`PageHeader`, `OverflowMenu`, `NavigationGuard`'s `useNavigationGuard`/`useGuardLink`/`useLeaveEditor`, `SaveChangesDialog`).
- **Suggested fix:** Extract the `leavingTo` state + dialog wiring into a small hook alongside the existing `useLeaveEditor` in [NavigationGuard.tsx](components/shared/NavigationGuard.tsx), and factor the repeated header-actions JSX into an `EditorHeaderActions` component taking `{ onClose, onSave, tools }`.
- **Confidence:** High. **Source:** manual read (confirmed during exploration).

### 2.3 ConfirmDialog ↔ SaveChangesDialog
- **Files:** [components/shared/ConfirmDialog.tsx:29-44](components/shared/ConfirmDialog.tsx:29) ↔ [components/shared/SaveChangesDialog.tsx:19-31](components/shared/SaveChangesDialog.tsx:19) — the latter even has a comment cross-referencing the former ("As in ConfirmDialog").
- **Finding:** Both are `createPortal`-rendered wrappers around `ModalDialog` with identical event-boundary handling (an outer `<div>` stopping click/keydown propagation, `Escape` → cancel) and a button row with a ghost "cancel/keep editing" button (`data-autofocus`) plus one-or-two primary/danger actions.
- **Suggested fix:** Extract the shared portal/event-boundary wrapper as a `ModalActionDialog`, or lift that boilerplate into `ModalDialog` itself as an option; `ConfirmDialog` and `SaveChangesDialog` would then only supply their button set and copy.
- **Confidence:** Medium. **Source:** jscpd + manual read.

### 2.4 Triplicated `escapeRegex` helper
- **Files:** [lib/formula/parser.ts:210](lib/formula/parser.ts:210) (dead, see §1.2), [lib/formula/identifiers.ts:26](lib/formula/identifiers.ts:26) (private, used internally), [hooks/use-formula-autocomplete.ts:41](hooks/use-formula-autocomplete.ts:41) (private `useCallback`, used internally).
- **Finding:** Three independent implementations of "escape regex special characters" exist in the codebase, none shared.
- **Suggested fix:** Consolidate into one exported utility (e.g. `lib/utils/regex.ts`) and delete the dead copy plus the two private duplicates.
- **Confidence:** High. **Source:** grep cross-check triggered by the dead-code pass.

### 2.5 Lower-priority duplication (not worth dedicated abstractions)
- [components/function-editor/useFunctionEditorState.ts:166-176](components/function-editor/useFunctionEditorState.ts:166) duplicates lines 184-195 internally — small, worth a local helper if this file is touched again. **Confidence:** Medium.
- [app/calculator/page.tsx:25-38](app/calculator/page.tsx:25) and [app/calculator/edit/page.tsx:51-66](app/calculator/edit/page.tsx:51) both render an identical 16-line "Calculator not found" `EmptyState` block. A shared `<CalculatorNotFound />` component would remove the duplication, but the payoff is small. **Confidence:** Low.
- [app/labor/page.tsx:88-99](app/labor/page.tsx:88) and [app/materials/page.tsx:91-102](app/materials/page.tsx:91) share a 12-line block of props passed into a common catalog-shell component — this is expected duplication from configuring the same generic component two ways, not a real problem. **Confidence:** Low, no action needed.

---

## 3. Efficiency / performance

### React rendering

**3.1 `CalculatorBuilder.tsx` — no memoization anywhere in its child tree — High**
- **File:** [components/calculator-builder/CalculatorBuilder.tsx](components/calculator-builder/CalculatorBuilder.tsx) (792 lines, the largest component in the repo)
- **Finding:** None of `LayoutCanvas`, `LayoutInspector`, `PartCard`, `StepRow` are wrapped in `React.memo`. The component holds ~11 `useState` slices; any update — including typing into the calculator-name field ([:381-394](components/calculator-builder/CalculatorBuilder.tsx:381)), category ([:589-597](components/calculator-builder/CalculatorBuilder.tsx:589)), or description ([:598-606](components/calculator-builder/CalculatorBuilder.tsx:598)) — re-renders the entire parts/layout tree even though those fields don't affect it. `layoutContext` ([:217-229](components/calculator-builder/CalculatorBuilder.tsx:217)) is a freshly-allocated object (containing a freshly-allocated `Set`) every render, so even adding `React.memo` to children today wouldn't help without also memoizing this. Separately, `edit()` always produces a new `calculator` object identity even for cosmetic-only changes, so the correctly-memoized `evaluateCalculator` call ([:136](components/calculator-builder/CalculatorBuilder.tsx:136)) still re-runs the full evaluation graph on every keystroke in the name/category/description fields.
- **Why it matters:** Every keystroke in any field of the builder — the single most-used editing surface in the app — does a full re-render of the parts/layout UI plus a full recalculation, regardless of which field changed.
- **Suggested fix:** Wrap `LayoutCanvas`/`LayoutInspector`/`PartCard`/`StepRow` in `React.memo`, memoize `layoutContext` with `useMemo`, and split cosmetic fields (name/category/description) into state that doesn't flow through the same `calculator` object used for evaluation — or debounce the `setCalculator` call for those fields.
- **Confidence:** High. **Source:** manual read.

**3.2 `use-formula-autocomplete.ts` — synchronous DOM measurement on every keystroke — High**
- **File:** [hooks/use-formula-autocomplete.ts:297-357](hooks/use-formula-autocomplete.ts:297)
- **Finding:** On every keystroke, a hidden `<div>` is created, styled, appended to `document.body`, measured via `getBoundingClientRect()` (forcing a synchronous layout/reflow), then removed — purely to position the autocomplete dropdown. There is no debounce on typing (only an `requestAnimationFrame` throttle on scroll, [:415-418](hooks/use-formula-autocomplete.ts:415)). Separately, `filterSuggestions` ([:77-166](hooks/use-formula-autocomplete.ts:77)) builds its result via chained `.filter()` calls each using `.includes()` against other result arrays, which is effectively O(n²) in the candidate-list size (all fields + materials + labor + properties + functions + constants).
- **Why it matters:** A guaranteed layout thrash on every character typed in any formula field, independent of catalog size; the O(n²) filtering compounds as catalogs grow.
- **Suggested fix:** Debounce the suggestion recomputation (e.g. 100-150ms), and/or measure dropdown position without a DOM round-trip (cache the measurement, or use a lighter estimate). Build the filtered candidate list with `Set`-based exclusion instead of chained `.includes()`.
- **Confidence:** High for the DOM thrash; Medium for the O(n²) filtering (scales with catalog size, which is currently small). **Source:** manual read.

### Algorithmic complexity

**3.3 `lib/formula/validator.ts` — rebuilds lookup arrays inside a loop; O(n) scans instead of the Maps it already has — High**
- **File:** [lib/formula/validator.ts:35-139](lib/formula/validator.ts:35)
- **Finding:** `validateFormula` runs on every keystroke (confirmed caller: [useFunctionEditorState.ts:110-112](components/function-editor/useFunctionEditorState.ts:110), a `useEffect` keyed on `formData.formula`). Inside its `for (const call of functionCalls)` loop, `allAvailableVars` ([:56-59](lib/formula/validator.ts:56)) and `allFunctionNames` ([:62-64](lib/formula/validator.ts:62)) are rebuilt once per function call found, even though neither depends on the loop variable. Variable-existence checks ([:122,133,279-288,351,363](lib/formula/validator.ts:122)) then use `allAvailableVars.includes(match)` — an O(n) linear scan — despite the file already having `materialsByVariableName`/`fieldsByVariableName` Maps ([:29-30](lib/formula/validator.ts:29)) built for other checks.
- **Why it matters:** Runs per keystroke; cost compounds with the number of function calls in a formula and with catalog size (materials/labor/functions), while the file inconsistently mixes indexed and linear-scan lookup styles.
- **Suggested fix:** Hoist `allAvailableVars`/`allFunctionNames` construction above the loop (build once as `Set`s), and route the `.includes()` checks through the existing Maps/a new `Set` instead of array scans.
- **Confidence:** High. **Source:** manual read.

**3.4 `lib/formula/evaluator.ts` — per-call `.find()` instead of indexed lookup — Medium**
- **File:** [lib/formula/evaluator.ts:14,57](lib/formula/evaluator.ts:14)
- **Finding:** `functions.find(...)` and `context.fields.find(...)` are called per argument per function call, rather than through a pre-built Map — inconsistent with the rest of the calculator engine (`lib/calculator/dependencies.ts` builds Maps/Sets once via `createDependencyScope`).
- **Why it matters:** Negligible for typical formulas (few functions, few fields) today, but is the kind of inconsistency that gets worse silently as formula complexity grows.
- **Suggested fix:** Build a `Map` once per evaluation call and use it for both lookups.
- **Confidence:** Medium — low impact at current scale, flagged for consistency with the rest of the engine. **Source:** manual read.

**3.5 `lib/functions/function-editor-helpers.ts:283` — O(n²) duplicate-name check — Low**
- **File:** [lib/functions/function-editor-helpers.ts:283](lib/functions/function-editor-helpers.ts:283)
- **Finding:** `paramNames.filter((name, index) => paramNames.indexOf(name) !== index)` is O(n²), but `n` is a function's parameter count (realistically under 10).
- **Suggested fix:** None needed — not worth the churn at this scale.
- **Confidence:** Low/informational. **Source:** manual read.

**Confirmed clean, no action needed:** `lib/calculator/editing.ts` (structural-sharing copies throughout, no deep clones, no accidental O(n²)); `lib/utils/data-import.ts` (already pre-builds `Set`s before every dedupe loop); `lib/calculator/evaluate.ts`/`dependencies.ts` (correct Tarjan-based ordering, properly memoized call sites — read in full, no re-audit needed); `components/materials/MaterialEditorPanel.tsx`/`components/labor/LaborEditorPanel.tsx` (property edits are local state, isolated from the catalog list — no per-keystroke list re-render, though `MaterialRow`/`LaborRow` aren't `React.memo`'d, so a save re-renders all visible rows once — low severity, not urgent).

### State & store design

**3.6 Array-scan update pattern in small stores — Low**
- **Files:** [lib/stores/materials-store.ts:39](lib/stores/materials-store.ts:39), [labor-store.ts:38](lib/stores/labor-store.ts:38), [calculators-store.ts:36,46](lib/stores/calculators-store.ts:36), [functions-store.ts:37](lib/stores/functions-store.ts:37)
- **Finding:** Single-item updates use `items.map(i => i.id === target ? {...i, ...updates} : i)` — O(n) per update (scans/copies the whole array to change one entry).
- **Why it matters:** Not urgent at current catalog sizes (dozens–low hundreds of items); worth revisiting if catalogs grow substantially.
- **Suggested fix:** An indexed `Record<id, T>` or `Map`-backed store would make single-item updates O(1).
- **Confidence:** Low/informational. **Source:** manual read.

**Confirmed clean:** whole-store subscriptions — `grep -rn "useMaterialsStore()\|useLaborStore()\|useQuotesStore()\|useCalculatorsStore()\|useFunctionsStore()" components app` returned zero hits; every consumer already selects a slice, so no unrelated-re-render issue exists. `lib/quotes/calculator-line-item.ts`/`lib/calculations/money.ts` — `result` caching ([:146](lib/quotes/calculator-line-item.ts:146)) is used correctly everywhere; `QuoteBoard.tsx`/`QuoteView.tsx` read precomputed totals, never recompute per render.

---

## 4. Other improvements

### 4.1 mathjs bundle bloat
- **File:** [lib/formula/math-runtime.ts:1](lib/formula/math-runtime.ts:1)
- **Finding:** `create(all)` from `mathjs` pulls in the entire library — matrices, complex numbers, units, BigNumber, Fraction, statistics, string ops — but [lib/formula/parser.ts:11](lib/formula/parser.ts:11) shows only 14 functions/constants are ever used (`sin, cos, tan, sqrt, abs, max, min, log, exp, pi, e, round, ceil, floor`), three of which (`round`/`ceil`/`floor`) are overridden anyway with custom implementations ([math-runtime.ts:64-106](lib/formula/math-runtime.ts:64)).
- **Why it matters:** `next.config.js` sets `output: 'export'` (a static site) — bundle size ships straight to end users with no server-side trimming.
- **Suggested fix:** Use `create({ ...only the needed factories })` from `mathjs`'s modular imports, or hand-roll the ~11 remaining functions (most are trivial wrappers around `Math.*`) and drop the mathjs dependency for this file entirely.
- **Confidence:** High. **Source:** manual read (verified directly against live source).

### 4.2 Enable unused-code/lint checks
- **Finding:** `.eslintrc.json` only extends `next/core-web-vitals` (no unused-vars/unused-imports rule); `tsconfig.json` has `strict: true` but not `noUnusedLocals`/`noUnusedParameters`. This is why the audit needed ad hoc tooling instead of relying on existing lint/build output — none of the 10 findings in §1.3 would have been caught by `npm run lint` or `npm run build`.
- **Suggested fix:** Enable `noUnusedLocals`/`noUnusedParameters` in `tsconfig.json`, and/or add `eslint-plugin-unused-imports` (or the `no-unused-vars` rule) to `.eslintrc.json`. Not applied as part of this audit per the report-only scope.
- **Confidence:** High (the gap is verified; the fix itself wasn't applied). **Source:** manual read of config files.

### 4.3 Redundant re-export paths
- **Files:** [lib/formula-evaluator.ts:1-2](lib/formula-evaluator.ts:1) re-exports `FormulaDebugInfo`/`FunctionCall`; [lib/functions/function-sample.ts:7](lib/functions/function-sample.ts:7) re-exports `FunctionParamKind`.
- **Finding:** These specific re-export paths are unused — every real caller imports the type directly from its source (`lib/formula/types.ts`, `lib/formula/parser.ts`, `lib/types.ts`) rather than through these re-exports. The types themselves are heavily used elsewhere; this is not dead code, just a dead import path.
- **Suggested fix:** Remove the unused re-export lines; low-value cleanup, no functional impact.
- **Confidence:** Medium. **Source:** knip/ts-prune flagged the types as "unused exports"; grep confirmed the types are alive via other import paths, downgrading this from a dead-code finding to a redundant-re-export one.
