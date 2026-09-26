# Calculator Builder — Design

Status: agreed direction 2026-09-25; steps 1–11 done on `calculator-builder`. This is the working source
of truth for the move from "modules + templates + quote builder" to purpose-built
calculators, in the same way `RESKIN_GAP_ANALYSIS.md` was for the reskin.

## Direction (decisions)

- **The calculator is the main feature.** Quotes stay, but secondary.
- **Clear separation of math and input.** Math lives in **functions** (as today). A
  calculator only declares inputs, connects them to functions, and lays out the page.
- **Built in the app, not in code.** Calculators are data, made with an in-app builder by
  someone who writes functions and arranges layouts but doesn't write code. Custom
  hand-coded calculator pages are possible later as an exception, not the plan.
- **Users are the owner and staff**, inside this app (not a public/embedded tool).
- **Staff only use calculators**; the owner builds them. Staff don't edit.
- **Sharing is Export/Import** (decided 2026-09-25). All data stays in each browser's
  localStorage. An external database or cloud sync is deferred, not planned.
- **Parts** (decided 2026-09-25): a calculator's math is grouped into parts (Framing,
  Sheeting, Paint). While building, each part is tested on its own like a template module
  today; staff see one form. See "Parts" below.
- **Prices are material properties** (decided 2026-09-25): a material can carry several
  prices (per sheet, per m², per pallet) and a calculator step picks the one it needs, so the
  same product isn't listed once per pricing. See "Catalog prices" below.

## Why

A module owns its inputs, so any input shared by several modules (wall width for framing,
drywall and paint) has to be entered once per module and joined with field links. Templates
are chains of modules held together by those links, which is what makes them clunky, and a
lot of code exists only to manage links (`lib/utils/field-linking/`, template link analysis,
workspace linking, link remapping on import).

In a calculator an **input is declared once** and any number of calculations read it. Links
aren't needed at all.

A module is already a small calculator (inputs → chain of computed outputs → cost formula).
This design promotes it: one bigger unit, plus a layout, with cost as an ordinary result.

### Evidence: the two partition-wall drafts (2026-09-25)

The same wall was built twice: as the "Partition wall template" (Framing, Sheet
Installation and Paint modules, linked) and as one "Partition wall" module. Both give
2716.56 kr.

- **Template, good for building**: each module is small, with its own test, outputs and
  cost, so Framing can be finished before Paint exists, and per-part subtotals come free.
- **Template, bad**: width, height and quantity are asked three times and joined by six
  links (the linked fields store 0); staff see Link/Unlink and per-module "Lock into quote";
  the copies drifted from the big module (framing count with/without spill and quantity,
  plain `sheets` price vs `price_per_sheet`, "pcs" unit on layers); each cost formula repeats
  its output's expression instead of using it.
- **Big module, good for use**: one form, every input asked once — the target front end.
- **Big module, bad for building**: the test panel is all-or-nothing (11 inputs, one error
  for the whole module, other outputs showing a misleading 0 or "—"); outputs are a flat list
  with nothing saying which belong to paint or which inputs each uses; the cost is one long
  formula, so the per-part subtotals are gone; no input defaults, so nothing calculates
  until everything is filled.

Parts take the building experience of the first and the result of the second.

## Concepts

| Layer | What it is | Who edits it | Status |
|---|---|---|---|
| **Functions** | Pure math with typed, unit-aware parameters. Can call other functions. | Function editor | Exists; small additions |
| **Catalogs** | Materials and labor with properties, including several prices | Materials / Labor pages | Price properties formalised |
| **Calculator** | Inputs + parts (steps, the math wiring) + layout | Calculator builder | New |
| **Quote** | Line items sent from calculators | Quotes page | Secondary; adapted |

Modules and templates are converted into calculators and then retired (see Migration).

## Parts

- A **part** is a named group of steps inside one calculator, usually ending in a money
  step that is the part's cost (Framing → `framing_length`, `lumber_cost`).
- **Inputs belong to the calculator, not the part.** A part's inputs are worked out from its
  steps: the inputs they read, directly or through earlier steps. Typing width 4 while
  testing Framing means Paint has width 4 too — the same input, not a link.
- A step may read a step from another part (Paint using an area worked out in Framing); the
  part card shows that as a read-only "from Framing" value.
- **Totals**: each part names its cost step; the calculator's total is the sum of part
  costs, and is what goes to a quote unless another step is chosen.
- **Errors stay in their part.** An unset stud spacing marks Framing (and anything reading
  its steps); Sheeting and Paint still calculate.
- **Reuse is through functions**, not shared parts. Framing math that several calculators
  need becomes a function (e.g. `framing_length(width, height, stud_spacing)`), so it can't
  drift. Later option: "copy a part from another calculator", matching its inputs to this
  calculator's by key when inserted — a one-time copy, never a live link.

## Data model (sketch)

