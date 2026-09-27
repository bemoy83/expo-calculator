# Migration — expo-calculator → Ledger redesign

Execution guide for Claude Code. Visual source of truth: `Estimator Selected.dc.html` (mockups 6b, 4a, 4b, 4c, 1a, 3b, 3c, 3d). Tokens: `tokens/*.css`.
Repo: `bemoy83/expo-calculator@main`.

Work in the phases below, in order. Each phase should ship on its own and leave the app working.

---

## Phase 1 — Tokens (no markup changes)

1. **`app/globals.css`**: replace both token blocks (the `:root { --canvas … }` block and `.dark { … }`) and the small `--warning/--success/--overlay/--radius-*` block with the contents of `tokens/colors.css`. Then append the `:root` block of `tokens/spacing.css`. Delete the old `--app-header-h / --app-sidebar-w` media-query pair (spacing.css now sets `52px / 0px` at every width).
2. **`app/layout.tsx`**: swap `next/font/google` families: `Archivo` → `Schibsted_Grotesk` (weights 400–800, `variable: '--font-ui'`) and `IBM_Plex_Mono` → `JetBrains_Mono` (400–600, `variable: '--font-numeric'`). Keep the variable names so `font-ui`, `font-mono` and `.font-numeric` keep working.
3. **`tailwind.config.ts`** → `theme.extend`:
```ts
colors: {
  panel: "rgb(var(--panel) / <alpha-value>)",
  accent: {
    DEFAULT: "rgb(var(--accent) / <alpha-value>)",
    ink: "rgb(var(--accent-ink) / <alpha-value>)",
    soft: "var(--accent-soft)",
  },
  inverse: {
    DEFAULT: "rgb(var(--inverse) / <alpha-value>)",
    ink: "rgb(var(--on-inverse) / <alpha-value>)",
  },
  // …existing entries unchanged
},
borderRadius: { row: "var(--radius-row)", inverse: "var(--radius-inverse)" /* + existing */ },
boxShadow: { focus: "var(--focus-ring)" /* card/panel now resolve to none */ },
width: { rail: "var(--rail-w)", panel: "var(--panel-w)", quickview: "var(--quickview-w)", category: "var(--category-w)" },
```
4. Add `.eyebrow` to `@layer utilities`:
```css
.eyebrow { font-family: var(--font-numeric); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: rgb(var(--ink-faint)); }
```

### Token mapping (old → new)
| Token | Old light | New light | New dark | Role in mockups |
|---|---|---|---|---|
| `--canvas` | #fafaf9 | #f2f0eb | #0f0f0e | page bg (`--bg`) |
| `--panel` *(new)* | — | #faf9f6 | #171715 | right live column, catalog editor, resume strip (`--panel`) |
| `--surface` | #ffffff | #ffffff | #1f1f1c | selected row, cards (`--raise`) |
| `--sunken` | #f0efed | #e7e4dd | #0a0a09 | input wells, chips, segmented track (`--sunk`) |
| `--border` | #e4e2df | #dcd8cf | #262623 | hairlines (`--line`) |
| `--border-strong` | #c9c6c1 | #c4bfb4 | #3a3935 | input borders, selected row, dashed adds (`--line2`) |
| `--ink` / `-muted` / `-faint` | #0d0d0c / #5a5854 / #75726d | #171613 / #5b5953 / #77746c | #f3f2ee / #a6a49d / #7b7a73 | `--ink / --mut / --fnt` |
| `--accent` *(new)* | — | #ec6f00 | #fd923e | primary fill, focus, active tab (`--acc`) |
| `--accent-ink` *(new)* | — | #140c05 | #140c05 | text on accent (`--acc-ink`) |
| `--action` | #2455d6 blue | → `--accent` | → `--accent` | focus ring / indicators only |
| `--action-solid` | #111110 | → `--ink` | → `--ink` | inverted commit button |
| `--on-accent` | #ffffff | → `--canvas` | → `--canvas` | text on action-solid |
| `--token-input` | #0f6e56 | #007560 | #66d5ba | `--tin` |
| `--token-result` | #534ab7 | #6a51a4 | #c2b1f8 | `--tres` |
| `--committed` | #157347 | #287c42 | #6fd087 | LIVE dot (`--ok`) |
| `--danger` | #b42318 | #c53637 | #f97770 | `--bad` |
| `--token-function / -property / --draft*` | | unchanged | unchanged | not used in the mockups |

**Semantic shift to watch:** `text-action` used to be blue link/code text. Accent is a *fill* colour and fails contrast as text on light canvas. `grep -r "text-action"` and replace:
- variable names (`MaterialRow`, `LaborRow`, catalog editors) → `text-token-input`
- links → `text-ink underline decoration-border-strong hover:decoration-accent`
- focus rings (`ring-action`) → keep. They now render in the accent colour, which is intended.

---

## Phase 2 — Primitives

