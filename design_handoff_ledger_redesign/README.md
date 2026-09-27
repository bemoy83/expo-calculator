# Handoff: Ledger redesign — expo-calculator

## Overview
This is a full visual and structural redesign of **expo-calculator** (`github.com/bemoy83/expo-calculator`, `main`), a Next.js 14 + Tailwind app for building cost calculators and turning them into quotes. The redesign:

- replaces the left sidebar with a top-tab shell (Calculators · Quotes · Catalog)
- moves every page to a pane layout: rail, then editor, then a live panel
- introduces a warm-paper neutral palette with one accent colour
- adds a single inverted "commit" block per screen for the money total

## About the design files
Everything in this bundle is a **design reference**, not code to ship:
- the HTML mockups
- the specimen cards
- the reference `.jsx` components, which are styled with inline `rgb(var(--token))`

The task is to **recreate these designs inside the existing repo**, using its current stack: Next.js app router, Tailwind, the `rgb(var(--x) / <alpha-value>)` token pattern, lucide-react, and the existing stores and hooks. Don't change data models, stores or calculation logic; this is a UI redesign.

## Fidelity
**High fidelity.** Colours, type, spacing, radii and states are final. Match px values exactly. Don't round them to the Tailwind scale; use arbitrary values (`text-[13px]`, `py-[22px]`) where needed.

## How to execute
Follow **`MIGRATION.md`** phase by phase. Each phase should ship on its own:
1. **Tokens.** Replace the token blocks in `app/globals.css` with `tokens/colors.css` and append `tokens/spacing.css`. Swap fonts in `app/layout.tsx`. Add the Tailwind extensions. The app restyles without any markup changes.
2. **Primitives.** Port each component in `components/` to `.tsx` + Tailwind. Each `.prompt.md` names the repo file it replaces. The `.d.ts` is the props contract. The `.jsx` is the pixel reference and wins any disagreement with MIGRATION's recipe table.
3. **Shell.** TopBar replaces AppSidebar in `components/Layout.tsx`. Remove the `max-w-7xl` main wrapper.
4. **Screens.** Rebuild each route per the Phase 4 table in MIGRATION.md.

After each phase: run the app, check light **and** dark, and compare against the mockup.

## Screens (mockup id → route)
Open `mockups/Estimator Selected.dc.html` in a browser. Each artboard is 1280×820 and has an id badge. The Tweaks toggle switches theme and accent.

| Id | Route | Summary |
|---|---|---|
| 6b | `/` | Category rail (200) → calculator list (flex) → 420px quick view: the run form scrolls, with live results and the inverted total + Send to quote pinned at the bottom. ⤢ opens 4a. |
| 4a | `/calculator?id=` | Full-size run view: form sections (3-up, 46px inputs) · 400px live pane with the inverted total + Send to quote. |
| 4b | `/calculator/edit` Parts | Rail: parts + inputs (240) · selected part's steps (StepRow) · 340px live staff view + error card + total. Not inverted. |
| 4c | `/calculator/edit` Layout | Palette (240) · form canvas on sunken · 320px inspector. |
| 1a | `/quotes` | Lines rail (260) · line editor · 360px receipt with the inverted total + Export quote. |
| 3b | `/quotes/board` | Inverted resume card (row layout) · ledger list of quotes. |
| 3c | `/materials`, `/labor` | Catalog sub-tabs · filter chips · ledger table · persistent 380px editor pane. |
| 3d | `/functions` | Function rail · editor (signature, params, formula) · live test-run pane. |

Detailed layout, copy and component placement for each screen: see the MIGRATION.md Phase 4 table and the mockup itself.

