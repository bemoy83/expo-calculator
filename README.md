# Event Construction Cost Estimator

A web app for pricing construction and event builds with purpose-built calculators. The
owner builds calculators in the app (no code); staff open one, fill in a simple form, and
send the result to a quote.

Everything runs in the browser and is saved in its local storage. There is no server,
database or account. Data moves between devices as exported files.

## How it fits together

| Layer | What it is | Where |
|---|---|---|
| **Functions** | Reusable math with named, unit-aware parameters, e.g. `stud_count(width, spacing)`. Functions can call other functions. | Functions page |
| **Catalogs** | Materials (with a default price and extra prices such as per m² or per pallet, plus properties like width) and labor (with a rate). | Materials and Labor pages |
| **Calculators** | Inputs, the steps that calculate from them, grouped into **parts**, and a layout of what staff see. | Calculators page → New calculator / Edit |
| **Quotes** | Lines sent from calculators, with markup, VAT, totals, JSON export and print. | Quotes page |

### Calculators and parts

- An **input** (width, stud spacing, a sheet material, "painted on both sides") is declared
  once; any number of steps read it.
- A **step** either calls a function (pick the function, then give each parameter an
  input, another step, a material property or price, or a fixed number) or is a short
  formula. Steps are calculated in the order they depend on each other, not the order
  they're listed.
- Steps are grouped into **parts** (Framing, Sheeting, Paint). Each part names its cost
  step; the calculator's total is the sum of the part costs. While building, each part is
  tested on its own, and an error only affects the part it's in.
- The **layout** arranges inputs, results, breakdowns, text and dividers into sections.
  Inputs can be number boxes, steppers, sliders, switches, dropdowns, buttons or pickers,
  and sections, inputs and steps can be shown or calculated only when a condition holds.

The builder has two tabs: **Parts** (the math, with live test values) and **Layout**
(what staff see, with a Preview).

### Quotes

On a calculator, **Send to quote** adds a line to a new or existing quote with the cost, a
summary and the values used. **Edit** on that line reopens the calculator with those values
and can update the line. Quotes stay on the device they were made on; they are never part
of an export or changed by an import.

## Sharing calculators with staff devices

Settings (bottom of the sidebar) → **Data**:

- **Export calculator pack…** — choose which calculators go to staff (anything still being
  built or tested can be left out; the ones in the last pack start ticked). The pack holds
  those calculators, the functions they use (including functions those call), and the
  materials and labor catalogs, with the date it was exported.
- **Export all data** — a full backup: every calculator, function, material, labor item
  and category.
- **Import data** — loads either kind of file. A calculator pack replaces the device's
  calculators, functions, materials and labor after showing what it contains, what it will
  remove, and whether it's older than the pack already loaded. Other files can be merged
  or replace what's there. Files from before calculators still import: their modules and
  templates become calculators.

The Calculators page shows which pack a device has ("Calculator pack from …"), and on the
device packs are made on, when the last one was exported, so an out-of-date device is easy
to spot.

**Use-only mode** (Settings) is a per-browser switch for staff devices. It hides New
calculator, Edit and the Functions, Materials and Labor pages, leaving Calculators and
Quotes; loading a pack offers to turn it on. It's a convenience, not security: anyone can
switch it off again.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Checks:

```bash
npx tsc --noEmit -p .
npm run lint
npm run eval:test
```

`npm run eval:test` runs the regression tests in `lib/regression-tests/` (formulas, units,
functions, catalogs, the calculator engine, conversions, quotes, export/import and packs).

### Deploying

`npm run build` produces a static export in `out/`. Pushing to `main` deploys it to GitHub
Pages under `/expo-calculator` (`.github/workflows/deploy.yml`). Calculators open at
`/calculator?id=…` because they live in the browser, not in the build.

## Project structure

```
app/
  page.tsx                 Calculators (home)
  calculator/              A calculator (staff view); edit/ is the builder
  quotes/                  A quote; board/ lists quotes
  functions/ materials/ labor/
components/
  calculator/              Staff view: layout renderer, inputs, results, Send to quote
  calculator-builder/      Parts view, layout canvas and inspector, step and input editors
  function-editor/ materials/ labor/ quotes/
  DataImporter.tsx, PackExporter.tsx, AppSidebar.tsx, Layout.tsx
  ui/ shared/              Primitives and shared pieces
lib/
  calculator/              Engine (evaluate, dependencies, conditions, call-function),
                           pure editing helpers, packs, and module/template conversion
  formula/                 Parser, validator, unit checks, math runtime
  functions/ catalog/ quotes/
  stores/                  Zustand stores persisted to localStorage
  utils/data-export.ts, data-import.ts
  regression-tests/
```

`CALCULATOR_DESIGN.md` records the design decisions and what each build step did.

## Technologies

Next.js 14 (App Router, static export), React 18, TypeScript, Tailwind CSS, Zustand,
mathjs, dnd-kit, next-themes, Lucide icons.

## License

MIT