**Reference implementations live in `components/`.** For each one, read the `.jsx` for exact values and states, the `.d.ts` for the props contract, and the `.prompt.md` for which repo file it replaces. Port it to TypeScript + Tailwind and keep every px value. When a recipe below and a `.jsx` disagree, the `.jsx` wins.


### Button (`components/ui/Button.tsx`)
Add an `accent` variant and rebalance the others. Radius stays `rounded-md` (8px). The full-width commit CTA uses `rounded-row`.
```ts
accent:    'bg-accent text-accent-ink border-transparent hover:bg-accent/90',          // "+ New …", "Save", "+ Add calculator"
primary:   'bg-action-solid text-on-accent border-transparent hover:bg-action-solid/85', // Continue, Export quote, Send to quote, Save material
secondary: 'bg-transparent text-ink border-border-strong hover:bg-surface-hover',        // Edit, Cancel, Export JSON
ghost:     'bg-transparent text-ink-muted border-transparent hover:text-ink',             // Reset, Duplicate, ↑ ↓
danger:    'bg-transparent text-danger border-transparent hover:bg-danger-bg',            // Remove, Delete (text-only in mockups)
inverse:   'bg-canvas text-ink border-transparent hover:bg-canvas/90',                    // CTA *inside* an inverted block
```
Page headers get one `accent` button at most. `primary` (ink) is kept for committing actions.

### Recipes (Tailwind)
| Piece | Classes |
|---|---|
| Top bar | `h-[52px] flex items-center gap-7 px-6 border-b border-border` · brand: `w-[18px] h-[18px] rounded-xs bg-accent` + `text-[15px] font-bold tracking-[-.01em]` |
| Top tab | `px-3 py-[7px] rounded-[7px] text-sm text-ink-muted` · active: `bg-surface text-ink font-semibold` |
| Page header | `flex items-end gap-4 px-6 pt-[22px] pb-[18px] border-b border-border` · eyebrow `.eyebrow tracking-[.04em]` · title `text-[30px] font-bold tracking-[-.025em] mt-1` |
| Sub-tabs (Catalog) | `flex gap-[22px] mt-3.5 text-sm` · item `pb-[11px] text-ink-muted` · active `border-b-2 border-accent font-semibold text-ink` · count `font-numeric text-xs text-ink-faint` |
| Rail row | `flex gap-2.5 px-2.5 py-3 rounded-row` · selected `bg-surface border border-border-strong` · index badge `font-numeric text-xs px-[5px] py-0.5 rounded-[5px]` (selected: `bg-accent text-accent-ink font-semibold`) |
| Ledger header | `grid … px-3.5 pb-2.5 eyebrow border-b border-border` |
| Ledger row | `grid … items-center p-3.5 border-b border-border` · selected/hover `bg-surface rounded-md` · numbers `font-numeric text-right` |
| Field label | `text-xs text-ink-muted` + unit `font-numeric text-ink-faint` |
| Input | `h-[42px] px-3 rounded-md border border-border-strong bg-sunken font-numeric text-[15px]` · focus `border-accent shadow-focus` |
| Segmented | track `flex p-[3px] rounded-md bg-sunken` · item `px-3.5 py-1.5 rounded-sm text-ink-muted` · on `bg-surface text-ink font-semibold` |
| Chip / filter | `px-[11px] py-[5px] rounded-full bg-sunken text-ink-muted text-[13px]` · on `bg-inverse text-inverse-ink font-semibold` |
| Dashed add | `p-[11px] rounded-row border border-dashed border-border-strong text-center text-[13px] text-ink-muted` |
| Live label | dot `w-[7px] h-[7px] rounded-full bg-committed` + `eyebrow text-committed font-semibold` "LIVE" + `eyebrow` "· IN THE QUOTE" |
| Result row | `flex items-baseline gap-2.5 text-[15px]` label · `flex-1 border-b border-dotted border-border-strong` leader · `font-numeric` value + unit `text-ink-faint` |
| Right pane | `w-panel border-l border-border bg-panel px-6 py-5 flex flex-col` |
| **Inverted commit block** | `mt-auto p-[18px] rounded-inverse bg-inverse text-inverse-ink flex flex-col gap-3` · label `text-[13px] opacity-70` · total pill `self-start font-numeric text-[40px] font-semibold tracking-[-.04em] leading-[1.15] px-3 py-0.5 rounded-row bg-accent text-accent-ink` · CTA `Button variant="inverse"` full width `rounded-row py-3` · note `text-xs opacity-60 text-center` |

**Inverted-block rule:** at most one per screen, and only for the money total plus the action that commits it. It's used on 1a (receipt), 3b (resume card), 4a/6b (send to quote). The builder (4b/4c) and catalog (3c/3d) don't use it.

---

## Phase 3 — Shell

