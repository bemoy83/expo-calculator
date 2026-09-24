# Reskin Gap Analysis — "Estimator Redesign" design doc

Source: `Estimator Redesign.dc.html`, three revisions — the first with resolved screens
2a–2d and foundations 1a (light mode + a partial dark set); the second adding turn 3,
"Dark mode — full token set," which completes and formalizes the color tokens into 21
light/dark variable pairs with an explicit mapping table; the third adding turn 4,
"Alternative token sets" (4a Graphite, 4b Blueprint, 4c Ink, 4d Sage), which revises the
token list to 27 variables and re-renders 2a/2b entirely through CSS variables. **Turn 4
supersedes turn 3's token list** — see Foundations. Compares the proposed design
against the current implementation to size the work required to adopt it. Ratings are
Low / Moderate / High effort, not story points.

## Open decisions before implementation starts

- ~~Blocking: where do Export Data, Import Data, and custom theme import/management
  land in the new sidebar?~~ **Resolved.** Keep today's behavior and modals
  (`DataImporter`, `ThemeImporter`) unchanged — relocate the trigger button to a menu
  pinned at the bottom of the new sidebar, near the Light/Dark toggle. No new route, no
  restructuring of the existing modal flows.
- ~~Which palette?~~ **Resolved: Ink (4c), as the only palette.** Theming is a nice
  extra, not a requirement: no palette picker and no other built-in palettes. Tokens stay
  a pure value swap (one light and one dark block), so another palette later means new
  values, not a refactor.
- ~~Must the new tokens map onto MD3 so theme import keeps working?~~ **Resolved: no.**
  The design tokens are the source of truth. Theme import (`ThemeImporter`,
  `applyTheme()`) stays, as a best-effort mapping of an imported MD3 scheme onto the
  design tokens. Add that mapping when the first restyled screen needs it, and check
  imported themes once at the end of the reskin, not on every step. Tokens with no MD3
  equivalent (committed, draft, the `-border` tokens) keep their Ink values under an
  imported theme.
- ~~`ink-faint`: derive it as `ink-muted` at reduced opacity?~~ **Superseded.** Turn 4 gives
  `ink-faint` an explicit value in every palette; use Ink's. Deriving it is only relevant
  inside the imported-theme mapping above.
- **Naming note, not a decision.** The role informally called "draft/warn" elsewhere in
  this analysis and in conversation is named `--draft` (and `--draft-bg`) in the actual
  token mapping table (turn 3) — use `--draft`, not `--draft-warn`, in code.
- ~~Should "Add to Quote" move a draft out of the workspace, or keep copying it?~~
  **Resolved: move.** A draft lives in exactly one place, the workspace or the quote.
  Copying would make the design's "Excludes N drafts (X kr)" footer count money that's
  already in the quote, and reopening would create duplicate drafts. Moving has two
  consequences, both part of the same change:
  - **Linked values are kept.** When a draft moves into the quote, any other draft whose
    fields link to it keeps the value it currently resolves to, as a plain value, and the
    link is dropped. The source is now locked, so the value is final. Without this, the
    dependents would fall back to stale values and their costs would change without
    warning. **Discard follows the same rule** (decided after the move change): removing a
    draft also leaves its dependents at their current values instead of falling back.
  - **Duplicate replaces "add it again."** Under copy semantics, one draft could be added
    several times. With moves, that workflow becomes Duplicate on the draft, which the
    mockups already show (2a) but which didn't exist in the code.

## Out of scope for this pass

- **Cost mix (materials vs. labor split)** shown in the Quote Builder totals footer
  (2a) is **deferred**. No code today attributes a line item's cost to material vs.
  labor sources — `CalculationResult`, `QuoteLineItem`, and `calculateQuoteTotals`
  (`lib/types.ts`, `lib/calculations/money.ts`) all carry a single opaque `cost`/`total`
  number. Building this needs new derivation logic (tag or infer which computed-output
  steps draw from material vs. labor variables), not a restyle. Track separately.

## Required new actions

These are not optional polish — the adjacent screen work depends on them and shouldn't
be signed off as "done" without them.

- **`reopenLineItem(lineItemId)`** (Quote Builder, see detail below) is **required**.
  Without it, the redesign ships a "Reopen" button with no way to correct a committed
  line item except deleting it and retyping every field from scratch — which
  reintroduces exactly the friction the workspace/line-item split was meant to remove,
  and actively discourages people from fixing quotes carefully. `Lock in` and `Reopen`
  are a matched pair in the design; shipping one without the other is an incomplete
  feature, not a smaller version of it.

## Summary by screen