```ts
interface Calculator {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inputs: CalculatorInput[];
  parts: CalculatorPart[];
  steps: CalculatorStep[];
  layout: LayoutSection[];
  quoteCostStepId?: string;   // default: the calculator total (sum of part costs)
  createdAt: string;
  updatedAt: string;
}

interface CalculatorPart {
  id: string;
  name: string;               // "Framing"
  description?: string;
  costStepId?: string;        // the step whose value is this part's cost
}

// What the math sees (value) is separate from how it's shown (widget).
interface CalculatorInput {
  id: string;
  key: string;                // variable name, e.g. wall_width
  label: string;
  help?: string;
  value:
    | { kind: 'number'; unitCategory?: UnitCategory; unitSymbol?: string;
        default?: number; min?: number; max?: number; step?: number }
    | { kind: 'boolean'; default?: boolean }
    | { kind: 'choice'; options: { id: string; label: string; value: number }[];
        unitCategory?: UnitCategory; unitSymbol?: string; default?: string }
    | { kind: 'material'; category?: string; default?: string }
    | { kind: 'labor'; category?: string; default?: string }
    | { kind: 'text'; default?: string };          // notes only; never reaches the math
  widget: InputWidget;        // must be valid for value.kind (table below)
  visibleWhen?: Condition;
}

type InputWidget =
  | 'number' | 'stepper' | 'slider'                // number
  | 'toggle' | 'checkbox'                          // boolean
  | 'dropdown' | 'segmented' | 'radio'             // choice
  | 'picker'                                       // material, labor
  | 'text';                                        // text

interface CalculatorStep {
  id: string;
  partId: string;
  key: string;                // e.g. stud_count; later steps and the layout refer to it
  label: string;
  source:
    | { type: 'call'; functionName: string; args: Record<string, Binding> }
    | { type: 'expression'; expression: string }   // escape hatch for simple sums etc.
  unitCategory?: UnitCategory;
  unitSymbol?: string;
  format?: 'number' | 'count' | 'money' | 'percent';
  decimals?: number;
  enabledWhen?: Condition;    // when false the step is 0 (e.g. "Include insulation" off)
}

type Binding =
  | { type: 'input'; key: string }
  | { type: 'step'; key: string }
  | { type: 'constant'; value: number; unitSymbol?: string }
  | { type: 'property'; inputKey: string; property: string };  // selected material's width or price_per_sheet

interface LayoutSection {
  id: string;
  title?: string;
  description?: string;
  visibleWhen?: Condition;
  items: LayoutItem[];
}

type LayoutItem =
  | { type: 'input'; inputId: string; width?: 'full' | 'half' | 'third' }
  | { type: 'result'; stepId: string; style: 'headline' | 'card' | 'row' }
  | { type: 'breakdown'; title?: string; partIds: string[] }  // each part's cost + total
  | { type: 'text'; text: string }
  | { type: 'divider' };

type Condition =
  | { inputKey: string; op: 'is' | 'isNot'; value: boolean | string }   // toggle / choice
  | { inputKey: string; op: '>' | '<' | '>=' | '<='; value: number };
```

Notes:
- **Value vs widget** is the core of the separation. "Stud spacing 400 / 600 mm" is a
  `choice` of lengths shown as segmented buttons; the function only receives a length.
  Swapping it to a dropdown is a pure layout change.
- **Choice options carry numbers.** Where today's string-mode dropdowns feed formulas,
  conversion gives each option a number (or turns it into a material pick) — to be checked
  per module during migration.
- **Cost is just a step** with `format: 'money'`, named as a part's cost.
- **Inputs and layout are stored separately** but the builder makes them feel like one
  thing: adding a field to a section creates the input. Every input appears in the layout
  once.
- **Defaults matter more now**: with defaults set, a part card calculates the moment it's
  opened. The builder nudges towards a default for every required input.
- Keys are unique within a calculator; step and input keys share one namespace.

### Function additions

- **Parameter kind** (`number` | `material` | `labor` | `boolean`, default `number`).
  Today a material parameter is only inferred from `param.width` use. An explicit kind
  lets the binding UI offer only material inputs for a material parameter, and lets the
  test panel pick the right control without guessing.
- Everything else (units, return unit, nesting, usage tracking, rename warnings) carries
  over. "Used by" should also list calculators.

## Catalog prices

Materials already allow properties of type `price` (the real data has `price_per_sheet`,
`price_per_m2`, `price_per_bucket`), and formulas already read them as
`sheets.price_per_sheet`. This formalises it:

- **A price property is an amount per unit**: "312.56 per sheet", "10 per m²",
  "4200 per pallet". The "per" unit is either a measure (m, m², l) or a count unit
  (sheet, bucket, pallet, pcs). No pack maths for now (decided 2026-09-25): a pallet price
  is just another price; nothing converts sheets to pallets.
- **One price is the default**: shown in the catalog list and next to the material in
  pickers. The material's current top-level `price`/`unit` becomes that default price
  property on migration (or is matched to an existing identical one), so there's one place
  for prices.
- **Steps name the price they use** (`property` binding, or `material.price_per_m2` in an
  expression). A plain `material` reference no longer means "its price".
- **Pickers help**: a material input shows only materials that have every property the
  calculator reads from it (so a sheet without `price_per_m2` isn't offered to a per-m²
  calculator), or shows them marked "missing price_per_m2".
- Per-length/area prices convert the opposite way to measures (per mm → per m multiplies by
  1000); unit handling for them needs its own tests.

