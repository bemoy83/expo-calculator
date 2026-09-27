# Cost Estimator — Ledger design system

The design system for the redesign of **expo-calculator** (`github.com/bemoy83/expo-calculator`, branch `main`), a Next.js + Tailwind app for building cost calculators and quotes, used for trade-fair stands and interior builds. Sample content is Norwegian (Bindingsverk, Gipsvegg, K.VIRKE 48x98). The UI chrome is in English.

**Surfaces:** Calculators (list + quick run), Calculator run, Calculator builder (Parts / Layout), Quotes (builder + board), Catalog (Materials, Labor, Functions).

## Index
- `styles.css`: entry point. It only `@import`s `tokens/fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`.
- `tokens/colors.css`: light + `.dark` + `[data-accent]` scopes. Written as RGB triplets under the app's existing token names, so it drops straight into `app/globals.css`.
- `MIGRATION.md`: **the execution plan for Claude Code.** Token mapping old → new, Tailwind config additions, font swap, Button variants, Tailwind recipes for every pattern, and the screen → route → repo files table.
- `Estimator Selected.dc.html`: the approved mockups (6b, 4a, 4b, 4c, 1a, 3b, 3c, 3d). This is the visual source of truth.
- `Estimator Redesign.dc.html`: all explorations, including the rejected ones.
- `components/`: reference React components (one `.jsx` + `.d.ts` props contract + `.prompt.md` with its repo target per component), with one preview card per folder:
  - **shell:** Eyebrow, TopBar, PageHeader, CatalogTabs
  - **controls:** Button, Field, Input, Select, Segmented, Chip, Toggle
  - **lists:** RailRow, LedgerTable, LedgerRow, DashedAdd
  - **builder:** StepRow, FormulaWell
  - **live:** LiveLabel, ResultRow, CommitBlock
  - **formula:** FormulaText

  These are styled only through tokens, using inline `rgb(var(--…))`. They are the pixel reference; port them to Tailwind per MIGRATION.md. `components/_load.js` is used by the preview cards only.
- `guidelines/*.html`: specimen cards (Colors, Type, Spacing, Patterns).
- `SKILL.md`: Agent Skill entry point.

## Content fundamentals
- Plain, practical, second person. It explains what will happen rather than selling: "Adds a line to Stand B12 — Norway Expo", "Duplicate a line for each wall, room or part", "Price changes apply to open quotes next time they recalculate."
- Sentence case for buttons and titles ("Send to quote", "New material"). Buttons that create something start with "+" ("+ New quote", "+ Add step").
- Mono UPPERCASE eyebrows name sections and page context: `LINES`, `RESULTS`, `LIVE · IN THE QUOTE`, `QUOTE Q-0142 · EDITED 23 MIN AGO`. Metadata is joined with a middle dot ` · `.
- Errors say what's wrong and the consequence: "Isolasjon doesn't add up yet: tykkelse isn't an input. The total leaves it out."
- No emoji. No exclamation marks. Numbers use a space as the thousands separator and a point for decimals: `4 299.30`.

## Visual foundations
- **Colour:** warm paper neutrals (canvas #f2f0eb → panel → white surface; sunken #e7e4dd wells) with a near-black ink. Dark mode is a warm charcoal stack, not pure black. There is a single **accent** ("signal" orange, with chalk and lime as options). It is used only as a fill: page-primary buttons, the focus halo, the active sub-tab bar, the selected index badge and the total pill. Never as body text.
- **Inverse:** the one "commit" block per screen is an ink slab with canvas text. Inside it the total sits on an accent pill and the CTA is a canvas-coloured button. It appears on the receipt (1a), the resume card (3b) and send to quote (4a/6b), and nowhere else.
- **Type:** Schibsted Grotesk for words (display 30/700/-0.025em, titles 22/700, body 14, labels 12). JetBrains Mono for every number, unit, variable and eyebrow. Totals are large mono with tight -0.04em tracking.
- **Layout:** a 52px top bar with three tabs, a full-bleed page header band, then pane grids separated by 1px hairlines: left rail (240–280) → editor (flex) → right live pane (340–420, `panel` bg). No page max-width. No floating cards on a grey background.
- **Surfaces, borders, elevation:** flat, with no shadows. Hierarchy comes from surface steps and hairlines (`border`, and `border-strong` for inputs and the selected state). A selected row is `surface` + `border-strong` at a 10px radius. Adds are dashed `border-strong` boxes.
- **Radii:** 4 logo mark · 5 index badge · 6–7 segmented / top tab · 8 inputs & header buttons · 10 rows, cards, CTAs · 12 containers · 14 inverted block · pill chips.
- **Focus & states:** focus is an accent border plus a 3px `accent-soft` halo, with a 1px blinking-caret look in the mockups. Hover is a step to `surface-hover`. Ghost buttons go from muted to ink. Press states are not specified; use opacity 0.85 on filled buttons. Disabled is `sunken` bg with `ink-faint` text.
- **Leaders:** result rows use a dotted `border-strong` leader between the label and the mono value. The highlighted result row uses an `accent-soft` background.
- **Motion:** 150ms standard ease on colours only. No entrance animations.
- **Imagery:** none. The product is typographic and numeric.
- **Transparency / blur:** only for the mobile nav scrim (black/50 + blur-sm, already in the app).

## Iconography
The app uses **lucide-react** (Plus, Trash2, Pencil, RotateCcw, FilePlus2, Search, Menu…) at 16px, stroke 2. Keep it. The mockups also use unicode glyphs inline: `▾` selects, `↑ ↓` reorder, `✕` close, `⤢` open full size, `⋯` row menu, `⌘D` shortcuts in mono. When building, replace these with their lucide equivalents (ChevronDown, ArrowUp/Down, X, Maximize2, MoreHorizontal). No emoji.

## Brand mark
No logo exists in the repo. The mockups use an 18px accent square next to "Cost Estimator" in 15px bold. Treat that as a placeholder until a real mark is supplied.

## Intentional additions (vs. the current app)
- Components with no current counterpart: TopBar, CatalogTabs, RailRow, LedgerRow hover-swap, CommitBlock, FormulaWell, LiveLabel.
- `--panel`, `--accent`, `--accent-ink`, `--accent-soft`, `--inverse`, `--on-inverse`: the new surface step, the accent and the commit block have no counterpart in the current tokens.
- Button variants `accent` and `inverse`. Pane width tokens. `.eyebrow` utility.