| Screen | Effort | Why |
| --- | --- | --- |
| Navigation shell (left sidebar) | Low–Moderate | Doesn't exist — current nav is a horizontal top bar; used in every mockup |
| Foundations (tokens, type, fonts) | Moderate | New palette + type scale layered over MD3 system; two new webfonts |
| Primitives (Button/Card/Input/Select/Checkbox/Chip/Textarea) | Low | Restyle only, confirmed no prop-API changes needed |
| Quote Builder (2a, minus cost mix) | Low–Moderate | Structure already matches; two small new pieces (reopen, nickname) |
| Module Editor — Detailed (2b) | High | New chip-based formula surface; no existing analog in the app |
| Module Editor — Simple (2c) | High | New screen entirely; Simple/Detailed toggle doesn't exist today |
| Materials catalog (1f, "unchanged, as picked") | Very low | Current page already matches the proposed structure |
| Dashboard (2d) | Moderate | Data exists in the quotes store; current component renders none of it |

## Navigation shell (left sidebar) — Low–Moderate

**Current state** (`components/Layout.tsx`): a horizontal top nav bar — logo/title,
7 flat pill links (Dashboard, Materials, Labor, Functions, Modules, Templates, Quote
Builder) all at the same level, no grouping, no item counts. Theme switching lives
inside a hamburger dropdown alongside Export/Import Data and custom theme management —
it is not a visible, one-click control.

**Proposed**: every mockup (2a–2d) replaces this with a fixed-width (~196px) left
sidebar: logo block, **Quotes** and **Templates** as a primary group each showing a
live count, a **Catalog** section header grouping Modules/Functions/Materials/Labor
(each with a count), and a persistent Light/Dark segmented control pinned at the
bottom of the column.

**Gap**: this is used in literally every mockup, so it's foundational rather than a
footnote — but it's cheaper than it looks:
- It's a **single change point**. Every page renders through `<Layout>`, so
  reorienting the shell from top bar to left column touches one component, not every
  page.