The current catalog is test data with known errors; it isn't used to shape any of this and
is not cleaned up by migration.

## Engine

New `lib/calculator/` with pure, tested code, no React:

- **`evaluateCalculator(calculator, values, catalogs, functions)`** → per-step value, unit,
  error, and "waiting on" info; per-part inputs used, cost and status; calculator total.
- **Dependency order, not list order.** Build a graph from bindings/expressions, sort it
  topologically, report cycles by name. Steps can be listed in any order in the builder.
- **Errors stay local.** A failing step marks itself and the steps depending on it
  ("waiting on Stud count"); every other result still shows. (Today one failing computed
  output zeroes the whole module cost.)
- **No evaluation without values.** A step whose material isn't picked reports "choose a
  material" instead of throwing; today every page load logs ~180 console errors from
  modules evaluated before a material is chosen.
- **Units** as today: number inputs are entered in their display unit and converted to base
  units before the math; results are converted back for display.
- **One way to call a function.** A small `callFunction(fn, argValues, catalogs, functions)`
  used by the calculator engine, the function test panel, and expression steps. Today
  `evaluateFunctionCall` takes arguments as variable-name strings and
  `function-sample.ts` mirrors it; a value-based call is simpler to bind to and removes the
  duplication.
- Reuse the existing parser, validator, unit validation and math runtime unchanged.

## The builder (for someone who doesn't write code)

Two views of the same calculator, both live (type test values, watch results update). Test
values are the calculator's own values, so switching views keeps them.

**Parts view** (the math, where most building happens) — one card per part, like a template
module in today's quote workspace:
- The card shows the inputs this part uses (editable test values), values it reads from
  other parts (read-only), its steps with live values, and its cost; errors show on the step
  that fails.
- **Add a step**: "pick a function → for each parameter, pick an input, another step, a
  number, or a material property (including a price)" — dropdowns filtered by parameter
  kind and unit, no typing. Each step shows its live value. "Write an expression instead"
  is the escape hatch, using the existing formula editor with autocomplete. "Only calculate
  when…" sets `enabledWhen`.
- **New input from a step**: while binding a parameter, "new input…" creates the
  calculator input on the spot (label, unit, default), so parts can be built before the
  layout exists. New inputs land in an "Unplaced" tray for the layout view.
- Parts can be added, renamed, reordered and collapsed; steps can be dragged between parts.
- A part can be focused (others collapsed) to build it in isolation.

**Layout view** (what staff see):
- **Canvas** (centre): sections with their inputs, results and text, in order. Click
  anything to select it; drag to reorder within and between sections. "Add" menus at the
  end of each section: Number, Toggle, Choice, Material, Labor, Text note, Result,
  Breakdown, Divider; plus placing inputs from the "Unplaced" tray.
- **Inspector** (right): properties of the selected item. For an input: label, help, key,
  kind, unit, default, limits, widget (only widgets valid for the kind), options for a
  choice, "show when…". For a result: which step, style, format.
- Preview toggle hides editing chrome to show exactly what staff see.

**Checks** shown in both views: unbound parameter, unit mismatch, cycle, input not placed in
the layout, missing default, result referring to a deleted step, key in use, material
property/price not present on some materials in the input's category.

## Using a calculator (staff)

- **Calculators** becomes the home page and first nav item: a grid by category.
- Opening one shows the calculator only — no editing chrome, no math.
- Values start from defaults. "Reset" returns to defaults.
- **Send to quote**: pick a quote (or new) → adds a line item with the calculator name,
  a short summary of inputs/results, the part breakdown, and the quote cost.

## Staff devices

- **Calculator pack**: an export of calculators plus everything they depend on (the
  functions they call, including nested ones, and the materials/labor catalogs). Staff
  import it; importing a newer pack replaces the calculators, functions and catalogs, and
  never touches the staff member's quotes. The owner chooses which calculators go in
  (decided 2026-09-26), so calculators can be built and tested without reaching staff; the
  full export stays as the owner's backup.
- **Use-only mode**: a per-browser setting (in the Settings menu) that hides the builder
  and the library pages (Functions, Materials, Labor), leaving Calculators and Quotes.
  Importing a pack offers to turn it on. There are no accounts, so this keeps things
  simple for staff; it isn't security.
- The pack shows its export date, and the Calculators page shows which pack is loaded, so
  it's easy to see whether a device is out of date.

## Quotes (secondary)

- Line items get `calculatorId` instead of `moduleId`; they stay snapshots, so existing
  line items keep displaying unchanged.
- The Quote Builder's workspace (drafts, linking, templates) is replaced by "send to quote"
  from calculators. The quote page keeps line items, markup, tax, totals, export/print.
- Existing workspace drafts are dropped after conversion (they reference modules), with a
  notice — to confirm against real data before doing it.

## Migration

Automatic and repeatable, as pure functions with regression tests, using real exported data
as a fixture:

- **Module → calculator**: fields → inputs (number → number, numeric dropdown → choice,
  boolean → toggle, material/labor → picker, text → text); computed outputs → expression
  steps in **one part** named after the module; the module formula → that part's cost step;
  layout = one inputs section + one results section. Formulas are kept as expressions, not
  rewritten into functions; they can be split into parts and refactored by hand.