## Interactions & behaviour
- **Selection:** rail rows, ledger rows and calculator list rows are single-select. The selected row is `surface` + `border-strong` (rail), or `surface` + radius 8 (ledger). 6b holds the selected calculator in `?id=`.
- **Hover:** a step to `--surface-hover`. Ghost buttons go from muted to ink. Filled buttons drop to opacity 0.85–0.9. Ledger rows swap their last cell (⋯ → Delete) on hover.
- **Focus:** accent border + `0 0 0 3px var(--accent-soft)` halo on inputs, selects and the expanded StepRow. Keyboard focus rings use `ring-action`, which now resolves to the accent.
- **Live values:** results, part costs and totals recalculate as the user types, as they do today (`evaluateCalculator`). The LIVE label is decorative.
- **Errors:** a part with an error shows a red dot + "—" in the rail. The header shows the status "N steps have errors". The live pane shows a danger-bordered card explaining the problem.
- **Motion:** 150ms `cubic-bezier(.4,0,.2,1)` on colour, background and opacity only. Toggle knob slides.
- **Responsive:** below `lg`, top tabs collapse into the existing Menu drawer. Pane grids stack. On 6b, the quick view becomes a tap-through to `/calculator`. The quick view is already mobile width (420px), so its layout is the mobile run view.
- **Use-only mode:** hide the Catalog tab, Edit buttons and the builder, as today.

## State
No new stores. Additions:
- the selected calculator id on `/`, kept in the URL
- the selected catalog row, which already exists
- the quick-view scroll position, kept per calculator (optional)

## Design tokens
All tokens are in `tokens/`. The colour tokens reuse the app's existing names, so existing classes keep working. New: `--panel`, `--accent`, `--accent-ink`, `--accent-soft`, `--inverse`, `--on-inverse`, plus pane widths and radii.

- **Colour (light):**
  - neutrals: canvas #f2f0eb · panel #faf9f6 · surface #fff · sunken #e7e4dd · border #dcd8cf · border-strong #c4bfb4
  - ink: #171613 · ink-muted #5b5953 · ink-faint #77746c
  - accent: #ec6f00 (accent-ink #140c05)
  - formula tokens: token-input #007560 · token-result #6a51a4
  - status: committed #287c42 · danger #c53637
- **Colour (dark):**
  - neutrals: canvas #0f0f0e · panel #171715 · surface #1f1f1c · sunken #0a0a09 · border #262623 · border-strong #3a3935
  - ink: #f3f2ee / #a6a49d / #7b7a73
  - accent: #fd923e
  - formula tokens: #66d5ba / #c2b1f8
  - status: committed #6fd087 · danger #f97770
- **Accent options** (`data-accent`): chalk #259cde / #59bbfb · lime #abcf2e / #c3e151.
- **Type:**
  - Schibsted Grotesk: display 30/700/-0.025em · title 22/700/-0.02em · body 14 · small 13 · label 12
  - JetBrains Mono for all numbers: hero 44/600/-0.04em · large 32 · medium 26 · eyebrows 12 uppercase +0.06em
- **Radii:** 4 · 6 · 8 (inputs, buttons) · 10 (rows, cards, CTA) · 12 · 14 (inverted block) · pill.
- **Shadows:** none. Hierarchy comes from surface steps and hairlines.
- **Shell:** top bar 52px · page header padding 22/24/18 · rail 240–280 · live panel 340–420.

## Assets
- No logo exists. The mockups use an 18px accent square + "Cost Estimator" in 15px bold as a placeholder.
- Icons: keep **lucide-react** at 16px. The mockups' unicode glyphs map to lucide icons: ▾ ChevronDown · ↑↓ ArrowUp/ArrowDown · ✕ X · ⤢ Maximize2 · ⋯ MoreHorizontal.
- Fonts: Google Fonts via `next/font/google`.

## Files
- `MIGRATION.md`: the execution plan (token map, Tailwind config, Button variants, recipes, screen table).
- `DESIGN.md`: design guide (content tone, visual foundations, iconography).
- `tokens/`, `styles.css`: the token source.
- `components/<group>/<Name>.{jsx,d.ts,prompt.md}`: 21 reference components. Open `*.card.html` to see them live.
- `guidelines/*.html`: colour, type, spacing and pattern specimens.
- `mockups/Estimator Selected.dc.html`: the approved screens. Keep `support.js` next to it.
- `SKILL.md`: drop this folder into `.claude/skills/` to load it as a skill.

## Suggested first prompt for Claude Code
> Read `design_handoff_ledger_redesign/README.md` and `MIGRATION.md`. Implement Phase 1 (tokens) only, then stop so I can review light and dark mode.