- The counts are trivial — `materials.length`, `modules.length`, `functions.length`,
  `labor.length`, `quotes.length`, `templates.length` are already read this way
  elsewhere (e.g. the current dashboard's stat cards in `app/page.tsx`).
- The grouping (Quotes/Templates vs. Catalog) is a data/ordering change to the
  existing `navigation` array, not new logic.
- The persistent theme toggle reuses the existing `next-themes` wiring — it only calls
  `setTheme`; `ThemeSync` in `components/ThemeProvider.tsx` already re-applies any
  imported custom theme whenever light/dark changes — so it just needs to move out of
  the hamburger menu into an always-visible segmented control.
- Real cost is layout/responsive work: converting every page's content area from a
  top-nav-plus-centered-max-width shell to a sidebar-plus-flex-content shell, and
  giving the sidebar its own mobile/collapse behavior (today's hamburger already
  handles mobile nav for the top bar; an off-canvas or collapsing left column needs
  its own treatment).
- **Resolved**: the old hamburger menu also held Export Data, Import Data, and custom
  theme import/management, which no mockup shows a home for. Decision: keep the
  existing menu and its modals as-is, just relocate the trigger to the bottom of the
  new sidebar (near the Light/Dark toggle) rather than the old top-bar hamburger icon.

**Implementation notes (step 1, structure only — built on branch
`reskin/navigation-shell`)**:
- Sidebar lives in `components/AppSidebar.tsx`; `components/Layout.tsx` now only
  composes it with a mobile top bar, a mobile drawer backdrop, and the two existing
  modals. Below `lg` the sidebar is an off-canvas drawer opened from the top bar.
- Shell dimensions are CSS variables in `app/globals.css` — `--app-header-h` (3.5rem
  mobile top bar, 0 at `lg`) and `--app-sidebar-w` (0 mobile, 196px at `lg`) — exposed
  to Tailwind as `sidebar`/`app-header` spacing and a `sticky-offset` inset. Every
  sticky card now uses `top-sticky-offset` (was a hardcoded `top-[88px]` tied to the
  old 64px bar) and every fixed bottom action bar uses `left-sidebar` (was `left-0`,
  which would have covered the sidebar). **Any new sticky or fixed chrome must use
  these tokens, not hardcoded pixel offsets.**
- No "Dashboard" nav item, matching the mockups; the brand links to `/`. "Quotes"
  pointed at `/quotes` until step 3 moved it to `/` (see Dashboard section).
- The footer menu is labelled "Settings". Its old "Switch to Light/Dark" item was
  dropped since the persistent Light/Dark control replaces it; `ThemeToggle.tsx`
  (imported by the old layout but never rendered) was deleted for the same reason.
- Nav counts and the Light/Dark control's active state render only after mount — the
  stores hydrate synchronously from localStorage, so rendering them during the static
  prerender would mismatch on every page load.

## Foundations — Moderate

**Current state** (`tailwind.config.ts`, `app/globals.css`): a full Material Design 3
token system — `--md-sys-color-*` → `--md-*` → Tailwind `md.*` color scale, MD3 shape
corners, MD3 elevation. System font stack only (`-apple-system, ... Segoe UI, Roboto...`),
no monospace type anywhere (`app/globals.css:286`).

**Proposed**: originally 10 semantic roles; the dark-mode follow-up (turn 3 of the design
doc) formalized this to **21 named variables** in light + dark, with an explicit
light→dark mapping table — `canvas`, `surface`, `surface-sunken`, `surface-raised`,
`border`, `border-strong`, `ink`, `ink-muted`, `ink-faint`, `ink-onAccent`, and
foreground/background pairs for the four semantic accents (`action`/`action-solid`/
`action-bg`, `committed`/`committed-bg`, `draft`/`draft-bg`, `danger`/`danger-bg`), plus
`focus-ring` and two shadow tokens (`shadow-panel`, `shadow-card`). This is mostly
formalizing color usages that already existed implicitly in the original light mockups
(chip backgrounds, button fills) rather than new surface area. Also: a 5-step type scale
(display/title/body/label/numeric), and a hard rule that **all numbers — money, quantity,
unit, variable — render in monospace** (Archivo for UI text, IBM Plex Mono for values).

**Turn 4 revision (current source of truth)**: the token list is now **27 variables**,
defined in the mockup's theme-preview script (`const P`, `vars()`):
- 22 base values: `canvas`, `surface`, `sunken`, `border`, `border-strong`, `ink`,
  `ink-muted`, `ink-faint`, `on-accent`, and fg/bg/border triplets for the accents —
  `action`/`action-solid`/`action-bg`/`action-border`, `committed`/`committed-bg`/
  `committed-border`, `draft`/`draft-bg`/`draft-border`, `danger`/`danger-bg`/`danger-border`.
- 5 derived by a linear mix of two base values: `surface-hover`, `sunken-2`, `ink-body`,
  `ink-subtle`, `committed-solid` (only Warm paper overrides the first four by hand).
- Changes from turn 3: `ink-onAccent` is renamed `on-accent`; the `-border` accent
  tokens (shown visually in 3a) are now variables; `surface-raised`, `focus-ring`,
  `shadow-panel`, and `shadow-card` are gone. The screens hardcode their three shadows,
  and nothing uses a focus-ring token.
- Ink specifics: `action-solid` (filled buttons) is ink, not the accent — `#111110` on
  light, `#f5f5f4` with dark `#0b0b0b` text in dark — while `action` stays blue for chips,
  links, and selection. So "primary button" and "action color" are different tokens.
- Contrast of Ink (WCAG, small text needs 4.5:1): all pairings pass except `ink-faint`
  on `sunken` in light (4.2) and on `surface` in dark (4.4). Keep `ink-faint` to
  placeholders and timestamps, as the mockups do.

The turn-3 notes below are kept for their rationale (dark elevation, accent splitting),
but their token list and MD3-mapping plan are superseded.

**Dark mode is now fully specified** — the design doc's turn 3 supplies all 21 variables'
dark values plus rationale (elevation moves from shadow to border-weight in dark since
shadows barely register on near-black; accents split into a light foreground + a deep
tinted background rather than reusing the light theme's saturated hex, which would
vibrate against dark ground). It also resolves an overlap in the first dark pass, where
`#2a2723` served as both `surface-sunken` and a row-divider/border color — `border`/
`border-strong` and `surface`/`surface-raised` are now genuinely distinct tiers instead
of one value doing double duty. No longer an open item.

**Gap**:
- The MD3 token *system* is more elaborate than what the design needs (MD3 has ~30
  roles across primary/secondary/tertiary/surface-container tiers; the design's 21
  variables are still a subset). Adopting the design means either (a) mapping the new
  roles onto existing `--md-*` variables and leaving the rest unused, or (b) replacing
  the token file outright.
- **(a) is required, not just lower-risk — the theme import feature depends on it**, and
  the expanded 21-variable set actually maps onto MD3 *better* than the original 10 did.
  `ThemeImporter`/`applyTheme()` (`lib/themes/theme-applier.ts`) sets exactly 27
  `--md-*` CSS custom properties at runtime from an uploaded Material Theme Builder
  JSON (4 each for primary/secondary/tertiary/error incl. their `-container` and
  `on-*` pairs, 4 for surface, 2 for outline, 5 surface-container tiers). The
  `-container` pair for primary/secondary/tertiary/error is what makes the difference
  here:
  - `danger`/`danger-bg` → `--md-error`/`--md-error-container` (both set by
    `applyTheme()`) and `action`/`action-bg` → `--md-primary`/`--md-primary-container`
    map cleanly and stay theme-import-compatible, including their `-bg` variants.
  - `border`/`border-strong` → `--md-outline`/`--md-outline-variant`,
    `surface`/`surface-raised` → the surface-container tiers, and `ink`/`ink-muted` →
    `--md-on-surface`/`--md-on-surface-variant` all have natural MD3 homes.
  - **Residual, unavoidable under either option**: `committed`(+`-bg`) and
    `draft`(+`-bg`) — 4 of the 21 — have no equivalent in the Material Theme Builder
    JSON schema at all (no MD3 success/warning concept), so an imported theme can never
    recolor them. Matches how `--success`/`--warning` already behave today
    (`app/globals.css:139-140`, commented "no MD3 equivalent," untouched by
    `applyTheme()`) — continuity of an accepted constraint, not a new regression. Do
    **not** alias these to MD3's `tertiary` just because a slot exists — an imported
    theme's tertiary color is arbitrary brand accent, not guaranteed to read as
    "success" or "warning," so borrowing it would misattach meaning to an arbitrary hue.
  - `ink-faint` is a judgment call: either a new bespoke variable (same precedent as
    `--success`/`--warning`), or derived as `ink-muted` at reduced opacity — the latter
    is actually *more* theme-compatible, since it moves automatically if `ink-muted`
    does under an imported theme. Recommend the derived approach unless the designer has
    a reason `ink-faint` needs an independent hue.
- Two new webfonts need to be added (Google Fonts `<link>` or self-hosted via
  `next/font`) — not present in `app/layout.tsx` or `globals.css` today. Given this is a
  local-first, offline-capable app, self-hosting via `next/font/google` (which inlines
  the font at build time) is preferable to a runtime Google Fonts fetch.
- The "numbers are always tabular mono" rule needs to land as a utility class
  (e.g. `.font-numeric`) applied consistently — mechanical but touches every screen that
  prints a value, which is most of the app.

**Implementation notes (step 4a — tokens and fonts, no visual change)**:
- The 27 Ink variables live in `app/globals.css` ("Design tokens" block, `:root` for
  light and `.dark` for dark), after the MD3 blocks. Values come straight from the
  mockup's `P.ink` data. Base values are `R G B` triplets like the MD3 tokens, so Tailwind
  opacity modifiers work (`bg-draft-bg/50`). The 5 derived tokens are `color-mix(in srgb,
  …)` expressions reproducing the designer's `mix()` (verified to match exactly in light
  and dark). Because they're full colors, their Tailwind classes take no `/opacity`.
  Since they're computed from the base variables, they also follow an imported theme once
  the import mapping writes the base values.