- **Template → calculator**: **one part per module instance** (named by its nickname or
  module name), holding that module's outputs and cost. Every instance's fields become
  inputs, except linked fields, which collapse into the input they link to (the link data
  says exactly which fields are the same). Keys are prefixed per part where they'd collide
  (`framing_quantity`). Layout = one section per part plus a breakdown.
- **Material references**: a plain material reference used as a price (`* sheets`) is
  rewritten to the material's default price property.
- **The partition wall**: the big module is the reference version. In particular framing
  length is `perimeter + height × stud count`, with spill and quantity applied in the cost
  step, not inside the length. After migration, the converted template can be deleted or
  kept for comparison; it is not merged into the big module automatically.
- Modules and Templates pages become read-only after conversion, then are removed together
  with field linking, template link analysis and the quote workspace.
- **Export/import** gains calculators (new export version); older files still import, and
  their modules/templates convert on import.

## Build order

Each step is committed separately, like the reskin.

1. **Engine and model**: types (including parts), calculator store, `evaluateCalculator`,
   `callFunction`, dependency ordering, per-part status, conditions, module → calculator
   conversion. Tests only, no UI.
2. **Run view + Calculators page**: the staff-facing renderer and list, filled with
   converted modules so the engine is checked on real data early. Calculators become home.
3. **Builder: parts view** — part cards with inputs used, live steps and costs, local errors;
   steps as expressions; inputs created from the parts view. This is the fix for building
   big calculators, so it comes first.
4. **Builder: layout view** — canvas, inspector, sections, widgets, results, breakdown,
   unplaced tray, preview toggle.
5. **Function-call steps** — the pick-a-function binding UI; function parameter kinds.
6. **Conditions** — `visibleWhen` on inputs/sections, `enabledWhen` on steps.
7. **Catalog prices** — price properties with "per" units, default price, migration of
   top-level prices, pickers filtered by required properties.
8. **Template → calculator conversion**; Modules and Templates go read-only.
9. **Quotes on calculators** — send to quote, `calculatorId` line items, simplified quote page.
10. **Remove** modules, templates, linking and the quote workspace; export/import update.
11. **Staff devices** — calculator pack export/import and use-only mode.

## Implementation notes

**Step 1 — Engine and model** (`lib/calculator/`, `lib/stores/calculators-store.ts`):
- `types.ts`: the model above, plus results. Values are keyed by input key; numbers in base
  units, choices by option id, pickers by variable name.
- `evaluate.ts`: `resolveInputValues` (typed value, else default; blank numbers, unpicked
  or deleted materials are left out; toggles default to off) and `evaluateCalculator`. Step
  statuses: ok, disabled (condition off, counts as 0), missing (names the inputs), blocked
  (names the steps it waits on), error. A step is only evaluated when everything it reads is
  available, so missing values never reach `evaluateFormula` and log nothing. Part results
  give the inputs used, steps read from other parts, missing inputs, status and cost; the
  total is the sum of part costs once all are available.
- `dependencies.ts`: an expression scanner that tells calls from values (so `spill(spill)`
  works) and skips exponents; per-step dependencies and errors known before evaluation
  (unknown names, missing functions, unbound parameters, `out.x`, text inputs in math,
  properties of non-picker inputs); ordering by what steps read, with circular references
  found as strongly connected components. Names clashing with an input or another step
  error on those steps.
- `call-function.ts`: `callFunction(fn, args, library)` with values by parameter name,
  catalogs including labor. The function test panel still uses its own copy; it moves onto
  `callFunction` with parameter kinds in step 5.
- `from-module.ts`: `calculatorFromModule`, as described under Migration. Numeric dropdowns
  with a unit keep base-unit option values; text options are numbered 1…n with a warning;
  an output whose name clashes with a field is renamed (`area_2`), rewriting later outputs'
  bare references to it but not the cost formula's, matching how modules evaluated them.
- The store is in place but nothing uses it yet.
- Checked: 18 regression checks (`calculator-regression.ts`), including parity with
  `calculateModuleInstance` for the partition wall; and, read-only, the four real drafts
  (Framing, Sheet Installation, Paint, Partition wall) give the same cost converted as today.

**Step 2 — Run view and Calculators page**:
- **Home is Calculators** (`app/page.tsx`); the quote board moved to `/quotes/board` and the
  sidebar's Quotes item with it (the builder stays at `/quotes`). A calculator opens at
  `/calculator?id=…`: calculators live in the browser, so the static export can't have a
  page per calculator.
- **Modules show up as calculators, converted on the fly** (`calculatorsFromModules`,
  `hooks/use-calculators.ts`), marked "From module", with ids derived from the module's.
  Nothing is written to storage, and a module edit shows straight away. Saved calculators
  (none yet) list first.