- **`components/Layout.tsx`**: remove `AppSidebar` from the layout. Render a `TopBar` with tabs **Calculators · Quotes · Catalog** and Settings + avatar on the right. On mobile (<lg) collapse the tabs into the existing Menu drawer, which reuses `AppSidebar`'s content.
- `<main>`: drop `max-w-7xl mx-auto px-* py-8`. Pages own their full-bleed header band and panes (`h-[calc(100vh-52px)]` grids).
- Catalog routes: keep `/materials`, `/labor`, `/functions`. The **Catalog** tab is active on any of them, and a shared `CatalogTabs` sub-nav sits in the page header.
- Use-only mode hides Catalog and Edit, same as today.

---

## Phase 4 — Screens

| Mockup | Route | Repo files | Change |
|---|---|---|---|
| **6b** | `/` | `app/page.tsx`, `components/calculator/CalculatorsListView.tsx` | Grid `[category-w, 1fr, quickview-w]`. Category rail (All + categories with counts) → list rows (name, description, `N in · N parts`) → **quick view**: renders `CalculatorRunView` in a `compact` mode (single column, 2-up fields), with the form scrolling under a pinned footer (live result rows, then the inverted total + Send to quote). Header actions: Reset · Edit · ⤢ (links to `/calculator?id=`). Selection is held in `?id=` so it survives a reload. Below lg: list only, and tapping a row goes to `/calculator`. |
| **4a** | `/calculator` | `app/calculator/page.tsx`, `CalculatorRunView.tsx`, `CalculatorForm.tsx` | Page header (eyebrow `CALCULATORS / {category}`, title, description; Reset ghost, Edit secondary). Grid `[1fr, 400px]`: form sections (eyebrow per layout section, 3-up fields, 46px inputs) · right pane: LIVE result rows, part costs, inverted total + Send to quote + "Adds a line to {current quote}". |
| **4b** | `/calculator/edit` (Parts) | `CalculatorBuilder.tsx`, `PartCard.tsx`, `StepRow.tsx`, `InputEditorDialog.tsx` | Header: eyebrow `… · EDITING · UNSAVED`, editable title, status dot, **Parts/Layout segmented**, Cancel, Save (accent). Grid `[240px, 1fr, 340px]`: rail = PARTS (index badge, cost, error dot) + INPUTS list (`text-token-input` keys, unused ones greyed) · centre = selected part's steps (step rows; expanded step gets an accent border + focus halo and holds the formula well + option chips) · right = LIVE staff view + error card (`border-danger`) + calculator total (no inverted block). Delete calculator moves to the foot of the centre pane. |
| **4c** | `/calculator/edit` (Layout) | `LayoutCanvas.tsx`, `LayoutInspector.tsx` | Same header. Grid `[240px, 1fr, 320px]`: NOT PLACED + ADD palette · canvas on `bg-sunken` with section cards on `bg-canvas`, selected item outlined in accent · inspector (Shown as / Width segmented, Show condition, move, Remove). |
| **1a** | `/quotes` | `QuoteView.tsx`, `QuoteLineCard.tsx`, `QuoteSummaryCard.tsx` | Header (eyebrow `QUOTE Q-#### · EDITED …`, title, Export JSON, Save quote, + Add calculator accent). Grid `[260px, 1fr, 360px]`: LINES rail · line editor (fields + RESULTS leader rows + line total) · receipt pane (LIVE · IN THE QUOTE, lines, subtotal/markup/VAT inline inputs, inverted total + Export quote). |
| **3b** | `/quotes/board` | `components/dashboard/QuoteBoard.tsx` | Header with search + New quote (accent). `ResumeCard` becomes the inverted block (horizontal: text · total pill · Continue inverse button). `QuoteCard` grid becomes ledger rows: QUOTE · LINES · EDITED · TOTAL · ⋯ (delete appears on row hover). |
| **3c** | `/materials`, `/labor` | `CatalogPageShell.tsx`, `CatalogTableRow.tsx`, `MaterialRow.tsx`, `LaborRow.tsx`, `*EditorPanel.tsx` | Header with Catalog sub-tabs + search + New (accent). Category filters become chips. Ledger table; selected row `bg-surface border-border-strong`. The editor becomes a persistent right pane (`bg-panel`, 380px) instead of an overlay: fields, PROPERTIES leader rows, "Used by N calculators", Delete (danger text) + Save (primary). |
| **3d** | `/functions` | `app/functions/page.tsx`, `FunctionEditorView.tsx` | Replace the card grid + full-page editor with rail (name, signature, usage count) · editor (Call as, PARAMETERS rows, FORMULA well) · right pane LIVE · TEST RUN (param inputs → returned value in `num-hero` accent) + USED BY list + Save. |

---

## Content rules carried by the redesign
- Mono uppercase eyebrows for section labels: `LINES`, `RESULTS`, `PARTS`, `INPUTS`, `PROPERTIES`, `USED BY`.
- All numbers, units and variable names are in mono. Units follow the value in `text-ink-faint`.
- Keep the app's existing plain, second-person microcopy ("Duplicate a line for each wall…", "Adds a line to …").
- Glyphs used as icons: `▾ ↑ ↓ ✕ ⤢ ⋯ ⌘D`. Keep lucide-react for everything else, at `h-4 w-4` stroke 2.