- Tailwind names mirror the variables: `bg-canvas`, `bg-surface`, `bg-surface-hover`,
  `bg-sunken`, `bg-sunken-2`, `text-ink`, `text-ink-muted|faint|body|subtle`,
  `text-on-accent`, `text-action`, `bg-action-solid|bg`, `border-action-border`, and the
  same for `committed` (plus `committed-solid`), `draft`, and `danger`. **Exception:
  `border`** — the existing `border` color alias (`border-border`, ~25 uses) still means
  the MD3 outline and switches to `--border` in 4b. Its sibling `border-border-strong`
  is already the design token.
- Fonts: `next/font/google` self-hosts Archivo (400–700) and IBM Plex Mono (400–600) at
  build time (the files ship in `out/_next/static/media`, no runtime requests). They're
  exposed only as `--font-ui` / `--font-numeric` on `<html>`. Tailwind `font-ui` and the
  `.font-numeric` utility (Plex Mono + `tabular-nums`) apply them; nothing does yet, so
  the body font is unchanged. `next/font` preloads one file per family on every page
  even before they're used, a small cost until 4b.
- Not added: `focus-ring` and the shadow tokens, which turn 4 dropped. Decide in 4b
  whether focus rings use `action` (likely, since `action-solid` is black in Ink).

**Implementation notes (step 4b — palette switch)**:
- Every MD3 role in `app/globals.css` now points at an Ink token, defined once for both
  modes (the tokens themselves switch). The MD3 default palette (`--md-sys-color-*`) and
  the dark block's duplicate aliases were deleted. Mapping:
  | MD3 role | Ink token |
  | --- | --- |
  | primary / on-primary | action-solid / on-accent (black button, white text; inverted in dark) |
  | primary-container / on-primary-container | action-bg / action (blue tint, blue text) |
  | secondary, tertiary (+ containers) / on-* | border or sunken fills / ink |
  | error / on-error / error-container / on-error-container | danger / on-accent / danger-bg / danger |
  | surface / on-surface / surface-variant / on-surface-variant | canvas / ink / sunken / ink-muted |
  | surface-container-lowest, -container, -highest | surface |
  | surface-container-low, -high | sunken |
  | outline, outline-variant | border |
  | `--success` / `--warning` (app-specific) | committed / draft |
  Secondary and tertiary have no Ink counterpart, so they become neutral fills: the
  secondary Button is a grey fill and the default Chip (formerly purple) is sunken.
- Deleted the dark-only overrides that forced borders to 12% white
  (`.dark .border-md-outline`, `.border-border`, `-variant`, `/50`, `/30`,
  `.dark .border-input`); dark borders now use Ink's values. `.border-input` uses
  `border-strong` in both modes, as the design specifies for inputs. The quote board's
  draft edge no longer needs `!important`.