- **Run view** (`components/calculator/`): the layout's sections; sections holding only
  results sit in a sticky side column on wide screens. Inputs by widget: number (typed in
  its unit, blank allowed), checkbox, dropdown or segmented choice, material/labor picker,
  text. Results say why they have no value ("Needs Width and Height", "Waiting on …", or the
  error), and a result names every input it's missing, including those missing further up
  (`StepResult.missingInputs` now includes upstream inputs). Inputs are marked "Needed to
  calculate" only once something has been typed. `visibleWhen` on sections and inputs is
  already respected.
- **Values** are kept per calculator for the session (`calculator-session-store`, not
  persisted): they survive moving between pages, not a reload. Reset returns to defaults.
- **Units**: modules showed output units as labels without converting. Converted outputs
  whose unit isn't a base unit (the partition wall's paint volume in l) get `unitIsLabel`,
  so they still show "2 L" rather than 2000 L; other steps convert from base units.
- Checked in the browser with real data: the partition wall gives 2716.56 kr as in the
  quote draft, "Sheeting on both sides" gives 8 sheets and 3966.80 kr, values survive
  navigation, Reset clears them, no console errors from the calculator pages, and no
  sideways scroll at phone width. `npm run build` passes.
- Later: on a phone the results come after all inputs; a sticky total bar may be needed.

**Step 3 — Builder: parts view** (`components/calculator-builder/`, `app/calculator/edit`):
- **Where it starts**: "New calculator" on the Calculators page (`/calculator/edit`), or
  Edit in the staff view (`/calculator/edit?id=…`). Editing a module shown as a calculator
  opens a copy (`copyCalculator`, fresh ids, `sourceModuleId` kept); nothing is stored until
  Save, and once saved the module's on-the-fly version is hidden in favour of the saved one.
  Deleting that calculator brings the module's version back.
- **Parts view**: one card per part with the inputs its steps read (live test values, shared
  across parts and with the staff view), values it reads from other parts, its steps with
  live values or what they need, and its cost. Steps expand to edit label, name (follows
  the label until edited), formula (the module editor's autocomplete: inputs, steps,
  material/labor properties, functions), format, unit, "This is the part's cost" and "Show
  to staff"; they can be reordered and moved to another part. An "Unknown name" error offers
  "Create input …", opening the input dialog with that name. Parts can be added, renamed,
  reordered and deleted (with their steps, after confirming).
- **Inputs** are created and edited in a dialog: label, name, kind (number, choice, yes/no,
  material, labor, text note), unit, default, choice values (typed in the unit, stored in
  base units), category for pickers, help. Inputs no step uses yet sit in "Inputs not used
  yet".
- **Pure edits** (`lib/calculator/editing.ts`, tested): renaming an input or step rewrites
  every formula (including `key.property`), binding and condition that uses it; removing
  something removes it from the layout and as a part's cost. Until the layout view (step 4),
  the layout is kept automatically: new inputs are added to the first inputs section, "Show
  to staff" adds a result row before the results section's breakdown, and a new part joins
  a breakdown listing all parts.
- **Save** needs only a name; steps with errors can be saved (the header counts them). A new
  calculator's URL switches to its id on save. Close/Cancel asks before discarding changes.
- Checked in the browser on an empty origin: building a calculator from nothing (step →
  "Create input" → dialog → live values → cost → rename carried into the formula → save →
  staff view → delete); and on real data, opening the partition wall in the builder and
  closing it without anything being stored.
- Later: session test values don't carry into a module's copy (the copy's choice option ids
  are new).

**Step 4 — Builder: layout view** (`LayoutCanvas`, `LayoutInspector`):
- The builder has **Parts | Layout** tabs. The layout canvas draws the page with the same
  renderer as the staff view (`components/calculator/CalculatorLayoutItem.tsx`), live, so
  test values can be typed while arranging. **Preview** hides the editing chrome and the
  inspector.
- **Selecting**: clicking or focusing an item selects it; the "Section" tag selects its
  section. **Moving**: drag an item by its handle within or between sections (dnd-kit, one
  sortable group per section, empty sections accept drops), or use the inspector's Section
  select and earlier/later buttons (keyboard-friendly).
- **Inspector**: for an input, width (⅓, ½, full), how it's shown (number box, stepper,
  slider; switch or checkbox; dropdown, buttons in a row, radio list), Edit input, remove
  from page. For a result, which step and style (row, card, headline). A breakdown's title
  and parts; a text block's text; dividers. For a section, title, description, move, delete
  (its inputs become "Not on the page"), and adding an unplaced input, a hidden result, a
  new input (placed in that section), a breakdown, text or a divider. With nothing selected
  it lists inputs not on the page with Place buttons.
- **New widgets** in the staff view: stepper (steps by the input's step, else 1 in its unit,
  within min/max), slider (min–max, else 0–100 in its unit, value shown beside it), switch
  (now the default for yes/no), vertical radio list. The input dialog gained lowest,
  highest and step for numbers.
- **Pure edits** (tested): `addSection`, `updateSection`, `removeSection`, `moveSection`,
  `insertLayoutItem` (an input or result already placed moves rather than showing twice),
  `moveLayoutItem`, `removeLayoutItem`, `updateLayoutItem`, `unplacedInputs`, `widgetsFor`,
  `layoutItemKey`/`findLayoutItem`. Breakdowns, text and dividers get ids
  (`ensureLayoutIds`, on opening the builder) so a selection survives moves.
- On the canvas, sections of results go in a side column only on very wide screens (2xl),
  as the inspector takes the room; the staff view still uses lg.
- Checked in the browser on the partition wall's builder copy, without saving: a new
  "Framing" section, Stud spacing switched to buttons and moved there via the inspector,
  Lumber dragged into it, a result restyled as a card, Preview, then Cancel → Discard with
  nothing stored.

**Step 5 — Function-call steps**:
- A step's editor has **Calculate with: Function | Formula**. Function: choose a function
  (sorted by category), then give each parameter an input, a result, a property of a picked
  material/labor ("Sheets → width"), a fixed number (typed in the parameter's unit), or
  "New input…", which opens the input dialog with the parameter's label and kind and links
  the new input when added. Lists only offer what fits the parameter's kind; a note shows
  when an input or result is in another kind of unit than the parameter expects. The call
  is shown as a formula underneath, and collapsed steps show it too.
- **Switching**: Formula → Function converts a formula that is exactly one call with plain
  arguments (`expressionToCall`); Function → Formula writes the call out
  (`callToExpression`, numbers in base units). Otherwise the step's previous form is kept
  to switch back to.
- **Parameter kinds**: function parameters have an optional kind (number, material, labor,
  yes/no; `lib/functions/param-kinds.ts`); unset, it's worked out from the formula as
  before. The function editor's parameters gained "Expects" and a unit. The engine reports
  a material/labor parameter given anything but an input of that kind.
- **One way to call a function**: the function test panel now goes through `callFunction`
  (with labor available), offers labor pickers and yes/no for such parameters.
- **Usage**: a function's "Used by" (list and editor, delete and rename warnings) includes
  saved calculators that call it, by function-call step or formula.
- Checked in the browser on the partition wall's builder copy, without saving: "Paint area"
  (`area_rectangle(width, height)`) switched to Function with both parameters bound; Height
  set to a fixed 2.5 and Width typed 4 gave 10 m²; "New input…" created "Wall length" and
  linked it; switching back gave the formula `area_rectangle(width_2, 2.5)`. The function
  editor shows "Expects" per parameter. Nothing was stored.

**Step 6 — Conditions** (`ConditionEditor`):
- **Steps**: "Only calculate when…" in the step editor; when it doesn't hold the step is 0
  (so are totals using it) and shows "Off (0)". Collapsed steps show "Only when …".
- **Inputs and sections**: "Show only when…" in the layout inspector. On the canvas, items
  and sections with a condition carry "Shown only when …"; a hidden input shows as a
  placeholder while editing and disappears in Preview and for staff.
- **The editor** picks an input (any but text notes and, for an input, itself; it starts on
  a yes/no input) and a test shaped by its kind: yes/no "is on/off"; choice "is/is not" an
  option or "is more than/at least/less than/at most" a number; material/labor "is/is not"
  an item; number compared with a value typed in its unit (stored in base units).
- `describeCondition` (format.ts) words conditions ("Width > 300 cm", "Finish is not
  Matte"). Deleting an input also clears conditions that tested it (`removeInput`), since a
  condition on a missing input would hide its item for good. `setInputCondition`,
  `conditionInputs`, `defaultCondition` are in editing.ts. All tested.
- **Semantics kept simple**: a hidden input still counts with its value or default; steps
  that should drop out need their own "Only calculate when" (the inspector says so).
- Checked in the browser on the partition wall's builder copy, without saving: "Paint
  area" only when "Painted on both sides" is on (Off (0) until switched on), the Paint
  picker shown only when it's on, then in Preview the picker disappears and reappears with
  the switch. Nothing was stored.

**Step 7 — Catalog prices**:
- Differs from the plan: the **default price stays the material's own Price / Per fields**
  (no data migration; modules, quotes and pickers keep reading them). Other prices are price
  properties, edited in the material editor's new **Prices** section (amount, per unit, name
  suggested as price_per_<unit>; "price" is reserved).
- Prices convert the opposite way to measurements (`lib/catalog/prices.ts`); a materials-store
  migration (v1) and data import recompute price properties' stored values.
- `x.price` / `x.cost` fall back to the default price / labor rate (`getMaterialValue`,
  `getLaborValue`). In calculators a bare material in arithmetic is an error pointing to
  `x.price`; module conversion rewrites it (parity kept on the four real modules).
- Pickers mark and disable items missing a property the calculator reads
  (`lib/calculator/requirements.ts`).
- Checked: 209 regression checks; the four real modules keep their cost when converted
  (Sheet Installation now reads `sheets.price`); in the browser, the Prices section,
  adding a per-pallet price (then cancelled), and a picker marking both sheets "missing
  weight" for a step reading `sheets.weight`. The v1 migration ran on the real catalog and
  left every stored price the same.

**Step 8 — Templates as calculators; Modules and Templates read-only**:
- `calculatorFromTemplate` (`lib/calculator/from-template.ts`): a part per module instance
  (duplicates numbered), each converted like a module. Fields linked to another field become
  that one input (following chains); fields linked to another module's output read that
  output's step. Inputs keep their names unless two parts clash, then the part name goes in
  front (`trim_quantity`, labelled "Quantity (Trim)"); cost steps are `<part>_cost`. Broken
  links become inputs of their own and missing modules are left out, both with warnings.
  Template values aren't used (templates start from defaults). Layout: a section per part
  (its inputs and output rows), then a "Total" breakdown.
- Templates show on the Calculators page like modules, converted on the fly ("From
  template"); Edit copies one into a calculator of your own (`sourceTemplateId`), which then
  replaces it in the list. `convertedFrom` / `sourceViewId` in `hooks/use-calculators.ts`
  replace `isModuleView`.
- **Read-only**: the Modules and Templates pages lose New, Edit and Duplicate; a card opens
  its calculator, a notice explains where they went, and Delete stays. The module and
  template editors are no longer reachable (removed in step 10). Quotes still use modules
  and templates until step 9.
- Checked: regression checks with links to fields, to an output, broken links and a
  missing module, with the total equal to the modules calculated one by one; and the real
  "Partition wall template" rebuilt from its links converts to 11 inputs and gives 1167.32 +
  1250.24 + 299 = 2716.56, as in the Template quote.
- Checked in the browser with the test dataset reloaded: the template shows as a calculator
  (11 inputs, 3 parts) and gives $1167.32 + $1250.24 + $299.00 = $2716.56; Edit opens a
  copy with the three parts and no errors, and Close returns without storing anything; the
  Templates and Modules cards open their calculators; no console errors.

**Step 9 — Quotes on calculators**:
- **Send to quote** in the staff view (disabled until the calculator has a total): pick an
  existing quote (most recently edited first) or a new one by name, add an optional label
  ("North wall"). `buildCalculatorLineItem` (`lib/quotes/calculator-line-item.ts`) makes the
  line: the quote cost, `calculatorId`, the values it was sent with, a summary (results on
  the page that aren't money, then the inputs, as shown) and label/value `details` for
  export; hidden inputs and sections are left out. `putLineItem` adds or replaces a line and
  works out the totals; `sendToQuote` in the quotes store writes it to the open quote (keeping
  the saved copy in step), a saved one, or a new saved one.
- **Edit** on a calculator line opens its calculator with the line's values and remembers the
  line (`openFromLineItem` in the session store); Send to quote then offers "Update the line it
  was opened from", ticked. Old module lines can't be edited.
- **The quote page** (`QuoteView`) is the quote only: name, lines with Edit and Remove,
  markup, VAT, total, Export JSON, print, and "Add from a calculator". The module workspace
  (drafts, linking, templates, module picker) is no longer shown; a quote that still has old
  drafts lists them with "Remove the drafts". The Quotes board lost the "Launch a template"
  rail. Line items keep `moduleId` (now optional) for old lines; export uses a line's
  `details` when it has them, and print shows its summary. The workspace code is removed in
  step 10.
- Checked in the browser with the test dataset: the partition wall template sent to a new
  quote "Step 9 check" as $2716.56 with its summary; the quote page lists it; Edit reopened
  the calculator with the same values; width 5 and Update line changed that line to $3320.95
  (still one line); the test quote was then deleted. The old-drafts notice wasn't seen, as no
  quote in the dataset has drafts.

**Step 10 — Modules, templates, linking and the quote workspace removed**:
- **Nothing is lost**: on first load, every module and template that isn't a saved calculator
  yet becomes one, under the id it was shown with (`module-…`, `template-…`), so quote lines
  and Edit keep finding them (`lib/calculator/legacy.ts`, `importLegacyCalculators` in the
  calculators store, run once and flagged `legacyImported`). The old `modules-store` and
  `templates-store` data is left in browser storage, unread after that. Saved quotes lose the
  old builder's drafts on load (quotes store v1), with a notice naming the quotes that had
  them; their lines and totals are unchanged.
- **Removed**: the Modules and Templates pages and editors, the module and template stores,
  field linking, template link analysis, the quote workspace (drafts, linking, template
  application, reopen, module picker, module field inputs), the on-the-fly conversion
  (`convertedFrom`, copying a module or template into the builder), unused helpers
  (`function-dependencies`, `AlertBanner`) and their tests. The sidebar is Calculators and
  Quotes, then Functions, Materials, Labor. `Quote.workspaceModules` and the workspace types
  are gone; `CalculationModule` and `ModuleTemplate` stay, documented as retired types read
  only for conversion. `SectionBar` moved to `components/shared`, `FormulaOperatorGuide` to
  `components/formula`.
- **Kept on purpose**: `calculatorFromModule`/`calculatorFromTemplate` (conversion and old
  export files) and the old module calculator, used only by the tests to check that a
  conversion keeps the cost.
- **Export/import 2.0.0**: calculators, functions, materials, labor and categories. Calculators
  keep their ids on import. Older files still import, their modules and templates converted
  like stored ones (with a notice). Replace only replaces the kinds a file contains; merge
  skips calculators whose id or name is taken.
- **Elsewhere**: a function's usage and the material/labor editors' "used in" counts now look
  at calculators; the function editor offers calculator input names as parameters instead of
  module fields.
- Checked: 137 regression checks, including the one-time conversion (and that it doesn't run
  twice), export → replace round trip keeping ids, merge, old files, and dropping drafts;
  `npm run build` (no /modules or /templates). In the browser with the test dataset: the four
  modules and the template became five saved calculators with their old ids, the old storage
  keys still there; the template calculator gives $2716.56; Edit opens it directly.
- Not updated: README.md and ONBOARDING.md still describe modules and templates (done in
  step 11).

**Step 11 — Staff devices** (`lib/calculator/pack.ts`, `lib/stores/device-store.ts`,
`components/PackExporter.tsx`):
- **Two exports** in Settings → Data (decided with the user): **Export calculator pack…**
  for staff devices and **Export all data** as the owner's backup (unchanged, includes
  unused functions). Import reads both.
- **Pack file**: the 2.0.0 format with `kind: 'pack'`, the chosen calculators (store order),
  the functions they call by function-call step or formula plus the functions those call
  (`functionsUsedBy`, following formulas with the expression scanner; loops and unknown
  names are fine), the whole materials and labor catalogs, categories and `exportedAt`.
  Validation requires a pack to carry calculators, functions and labor, since loading it
  replaces all of them. Downloaded as `calculator-pack-YYYY-MM-DD.json`.
- **Choosing calculators**: a dialog with a checkbox per calculator, All/None, and a count
  of calculators, functions, materials and labor. The first pack ticks everything; after
  that the calculators in the last pack start ticked and new ones start unticked ("Not in
  last pack"), so drafts and tests stay out until chosen; "Changed since" marks ones edited
  after the last pack. The last export (date and ids) is kept per browser in the new
  `device-store`, which is never exported or replaced by an import.
- **Loading a pack**: the importer recognises a pack and, whatever merge/replace is
  selected, shows a confirmation instead: the export date and calculator names; a warning
  if it's older than the loaded pack (still allowed, e.g. to roll back), a note if it's the
  same one; the device's calculators not in the pack, which it removes; and "Turn on
  use-only mode" (ticked, not shown if already on). Loading is `importData` in replace
  mode, so quotes are untouched. Any replace that brings calculators records the loaded
  pack (date, time loaded, count) for a pack and clears it for any other file.
- **Which pack**: the Calculators page header shows "Calculator pack from <date>" on a
  device that loaded one, and "Last pack exported <date>" on the device packs are made on.
- **Use-only mode**: a switch in Settings with the hint that it's a convenience, not a lock.
  It hides the Catalog navigation, New calculator (the empty state says to load a pack),
  Edit on a calculator, and the two export items (Import becomes "Load calculator pack").
  `/calculator/edit`, `/functions`, `/materials` and `/labor` show a "Not available in
  use-only mode" notice from `Layout` instead of the page. `useUseOnlyMode` reads the
  setting through `useHydrated` (`useSyncExternalStore`), so hydration matches the
  prerendered HTML and client navigation doesn't flash the hidden items.
- **Docs**: README.md and ONBOARDING.md rewritten for calculators, parts, functions,
  catalogs, quotes, packs and use-only mode.
- Checked: 13 new regression checks (`pack-regression.ts`): nested and looping function
  calls, pack contents and validation, default selection, new/changed marks, date
  comparison, removed calculators, export remembering the selection, loading replacing
  calculators, functions and catalogs while quotes stay, and the loaded pack being kept by a
  merge and forgotten by a non-pack replace. In the browser on an empty origin: imported two
  calculators and three functions; the pack dialog counted the two functions actually used
  (a nested call, not the unused one); a new "Draft test" calculator started unticked as
  "Not in last pack"; loading the pack listed Draft test as removed, turned on use-only
  mode, and left Calculators and Quotes with the pack date shown, no Edit or New, and the
  hidden pages showing the notice; an older pack showed the warning (cancelled); switching
  the mode off brought everything back; the dialog fits at phone width.

## Open questions

- **Saved runs.** Is it useful to save a filled-in calculator by name ("Smith deck") and
  reopen it later, separate from quotes? Needs real-world use to answer.
- **Repeating groups.** Some jobs have "N walls, each with its own size". The model above
  has fixed inputs. A repeating section (add/remove rows, results summed) is common and
  high impact: the next larger addition.
- **Copy a part** from another calculator (see Parts): a workflow improvement to consider.
- Low priority: a sticky total bar on phones; session test values in a module's copy.

## After step 11: workflow improvements

**Inputs from function parameters.** Work usually starts with functions, so a function's
parameters now define the calculator's inputs rather than the other way round. Picking a
function for a step (or switching a plain call formula to a function step) gives every
parameter without a value, in order: the input of the same name if it is the right kind
(a number parameter takes a number or choice input, material/labor/yes-no their own), else
a result of that name, else a new input made from the parameter: its name as the key (or
`board_2` when the name is taken by something of the wrong kind), its label, and for
numbers its unit. A notice names the inputs added. Parameters that already have a value
are left alone, and changing a binding or removing an input doesn't re-create anything.
"New input…" on a parameter now starts with the parameter's unit too
(`bindCallParameters` in lib/calculator/editing.ts).