- Tailwind's `border` alias and the default border color now point at `--border`.
- Focus rings: `ring-md-primary` / `ring-md-secondary` (19 uses) became `ring-action`,
  so focus is blue rather than Ink's black button color. Chosen over a `focus-ring`
  token, which turn 4 dropped.
- Fonts: body text is Archivo (`var(--font-ui)`), and Tailwind's `font-mono` is IBM
  Plex Mono, so existing mono numbers (sidebar counts, board totals) switch too.
- Under an imported theme, the MD3-based screens still recolor exactly as before (the
  import overrides `--md-*` inline), but focus rings, `border-border` borders, and input
  borders now come from Ink tokens the import doesn't map. That's accepted under
  "best-effort"; the import mapping (see Open decisions) will cover them.
- Known leftovers for the per-screen restyles:
  - MD3 elevation still adds white tonal overlays in dark and shadows in light. The
    design uses borders instead; that's a Card/primitives change.
  - The template editor's link sidebar (`LinkOpportunitiesSection`,
    `LinkSourcesSection`, `TemplatePreviewHeader`) uses raw `emerald`/`orange`
    Tailwind colors that bypass the tokens.
  - The Input primitive's focus ring is a faint hairline at 12% opacity (pre-existing).
  - The board's template rail uses `surface-container-low` → `sunken`, which in dark is
    darker than the canvas. Fine as a recess, but revisit in the dashboard style pass.
- Don't run `npm run build` while the dev server is running: both use `.next`, and the
  build leaves the dev server serving missing chunks (404s, nothing hydrates) until it
  restarts.

## Primitives — Low

`components/ui/{Button,Card,Input,Select,Checkbox,Chip,Textarea}.tsx` already accept
children/leading-icon content generically enough to support the design's compound chip
content (e.g. `width` + `2400 mm` in one pill — see `FormulaVariableToken.tsx` already
composing a `Chip` with a `leadingIcon` and mixed-weight children). No prop-API changes
identified — this is a class/token restyle of existing components, consistent with the
design doc's own claim.

## Quote Builder (2a) — Low–Moderate

**Current state** (`app/quotes/page.tsx`, `components/quotes/QuoteBuilderWorkspace.tsx`):
already a two-pane layout — `WorkspaceModulesManager` (draft modules, `lg:col-span-3`)
on the left, `QuoteSummaryCard` (line items + totals) on the right. The workspace/line-item
data separation the design leans on already exists at the store level: totals are
computed only from `lineItems`, never `workspaceModules` (`quotes-store.ts:40-52`).
This is the single biggest
reason this screen is cheaper than it looks — the design is refining an architecture
that's already correct, not proposing a new one.

**Gaps**:
1. **Visual language for the state split** (sunken/dashed bench vs. raised/sealed
   ledger, amber "N drafts · not in total" badge, green "in the quote" badge, footer
   "excludes N drafts (X kr)" line) — pure styling + a couple of small derived-count
   displays (`workspaceModules.length`, sum of their `calculatedCost`). Low effort.
2. **`reopenLineItem` — REQUIRED.** "Reopen" (send a committed line item back to the
   workspace for editing) **does not exist today.** `removeLineItem` only deletes;
   `addLineItem` commits a snapshot but never removes or references the originating
   workspace instance afterward (they're independent once committed —
   `quotes-store.ts:266-307`). A `reopenLineItem(lineItemId)` action is buildable from
   data that already exists on `QuoteLineItem` (`moduleId`, `fieldValues`) —
   reconstruct a `QuoteModuleInstance`, push it to `workspaceModules`, remove the line
   item — but it is a **new store action**, not a relabeled existing one. Moderate,
   self-contained, and a hard prerequisite for shipping the "Reopen" button at all (see
   Required new actions above).
3. **Per-instance nickname** ("North wall", shown next to `#2` in the draft card, and
   surfacing later in the committed line item's summary) — **no such field exists**.
   `QuoteModuleInstance` and `QuoteLineItem` (`lib/types.ts:158-182`) have no
   `nickname`/label field today; instance disambiguation currently relies only on field
   values shown in the card. This is the one real (if small) **data model addition**
   needed for this screen: an optional `nickname?: string` on both types, an input to
   edit it, and carrying it through `buildQuoteLineItem` (`lib/quotes/line-item-builder.ts`)
   when a draft is committed. **Status relative to `reopenLineItem`**: not marked
   hard-blocking in the "Required new actions" section above, since the screen still
   functions without it — but it's what the design doc's own rationale says actually
   disambiguates multiple instances of the same module ("what actually tells four 'Wall'
   entries apart"). Recommend shipping it alongside `reopenLineItem` in the same pass
   rather than treating it as separable polish; don't let its softer "required" status
   read as license to defer it indefinitely.

**Implementation notes (step 2, structure only — `reopenLineItem` and nickname)**:
- `reopenLineItem(lineItemId)` in `quotes-store.ts` rebuilds a draft via
  `createWorkspaceInstanceFromLineItem` (`lib/quotes/workspace-actions.ts`), appends it
  to the workspace, removes the line item, and recalculates totals. Only the module's
  *current* fields are restored: fields added since the item was committed get their
  defaults, and values for fields since removed are dropped. Field links are not restored,
  because line items store resolved values, not links. If the item's module has since
  been deleted, Reopen is disabled.
- `nickname?: string` is on `QuoteModuleInstance` and `QuoteLineItem`. It's stored raw
  while typing (so spaces work), trimmed when committed, and dropped when blank.
  `formatInstanceName` (`lib/quotes/nickname.ts`) renders "Module · Nickname"
  consistently in the workspace card header, line items, the field-link picker (which
  previously showed identical labels for two instances of the same module), JSON export,
  and print/PDF export (HTML-escaped). Templates don't carry nicknames yet — templates
  have their own instance type and editor, left for later.
- Line-item row actions (Reopen and Remove) use a `.row-action` rule in `globals.css`:
  hidden until row hover or keyboard focus on devices that can hover, always visible on
  touch. The old Remove button was invisible to keyboard users and on tablets.
- Regression tests: "Quote Reopen & Nickname Regression" in
  `lib/regression-tests/quote-regression.ts`.

**Implementation notes (step 2b, structure only — lock-in moves, Duplicate)**:
- `addLineItem` now calls `commitQuoteWorkspaceModule` (`lib/quotes/workspace-actions.ts`).
  It builds the line item from resolved values, calls `freezeLinksToQuoteWorkspaceModule`
  so every draft linked to the committed one keeps its current value as a plain value,
  then removes the committed draft. Links between the remaining drafts are untouched: if
  C links to B and B linked to the committed A, B is frozen and C still follows B.
- `duplicateWorkspaceModule` inserts a copy directly after the original, with the same
  values and outgoing links. A nickname gets " (copy)" appended; a draft without one stays
  without one. Links *to* the original are not redirected to the copy.
- Removed the 2-second "Added to Quote" confirmation state (`useAddedItemFeedback`). It
  can't be seen anymore because the draft leaves the workspace when added.
  `components/module-editor/ModulesManager.tsx`, an unused older duplicate of
  `WorkspaceModulesManager`, was deleted rather than updated.
- Found while testing: the shared card header (`ModuleCardShell`) couldn't shrink below
  the full width of a module's description, so on modules with long descriptions (e.g.
  "Paint") the header's cost and Add/Duplicate/Remove buttons overflowed under the sticky
  Quote Summary and couldn't be clicked. Fixed with `min-w-0`; the description truncates
  as intended. This existed before this step; it affects every screen using the shared
  header.
- Accessible labels use "Module, Nickname" (`formatInstanceLabel`); visible text uses
  "Module · Nickname" (`formatInstanceName`). Screen readers may read "·" aloud.
- Discard (removing a draft) keeps linked values too: `removeQuoteWorkspaceModule` now
  calls `freezeLinksToQuoteWorkspaceModule` itself, so Add to Quote and Discard share one
  rule. Quote Builder only — the template editor removes instances through its own path
  (`lib/templates/template-workspace-actions.ts`) and still drops links, as before.
- Regression tests: "Quote Commit (Move) & Duplicate Regression".

## Module Editor — Detailed (2b) — High

**Current state**: one editor, one view. `FormulaBuilder.tsx` already has the raw
ingredients — chip-based variable insertion (`FormulaVariableToken.tsx`), sectioned
variable browsing by origin (fields/materials/labor — `FormulaVariableSections.tsx`),
autocomplete — but the formula itself is authored and *displayed* as a plain-text
`<textarea>` (`FormulaEditorPanel`), not as an inline sequence of value-carrying chips.

**Gap**: rendering the formula itself as colored, value-and-unit-carrying chips (rather
than plain text with a chip palette beside it) is a materially different editing widget —
effectively a small structured/token editor over the same underlying formula string. It
needs to: tokenize the string formula into chip spans, keep cursor/edit semantics usable
inline, resolve and inject each variable's live value + unit for display, and add the
plain-English restatement + unit-derivation line (this last part can likely reuse
`FormulaDebugPanel`'s existing analysis, per `lib/formula/debug-analysis.ts`, rather than
being computed from scratch). No changes needed to `formula-evaluator`/`mathjs` — this is
entirely a new presentation layer over the existing string-based formula and evaluation
engine.

## Module Editor — Simple (2c) — High

**Does not exist in any form today** — there is no Simple/Detailed toggle anywhere in
`components/module-editor/` or `components/formula/`. This is a new screen, not a
modification of an existing one.

The good news: the "named steps" model maps directly onto
`CalculationModule.computedOutputs`, which the engine already evaluates
sequentially with forward references (`lib/utils/evaluate-computed-outputs.ts:51-74`),
plus the module's final `formula` treated as an implicit last "Σ Module cost" step. No
evaluator or schema change is required to represent this — but building the actual step-
list editor (add/reorder/remove step, per-step operand/operator pickers, referencing an
earlier step by its label rather than its raw `out.` variable, live per-step preview,
"Show in quote" toggle already backed by `ComputedOutput.showInQuote`) is a full new
component tree, comparable in size to the Detailed view, built in parallel with it.

Sequencing note: since both views edit the same underlying module, Detailed (2b) is the
safer one to build first — it's an evolution of `FormulaBuilder`'s existing pieces —
before committing to Simple (2c), which is greenfield.

## Materials catalog (1f) — Very low

**Current state** (`app/materials/page.tsx`): already `CatalogPageShell` (list) +
`MaterialEditorPanel` (side panel), i.e. the exact "dense table + side panel" structure
the design specifies — which is presumably why the design doc kept this screen
"unchanged, as picked" rather than remocking it. Gap here is a restyle of existing
components only.

## Dashboard (2d) — Moderate

**Current state** (`app/page.tsx`): three static stat cards (Materials / Modules /
Quotes counts) linking to each section. No quote list, no "resume" affordance, no
template launch rail.

**Proposed**: a quotes-first board — a "pick up where you left off" resume card, a grid
of recent quotes with totals and draft-count badges, and a template launch rail.

**Gap**: the underlying data is already available — `quotes` array has `lineItems`,
`workspaceModules`, `total`, `updatedAt`; `templates` store has what's needed for the
launch rail. But the current dashboard component doesn't render any of it today, so
this is closer to **building a new component** (a quotes list/grid, sorted by
`updatedAt`, with a derived "most recently edited" resume card) than restyling one.
Effort is moderate rather than high because no new store logic or schema is needed —
it's assembly and layout over data that already exists.

**Follow-up from the navigation shell**: the mockups show the sidebar's "Quotes" item
active on this board, i.e. the board *is* the Quotes landing page. Once `/` becomes the
quotes board, change the "Quotes" nav item in `components/AppSidebar.tsx` to link to
`/` and treat it as active on both `/` and `/quotes`. **Done in step 3** (see below).

**Correction to the gap above**: "no new store logic" turned out to be wrong. The store
held one open quote (`currentQuote`) plus a `quotes` list that "Save Quote" copied into,
and nothing ever read `quotes`. There was no way to open a saved quote, and
`createQuote` replaced the open quote without saving it. A board that opens quotes needs
two small store actions (below). There is still no schema change.

**Implementation notes (step 3, structure only — quotes board)**:
- `app/page.tsx` renders `components/dashboard/QuoteBoard.tsx`, which replaces the old
  stat cards and Quick Start guide. Layout follows 2d: a header ("Quotes", "N total · M
  with open drafts", search, New quote), a 2-column quote grid with a full-width resume
  card, and a 288px template rail (`lg:w-72`) that stacks below the grid under `lg`.
- **Switching quotes saves the open one.** New store actions `openQuote(id)` and
  `startNewQuote(name?)` first call `stashQuote` (`lib/quotes/quote-board.ts`), which
  puts the open quote into `quotes`, replacing its older saved copy, so opening another
  quote never drops unsaved work. The exception is a *pristine* quote (never saved, no
  drafts, no line items, name blank or "New Quote"), which is discarded instead of
  cluttering the board. `createQuote` is unchanged. The builder's "Save Quote" button
  still works, but switching now saves too.
- **The board shows the open quote's live state.** `getBoardQuotes` merges `quotes` with
  `currentQuote` (live copy wins, pristine left out), sorted by `updatedAt` descending.
  The sidebar's Quotes count uses the same function, so it matches the board. It
  previously counted only `quotes.length`, which missed a never-saved open quote.
- **Resume card** ("Pick up where you left off") is the quote open in the builder, or
  the most recently edited saved quote if the open one is pristine. It shows the quote
  total and, when drafts exist, "+X uncounted" (sum of the drafts' `calculatedCost`) and
  an "N drafts open" badge. Quote cards with drafts get the same badge and an amber left
  edge. While searching, the resume card is hidden and every match is listed as a card.
- **Quote cards** open the quote on click anywhere (stretched `::after` button) and have
  a Delete row action (`.row-action`, `ConfirmDialog`). Delete wasn't in the mockup, but
  switching now adds quotes to the list, and nothing else in the app can remove them.
  The resume card has no Delete.
- **Not in the data model, left out**: the mockup's client name ("Nordic Systems AS")
  and "sent" status/date. Cards show "N items · <edited time>" instead: "just now",
  "12 min ago", "3 h ago", then "18 Sep" (with the year when it isn't this year). Month
  names are fixed, not locale-formatted, because ICU versions disagree ("Sep"/"Sept").
- **Template rail**: "Start quote" calls `startNewQuote(template.name)` then
  `applyTemplate`, and opens the builder. Template warnings (e.g. a deleted module) go
  through `notify()`, because the builder's own warning banner doesn't survive the
  navigation. The "≈ X" estimate (`estimateTemplateCost`) is the sum of the drafts'
  costs when the template is applied, i.e. at default field values (templates don't
  restore saved values into quotes). Markup and tax are not included. The first
  template gets the primary button and the rest get outlined ones, as in the mockup.
- **Sidebar**: "Quotes" links to `/` and is active on `/` and `/quotes`
  (`NavItem.alsoActiveOn`). The brand still links to `/`.
- Board content renders after mount, like the sidebar counts, to avoid hydration
  mismatches from the synchronously hydrated stores.
- **Style-pass notes for step 6**: the draft edge uses `!border-l-warning`, because the
  dark theme's `.dark .border-md-outline` rule in `globals.css` otherwise outranks it.
  Amber text on the light theme (`--warning`, #FFC107) is low contrast. Both go away
  once these move to the `--draft`/`--draft-bg` tokens. Numbers already use `font-mono
  tabular-nums`, pending `.font-numeric`.
- Regression tests: "Quote Board Regression" in `lib/regression-tests/quote-regression.ts`
  (pristine detection, stashing, board merge/sort, draft summary, search, edited-time
  formatting, template estimate).

## Sequencing strategy: structure before style

Not every gap above decouples the same way from the token/font work in Foundations.
Splitting them matters for cost, not just ordering preference:

- **Structure-only items** — `reopenLineItem`, the nickname field, dashboard
  quote-list rendering, and the sidebar's grouping/counts — carry their value in logic
  and data-wiring, not in the new palette. They can be built and shipped entirely on
  the *current* MD3 tokens and existing primitives. Building these first means real
  product value (a fixable line item, disambiguated instances, a dashboard that
  actually shows your quotes, a navigable sidebar) ships without waiting on font
  licensing, the dark-mode token gap, or design sign-off — and keeps the diffs small
  enough that a logic bug is never tangled up with a simultaneous className rewrite.
  If the visual reskin ever stalls, these fixes still ship; they're not hostage to a
  full visual sign-off.
- **Visually load-bearing items** — the workspace/line-item spatial-and-color split
  (sunken dashed bench vs. raised sealed ledger, amber vs. green) and the Module
  Editor Detailed view's colored value-carrying chips — don't meaningfully decouple.
  The signal *is* the visual treatment; a "structural-only" version of either is just
  today's UI with no new value. Build these once, after Foundations, rather than
  building a placeholder and redoing it.

**Caution**: don't ship the intermediate state (new sidebar/dashboard rendered in old
MD3 colors) to real users — it reads as an unfinished migration, not a deliberate
design. Keep it on a branch/staging until the token pass catches up, unless this app
currently has no external users to confuse.

## Recommended build order

1. **Navigation shell (structure only)** — build the sidebar's grouping, counts, and
   layout on current tokens; resolve the open question about where Export/Import Data
   and theme management land. Every other screen renders inside it, so this unblocks
   everything downstream regardless of token status.
2. **Quote Builder required actions (structure only)** — `reopenLineItem` and the
   nickname field, built on current styling. Highest daily-use payoff of anything in
   this list, and independent of Foundations entirely.
3. **Dashboard rebuild (structure only)** — quote list/grid and resume card, on
   current styling. No new store logic needed, just assembly over existing data.
4. **Foundations** — tokens + fonts, once the structural work above has proven out
   the interactions it depends on. Split in two:
   - **4a** — the Ink tokens, Tailwind names, fonts, and `.font-numeric`, with no
     visual change.
   - **4b** — the palette switch: point the MD3 variables (which every current screen
     reads) at the Ink values, so the whole app recolors in one small diff, and switch
     the body font. Expect some interim oddities until each screen is restyled, e.g.
     links and active states rendering black (Ink's button color) instead of blue.
5. **Materials catalog** restyle — cheapest possible visual win, validates the
   token/primitive restyle approach on a screen that needs no structural change.
6. **Navigation shell and Dashboard — style pass** — apply the new tokens to the
   structural work already shipped in steps 1 and 3 (colors, type, spacing on the
   sidebar and the quote list/resume card). Does not include Quote Builder's visual
   language — that's step 7, a separate and larger piece of work, not a continuation of
   this pass.
7. **Quote Builder — visual language** — apply new tokens to the `reopenLineItem`/
   nickname UI shipped in step 2, *and* build the sunken-bench/sealed-ledger spatial
   treatment (Gap #1 in the Quote Builder section) for the first time — this piece never
   existed in any structural form, so there's no earlier step it's "finishing." Build it
   once, directly on Foundations, since — per Sequencing strategy above — it doesn't
   decouple from styling.
8. **Module Editor — Detailed** — highest-value formula-approachability work; also
   doesn't decouple from styling, so build it after Foundations rather than twice.
9. **Module Editor — Simple** — defer until Detailed ships and the chip/value pattern
   is validated with real use; largest net-new surface.
10. **Cost mix** — separate initiative, needs its own scoping for cost-attribution
    logic.
