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
| Module Editor — Detailed (2b) | ~~High~~ Moderate (re-scoped) | Reskin + front-end UX fixes; the chip/units engine work is deferred — see its section |
| Module Editor — Simple (2c) | High (on hold) | New screen entirely; held until the re-scoped editor has been used |
| Materials catalog (1f, "unchanged, as picked") | ~~Very low~~ Moderate | Was a card list, not the table 1f specifies — see correction in its section |
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

**Implementation notes (primitives restyle — done after step 5, ahead of step 6)**:
- `Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Chip`, and `Card` in
  `components/ui/` now follow 1a / 3a "Controls — every state". The prop API is unchanged,
  except `Input`'s unused `variant="underline"`, which was removed.
  - Button: 6px radius, 13px semibold, `h-9` (md). primary = `action-solid`,
    secondary = surface + `border-strong`, ghost = quiet ink-muted text, danger = surface
    with danger text and `danger-border` (1a's outlined "Remove", now also the confirm
    button of destructive dialogs). Disabled = sunken fill + faint text. Keyboard focus =
    2px action ring with an offset (`focus-visible`, so no ring on mouse clicks). The MD3
    glow, elevation, and press-scale effects are gone.
  - Input/Select/Textarea share `components/ui/field-styles.ts`: 38px, surface fill,
    `border-strong`, 6px radius; focus = action border + 3px `action/20` ring; error =
    danger border; disabled = sunken + faint. Labels are 12px ink-muted. `type="number"`
    inputs render in `font-numeric` automatically.
  - Chip: pills in design roles — neutral (`sunken`), solid action, tonal action
    (fields), tonal committed (`success` is now the tonal green "Locked" style, not a
    solid fill), tonal/solid danger, outline, ghost.
  - Card: 10px radius, surface + `border`, `shadow-card`; raised/overlay use
    `border-strong` + `shadow-panel`. Cards no longer emit MD3 `elevation-N` classes, so
    dark cards lose the white tonal overlay. The `elevation` prop maps to the two shadows.
- New tokens `--shadow-card` / `--shadow-panel` (Tailwind `shadow-card`, `shadow-panel`)
  with turn-3 values (card `0 1 2 / .05` light, none dark; panel `0 8 24`, `.10` light,
  `.55` dark). Turn 4 dropped them in favor of hardcoded shadows; tokens keep dark mode right.
- Removed 43 `className="rounded-full"` overrides from `<Button>` call sites (the old pill
  convention), which would otherwise have kept those buttons round.
- Leftovers for per-screen restyles: about 14 non-primitive components still use MD3
  `elevation-N` classes directly (e.g. `ModulePickerCard`, `EditorActionBar`,
  `EmptyState`, `QuoteBoard`, module-editor pieces), and the quote board's search field is
  still a pill. `ModalDialog` (used by `ConfirmDialog`) has its own MD3 surface styles.

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

**Implementation notes (step 7 — Quote Builder visual language)**:
- **Page** (`QuoteBuilderWorkspace`): the header is the quote name, edited in place (a
  heading-styled input), with "N line items · edited X" and the actions Save as template,
  Export JSON, Save quote. Below it, the bench and the sealed quote sit side by side
  (`1fr` + 380px, 420px at `xl`) and stack below `lg`. `QuoteDetailsCard` is gone: name →
  header, markup and VAT → the sealed quote, currency → the sidebar Settings menu (it's
  app-wide). The fixed bottom action bar is gone too; its actions moved into the header
  and the bench.
- **Bench** (`WorkspaceModulesManager`): `sunken` with a dashed `border-strong` edge, a
  "Workspace" label, a "N drafts · not in total" badge (`draft-bg`, the tooltip gives the
  draft money), Add module / From template, and the closing line "Drafts stay here until
  you lock them in — nothing here touches the client total." "From template" opens the
  picker showing templates only (new `section` prop on `ModulePickerCard`, which is also
  restyled: compact outlined rows instead of pill buttons). An empty bench shows a prompt.
- **Draft card** (`DraftModuleCard`, replaces `SortableModuleCard`):
  - Expanded: a 3px `draft` strip, name + `#n` + inline nickname field, status chips,
    Duplicate / Discard (with a confirmation that mentions linked values are kept) /
    collapse. Fields in a 1/2/3-column grid, then chips for computed outputs marked "show
    in quote" (`action-bg`, mono), then a footer with the calculator's error (if any),
    "Draft cost" in 22px mono, and "Lock into quote →".
  - Collapsed: a compact row with name, `#n`, nickname, a summary line (same builder as
    line items), cost, and "Lock in".
  - `#n` numbers drafts per module in current bench order, so it changes when an earlier
    draft of the same module leaves the bench. Stable numbers would need storing.
  - "Add to Quote" is now "Lock into quote" / "Lock in", matching Reopen.
- **Draft status** (`getDraftStatus`, `lib/quotes/draft-status.ts`) calculates each draft
  the way committing it would (resolved links, same calculator), giving cost, error,
  outputs, summary, and missing-required count.
  - "N inputs needed" now counts required, unlinked fields that are actually **empty**.
    The old chip counted every required unlinked field, filled or not.
  - A draft that can't calculate gets a danger border, "Can't calculate" (when nothing
    required is missing), a "—" cost, and a disabled Lock in. Committing it would fail
    anyway. Drafts with empty required fields that still calculate (via defaults) can
    be locked in, as before.
- **Sealed quote** (`QuoteSummaryCard`): a raised `surface` sheet with `shadow-panel`, a
  green `committed-solid` dot, "In the quote" in `committed`, and "N line items". Rows show
  name · nickname, primary summary, secondary summary, and cost, with Reopen / Remove as
  hover/focus row actions. The footer (`surface-hover`) has Subtotal, Markup and VAT with
  inline % inputs and amounts, the Total in 28px `committed` mono, "Export quote"
  (print/PDF), and "Excludes N drafts in the workspace (X)". Markup and VAT rows are now
  always visible (they were hidden at 0%), since they hold the inputs.
  - The old "Send Quote" button was a placeholder that only showed a toast. It's
    replaced by the real print/PDF export ("Export quote").
- `FieldHeader` (field labels in drafts and the module preview) moved onto tokens: 12px
  `ink-muted` labels, mono unit hints, `action`-colored Link / `danger` Unlink.
- Still MD3 in this area: `AlertBanner` (template warnings), `SaveTemplateModal` /
  `ModalDialog`, the field-link picker and badges inside `module-field-input/`, and the
  template editor, which shares `ModulePickerCard` and `FieldHeader` but not the bench.
- Cost mix (materials vs. labor) stays out of scope, as decided.
- Regression tests: "Draft Status Regression" in `lib/regression-tests/quote-regression.ts`.

## Module Editor — Detailed (2b) — re-scoped: reskin + UX fixes

**Assessment before step 8 (replaces the earlier High-effort gap).** Checked against the
code and real modules rather than taken from the mockup. Several of 2b's features depend
on engine or data-model work that the mockup takes for granted:
- **Unit derivation** ("m² × kr/m² → kr ✓"): the engine has six unit *categories*
  (length, area, volume, weight, percentage, count). There's no money unit, no time,
  and no compound or rate units. Unit checking (`lib/formula/unit-validation.ts`) is
  pattern matching on the formula text for two identifiers joined by `+`, `-`, or `/`,
  and never looks at `*`. `debug-analysis.ts` only classifies identifiers. The earlier
  claim that the derivation could reuse the debug analysis was wrong. It would need new
  unit algebra over a parsed formula, and material units are free text.
- **Formula as chips**: evaluation substitutes values into the formula text
  (`evaluator.ts`) and never builds a syntax tree. Chips need a new tokenizer/parser (mathjs's
  `parse` is available). A true inline chip *editor* (1d: "nothing in it is bare text") also
  needs hand-rolled cursor, selection, paste, undo, and accessibility.
- **Plain-English restatement**: fine for the mockup's `a × b + c × d`, but real formulas
  use shared functions, `==` comparisons, and `ceil()`, where it would read awkwardly or
  mislead.
- **`panel.price` / `crew.cost` notation**: not supported. A bare picker variable is its
  price/rate, and `x.price` only resolves a real property named `price`, which some real
  materials have with a different value. A pseudo-property would collide with them.
- **Dropdown choices with a label and a separate value** ("One = 1 ×"): options are plain
  strings.
- **Simple/Detailed switch**: meaningless until Simple exists.

**Decision: defer all of the above** (chips, units, restatement, notation, label/value
choices). Step 8 is a reskin plus front-end UX fixes found by using the current editor:
1. **Keyboard access**: `EntityCard` made cards clickable through a plain `div`, so
   modules, functions, and templates couldn't be opened from the keyboard. Fixed in the
   shared card (all three lists).
2. **Inline test panel** replacing the Preview modal and the always-$0 "Preview (with
   defaults)" line (a module with a material picker defaults to no material). Sample
   inputs sit next to the formula and show the cost, every computed output ("shown in
   quote" marked), and the calculator's error. Values start from field defaults, with
   pickers on the first item in their category. **Session only**: nothing is saved.
3. **Consistent chip colors**: fields and computed outputs blue (`action`), materials
   green (`committed`), labor amber (`draft`), as in the catalog and Quote Builder.
   Field variables were green before, which the rest of the app uses for materials and
   committed items.
4. **"Required" is a quiet label**, not a red danger chip, and field rows are compact.
5. **The operator/comparison reference is collapsed by default** in the formula panel.
6. **Header like the Quote Builder**: a "Modules / name" breadcrumb, validity status,
   Cancel/Save. The fixed bottom bar goes; Add field / Add output move to their section
   headings.
7. **Dead code removed**: `ToolsCard`, `ValidationCard`, `FormulaCard`, `OperatorsCard`
   (imported nowhere).
- Plus the reskin onto Ink tokens and primitives: the editor, the formula panel, the
  field and computed-output cards, and the Modules list (restyled cards, formula as a
  code block instead of a read-only textarea). The Functions and Templates lists only get
  the keyboard fix now; their reskin is a later step. The function and template editors
  change only through shared pieces.

**Implementation notes (step 8 — reskin + UX fixes)**:
- **Keyboard access** (`EntityCard`): the title is a real button whose `::after` covers the
  card (the quote board's pattern). Actions sit above it, and the old clickable wrapper
  `div` is gone. The shared card is also on tokens now, so the Functions and Templates
  cards change look slightly too; their page headers are unchanged until their own step.
- **Inline test panel** (`ModuleTestPanel`, `lib/modules/module-sample.ts`): it uses the
  quote inputs (`ModuleFieldInput`), so labor pickers work too; the old modal only took
  materials. It keeps only the values the user changed; everything else follows
  `getSampleDefaults` (field defaults, with pickers on the first item in their category),
  so adding, removing, or re-defaulting fields stays in step. `evaluateModuleSample` runs
  the quote calculator and returns the cost, **every** computed output, and the
  calculator's own error. It replaces `ModulePreview`, `use-preview-cost`, the editor's
  preview state, and the "Preview (with defaults)" line, which hardcoded `$` and was always
  0 for modules with a picker. Session only, with a Reset button. The panel is keyed by
  module, so switching modules starts fresh.
- **Layout**: the header (`ModuleEditorHeader`) has "Modules /" and the name, the formula
  status, and Cancel / Save module. The fixed bottom bar (`ModuleEditorActions`) is
  deleted; Add field / Add output sit on the section headings (`SectionBar`). Two columns:
  details, fields, and outputs on the left; a sticky right column (scrolls on its own)
  with the formula card and the test panel.
- **Palette colours**: `FormulaVariableToken` takes an `origin` (field / material /
  labor → `action` / `committed` / `draft` tonal pills). A variable already in the formula
  gets a check mark and an outline in its own hue; before, "used" was solid green and
  "unused" solid black. Material and labor picker fields show in their catalog colour. The
  function editor uses the default (field) colour.
- **Field and output rows**: `ModuleCardShell` (shared with the template and function
  editors) has a compact header and no outer padding; callers' bodies already carry their
  own. Field rows show the variable (tonal blue), then type, unit, picker category, and
  "required" as quiet text; "Required" was a red danger chip. Output rows show
  `out.variable` and the unit.
- **Formula card**: "Formula", with the text area labelled "Cost formula"; autocomplete,
  debug ("What the formula uses"), and the operator reference ("Operators & functions",
  collapsed by default) all on tokens.
- **Modules list**: the restyled cards show the formula as a code block, not a read-only
  textarea, and use the shared `EmptyState`.
- Dead code removed: `ToolsCard`, `ValidationCard`, `FormulaCard`, `OperatorsCard`, plus
  `ModulePreview`, `ModuleEditorActions`, and `use-preview-cost`, which the changes above
  made unused.
- Regression tests: "Module Sample Regression" (`lib/regression-tests/module-sample-regression.ts`).

## Module Editor — Simple (2c) — on hold

**Does not exist in any form today** — there is no Simple/Detailed toggle anywhere in
`components/module-editor/` or `components/formula/`. This is a new screen, not a
modification of an existing one. **On hold** (decided before step 8): it was framed as the
complement to the chip-based Detailed view, which is deferred. Revisit once the re-scoped
editor with the inline test panel has been used; that panel may cover most of the need.

## Materials catalog (1f) — ~~Very low~~ Moderate

**Current state** (`app/materials/page.tsx`): already `CatalogPageShell` (list) +
`MaterialEditorPanel` (side panel), i.e. the exact "dense table + side panel" structure
the design specifies — which is presumably why the design doc kept this screen
"unchanged, as picked" rather than remocking it. Gap here is a restyle of existing
components only.

**Correction (found in step 5)**: the assessment above was wrong. The list was a stack of
expandable, draggable cards (`MaterialItem` on `ModuleCardShell`), not the dense table
1f shows (Name with category and SKU/supplier · Variable · Properties inline · Price ·
Unit), and the panel lacked 1f's formula reference line and module-usage count. The side
panel existed; the table didn't. Step 5 was a structural rebuild of the list plus a
restyle of the panel.

**Decisions (step 5)**:
- **Manual order kept.** Rows keep the saved drag order with a slim drag-handle column,
  instead of switching to sortable columns (1f's rationale mentions "sortable", but its
  table has no sort controls). Dragging is off while searching or filtering, as before.
- **Labor gets the same treatment** (no Labor mockup exists). It shares the catalog shell,
  so both pages use the same table and panel: Name · Variable · Properties · Rate.

**Implementation notes (step 5, Materials and Labor)**:
- Shared pieces in `components/shared/catalog/`: `CatalogPageShell` (header with item
  count, search and New button; category chips with counts; table header; empty states;
  panel column), `CatalogTableRow` (grid row: drag handle, a name cell whose stretched
  button opens the editor, then the page's cells; plus `CatalogPropertiesCell`),
  `CatalogCategoryChips`, and `CatalogEditorPanel` (panel frame with a Delete / Cancel /
  Save footer, `FormulaReference`, `CatalogPropertyRow`). `MaterialRow`/`LaborRow` replace
  the old `MaterialItem`/`LaborItem` cards. `CatalogSearchFilter` and the now-unused
  `CategoryChipSelector` were deleted; `useCatalogListState` lost its expand/collapse state
  and gained category counts.
- **Layout**: columns come from each page (`MATERIAL_COLUMNS`/`MATERIAL_GRID`,
  `LABOR_COLUMNS`/`LABOR_GRID`) through a `--catalog-cols` CSS variable. The narrow layout
  (name and price only) is used below `md`, and also while the panel is open until `2xl`,
  since the table beside a 380px panel is too narrow for five columns
  (`CatalogLayoutProvider`). Below `lg` the panel stacks under the table and scrolls into
  view when opened.
- **Missing properties are flagged amber** in the row ("no properties") and in the panel,
  per 1f. That applies to Labor too.
- **Formula reference**: the panel shows the bare variable (`mdf18 → 142.00 kr / m²`),
  because the resolver evaluates a bare material/labor variable to its price/rate;
  `mdf18.price` also works (it falls back to the price) but isn't the canonical form.
  Each property row shows its own reference (`mdf18.thickness`).
- **"Used in N modules"** (`countModulesUsingCatalogItem`, `lib/catalog/catalog-display.ts`)
  counts modules that reference the item's variable in the formula or a computed output
  (bare or `.property`), **or** have a material/labor picker field whose category filter
  is the item's category or empty. The picker case matters: real modules mostly choose
  materials through category-filtered fields, so counting only name references showed
  0 for materials that were in use.
- **Delete moved into the panel** (it was on each card), behind `ConfirmDialog`.
- **Form behavior**: the forms use `noValidate`, so the panel's own inline errors show
  instead of the browser's; each field's error now clears as soon as it's edited
  (`useClearErrorsOnChange`) rather than staying until the next submit. Adding a property
  is behind an "Add property" button instead of an always-open form.
- **Not restyled here**: the shared primitives (`Input`, `Select`, `Button`, `Chip`,
  `Textarea`) and `PropertyForm`/`LaborPropertyForm`. They render in Ink colors (step 4b)
  but keep MD3 shapes (pill buttons, filled rounded inputs). Restyling them changes every
  screen at once, so it should be its own step.
- Regression tests: "Catalog Display Regression" (`lib/regression-tests/catalog-regression.ts`).

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

**Implementation notes (step 6 — sidebar and board style pass)**:
- Sidebar (`components/AppSidebar.tsx`) follows 2a's token-driven sidebar: `sunken-2`
  column with a `border` hairline, a 26px ink logo square, 36px primary items and 34px
  catalog items (6px radius, 13px, `ink-body`), mono counts in `ink-faint`. The active item
  is `action-solid` with its count in `action-border`, a 10.5px caps "Catalog" label in
  `ink-faint`, and the Light/Dark control as a pill track in `border` with the active
  option on `surface`. The Settings menu is a `surface` popover with `shadow-panel`; the
  active theme row uses `action-bg`.
- Layout (`components/Layout.tsx`): page background `canvas`, the mobile top bar matches
  the sidebar (`sunken-2`), and the Import Data / Theme Settings modal frames are `surface`
  + `border-strong` + `shadow-panel` with 10px corners. The body base style is
  `bg-canvas text-ink`.
- Board (`components/dashboard/QuoteBoard.tsx`) follows 2d's measurements: 24px title, a
  34px search field in the field style, cards with 10px radius and `border-strong`, and a
  3px `draft` left edge on quotes with drafts. The draft badge is `draft-bg`/`draft`. The
  resume card's total is in `committed` green, as in 2d (it's what the client pays), and
  uncounted draft money is in `draft`. Quote cards use `surface-hover` on hover.
  - Template rail: `sunken-2` rather than 2d's sunken tray color, because Ink's dark
    `sunken` is darker than the canvas and read as a hole. The first template gets the
    primary button; the rest get secondary with `action` text, as in 2d.
- `EmptyState` (shared: board, functions, templates, template preview) moved onto tokens
  with smaller icon circles and 16px titles; its MD3 `elevation-4` is gone.
- The board no longer uses `warning` or any MD3 classes; the step-3 note about
  `!border-l-warning` is obsolete.

## Functions and Templates (no mockup) — assessed before building

No mockup covers these pages. The assessment below comes from using them with real
data and reading the code (same approach as step 8).

**Functions — findings**:
- **The call signature isn't shown anywhere.** Cards show the display name ("Area Rectangle"),
  but formulas must call `area_rectangle(width, height)`. Neither the call name nor the
  parameter order appears on the list.
- **Nothing protects modules that use a function.** Delete only asks "Are you sure?",
  and `functions-store.deleteFunction` has no guard. Real modules call functions (Framing:
  `perimeter_rectangle`, `stud_count`, `spill`). Renaming the call name in the editor also
  breaks every caller silently; `updateFunction` doesn't touch references.
- **No way to try a function** with sample numbers.
- The editor has the pre-step-8 Module Editor shape: large header, fixed bottom bar, a
  second, always-expanded copy of the operator guide (`FunctionFormulaCard`), and the list
  shows formulas in focusable read-only textareas.

**Templates — findings**:
- **Template field values mislead.** The template editor shows full inputs per module
  (`SortableModuleInstance` → `ModuleFieldInput`) and saves them. "Save as template" in
  the Quote Builder also copies draft values (`template-helpers.ts`). But applying a
  template deliberately discards them (`template-application.ts`: "Saved template field
  values are preserved for template editing, not restored into quotes"). The board's
  "≈ X" estimate also uses defaults.
- **The link analysis is jargon**: "N opportunities", "3 sources · 100%", "Link Excellent
  (3 at ≥80%)" / "Link Good" are unexplained match-quality scores. The sidebar also uses
  raw `emerald`/`orange` Tailwind colours (noted in 4b).
- The editor has the old shape (header, fixed bottom bar); module instances already use the
  restyled card shell and picker.

**Decisions (user)**:
- **Templates are reusable module chains, not saved inputs** — "build your own calculator":
  a big chain of modules and their links, reused with different inputs each time. So the
  template editor **stops showing field value inputs**; it edits which modules are in the
  template and how their fields link. Applying a template keeps starting from defaults, as
  today. Values already stored on templates are left in the data (unused, harmless); no
  data-model change.
- **Function rename: warn only.** Show where a function is used, and warn before deleting
  or renaming one that's in use. No automatic rewriting of module formulas for now.
- **Two steps**, each committed separately: Functions (step 9), then Templates (step 10).

**Step 9 — Functions (planned)**: call signature on cards and in the editor; "used in N
modules" (formula, computed outputs, and other functions) on cards and in the editor; delete
confirmation naming the affected modules; rename warning when a used function's call name
changes; a function test panel (an input per parameter → result with return unit, or the
error); the editor in the step-8 shell (header actions, no bottom bar, shared collapsed
operator guide, palette colours, compact parameter rows); list reskin (code-block formulas,
new header).

**Implementation notes (step 9 — Functions)**:
- **Usage** (`lib/functions/function-usage.ts`): `findFunctionUsage` finds calls (`name(` as a
  whole identifier, not `x.name(` or `my_name(`) in module formulas, computed outputs, and
  other functions. Cards show the call signature (`formatFunctionSignature`, e.g.
  `stud_count(width, stud_spacing)`) and "Used by Framing". The delete confirmation names
  what will stop calculating. The redundant pencil action is gone; the title opens the editor.
- **Rename protection, warn only**: the call-name field shows an amber warning while a used
  function's name differs from its saved name, and Save asks for confirmation ("Rename
  anyway"). Module formulas are not rewritten.
- **Bug fixed**: the editor kept deriving the call name from the display name even for
  saved functions (`hasManuallyEditedVariableName` started false), so editing the display
  name silently renamed the function and broke its callers. Auto-derive now only runs while
  creating. Checked against real data: no saved function's name differed from its derived
  name, so nothing had been renamed yet.
- **Try it** (`FunctionTestPanel`, `lib/functions/function-sample.ts`): an input per
  parameter. Numbers typed in the parameter's unit are converted to base units, as module
  fields pass them. The result is shown in the return unit, or the error is shown.
  Evaluation mirrors `evaluateFunctionCall` (materials only), so a test can't pass where a
  module call would fail. Parameters the formula reads properties from (`material.width`)
  get a material picker, since parameters carry no type. Session only.
- **Shell**: the shared `EditorPageHeader` (also now used by the Module Editor; replaces
  `ModuleEditorHeader`, `FunctionEditorHeader`, and `FunctionEditorActions`), the step-8
  two-column layout with a sticky formula + test column, `SectionBar` for parameters,
  compact parameter rows (position, name, unit). The function editor's own ~150-line copy
  of the operator guide is replaced by the shared collapsed `FormulaOperatorGuide`. The
  field is labelled "Call name" instead of "Variable Name".
- The return unit is still not editable in the editor (it never was); only functions whose
  data already carries one show it.
- Regression tests: "Function Usage & Sample Regression".

**Step 10 — Templates (planned)**: remove the per-module value inputs from the template
editor; plain-language link analysis ("Width in Sheet Installation can use Framing's
width", "Link all exact matches") on tokens; the editor in the step-8 shell; list reskin.

**Implementation notes (step 10 — Templates)**:
- **No value inputs** (decision: templates are reusable module chains). Each field of a
  module in the template editor (`SortableModuleInstance`) is a row: name, unit,
  "required", and how it's filled in a quote, either "Entered in each quote" or "From
  Dimensions — Width", with Link… / Unlink. Material pickers still can't be linked (the
  choice is per quote). "Link…" is offered only when a compatible target exists: the
  shared `buildLinkOptions` (also used by the Quote Builder) lists "None" and a heading for
  every other module even when empty, so the card filters to real targets and non-empty
  headings (`linkableOptions`). Values already stored on templates stay in the data,
  unused; applying a template still starts from defaults. `ModuleInstancesManager` and the
  card no longer take value props.
- **Plain-language link analysis**: "How the modules connect — N of M fields take their
  value from another module · K suggested". Suggestions read "Layers in Paint can use
  Framing · Quantity", with the analysis's own match reasons ("matching unit (pcs) ·
  compatible type") instead of percentages; alternatives sit behind "N other options". The
  batch buttons read "Link N exact matches" (score ≥ 80) and "Link N close matches"
  (≥ 60; thresholds unchanged). The batch confirmation no longer claims it "cannot be
  undone" (links can be unlinked) and lists "Width in X ← Y · Width". The "Primary module"
  section was dropped (it only said "first module in template hierarchy"). "Link sources"
  became "Shared values" ("Dimensions · Width feeds …"). The raw emerald/orange colours
  are gone.
- **Shell**: `EditorPageHeader` (Templates / name, Cancel / Save template), the two-column
  layout with a sticky analysis column, `SectionBar` "Modules" with Add module and the
  picker inline. The fixed bottom bar is gone. `EditorActionBar` and `PageHeader` are
  deleted (no users left).
- **List**: new header, cards show the modules in chain order (repeats included; they were
  de-duplicated before), "N modules · M links", and a delete message noting that quotes
  already started from the template aren't affected.
- `FieldLinkBadge` (shared with the Quote Builder's field-link inputs) is on tokens.
- **Still MD3 after step 10** (planned as step 11, "MD3 leftover cleanup"): the shared overlays
  (`ModalDialog`, `ConfirmDialog`, `NotificationToast`, `AlertBanner`, `ClickTooltip`,
  `ActionIconButton`), `SaveTemplateModal`, `DataImporter` / `ThemeImporter`, the catalog
  `PropertyForm` / `LaborPropertyForm`, `QuoteBuilderLoading`, and possibly-unused
  `SearchFilterBar` and `ui/resizable-panel`.

## Data export/import (step 12) — done before step 11

Found in the leftover assessment after step 10. It's a data-loss fix, not a reskin item,
so the data-layer changes are in scope.

**Problem**:
- Export Data (`exportAllData`, `lib/utils/data-export.ts`) left templates out; the
  `templates` key existed but was documented as "not exported/imported". Quotes weren't
  exported either.
- Import in Replace mode cleared templates and never imported any, so every template was
  deleted, while the dialog only said "Delete all existing data and import new data" and
  "Templates are not imported as they reference module IDs that change during import."
- Replace mode didn't clear labor but re-added the file's labor, duplicating every item.
- The obstacle to importing templates: module IDs change on import (`addModule` generates
  new ones; merge skips modules whose name exists and keeps the existing module's ID), and
  each template instance stores a `moduleId`.

**Decisions**:
- Templates are exported and imported, with their module IDs remapped. `EXPORT_VERSION`
  is now `1.1.0`; 1.0.0 files (no `templates` key) still import.
- Templates whose modules can't be found are imported anyway, with a warning naming the
  template and the missing modules (applying one already skips missing modules). Merge
  skips templates whose name exists (case-insensitive), like the other entities.
- **Quotes stay out of export/import** (user's choice, option (a)): not exported, never
  cleared or changed by an import, and the dialog says so. Including them (remapping draft
  `moduleId`s the same way) is possible later if backups of quotes are wanted.
- Template `fieldValues` are carried through as-is (unused by design; see step 10).

**Implementation notes**:
- Pure helpers in `lib/utils/data-import-remap.ts`: `buildModuleIdMap` (file module ID →
  ID after the import: the added module's new ID, else the existing module with the same
  name, case-insensitive) and `remapTemplateModules` (rewrites each instance's `moduleId`,
  keeps instance IDs and `fieldLinks`, which point at other instances of the same template
  by ID or `__index_N__`, so links survive untouched). Unmapped instances keep their old
  `moduleId` and are reported by module name when the file knows it.
- `addModule` now returns the created module, so the import records old → new IDs.
- **Replace replaces only the kinds of data the file contains.** Modules, materials, and
  categories are always in a file; labor, functions, and templates are cleared only when
  the file has that key. An older file without templates keeps the current templates and
  points them at the imported modules with the same names (with a note that they were
  kept, plus missing-module warnings). Before, a pre-labor or pre-functions file wiped
  those too. This also fixes the labor duplication.
- Merge-mode caveat: a skipped module is the *existing* module with that name, which may
  differ from the file's version; template links to fields it lacks are reported when the
  template is applied (existing behavior).
- `ImportResult` gained `warnings`. The success view lists labor and template counts and
  the warnings, and doesn't auto-close when there are warnings.
- Copy: the intro lists everything imported, says templates are reconnected to their
  modules and that quotes are never changed; Replace's description and confirmation say
  exactly what is deleted, that labor/functions/templates missing from older files are
  kept, and that drafts in a quote's workspace belong to the deleted modules and will no
  longer show (the workspace hides drafts whose module is missing).
- Known follow-up (not built): those hidden drafts stay in the quote's data after a
  Replace; nothing surfaces or cleans them up.
- Regression tests: "Data Export/Import Regression" (`data-import-regression.ts`, run
  with the stores over an in-memory `localStorage` from `memory-local-storage.ts`): round
  trip in replace and merge, links restored when the imported templates are applied,
  legacy `__index_N__` links, labor not duplicated, missing-module warnings, 1.0.0 files.
- The dialog's own styling (MD3 leftovers, title shown twice) is left for step 11.

## MD3 leftover cleanup (step 11) — planned, next

Assessed after step 10. Not built yet:
1. `components/shared/ModalDialog.tsx` uses a fixed `id="modal-title"` (duplicate IDs when
   dialogs stack) and doesn't trap focus.
2. `components/shared/ActionIconButton.tsx` passes its whole confirmation sentence as the
   `ConfirmDialog` *title* (e.g. the Functions list delete message becomes the heading);
   it needs a short title plus a message.
3. Toasts sit at `bottom-24`, spacing for fixed bottom bars that no longer exist. There
   are two toast paths: `NotificationToast` rendered directly in `app/templates/page.tsx`
   and `components/quotes/QuoteBuilderWorkspace.tsx`, and `notify()` / `NotificationHost`.
   Make them one.
4. Restyle only: `ModalDialog`, `ConfirmDialog`, `NotificationToast`, `AlertBanner`,
   `ClickTooltip`, `ActionIconButton`, `SaveTemplateModal`, `QuoteBuilderLoading`, one
   class each in `components/materials/PropertyForm.tsx` and
   `components/labor/LaborPropertyForm.tsx`, and `DataImporter` / `ThemeImporter` (they
   already look consistent; Import Data shows its title twice).
5. Delete the unused `components/shared/SearchFilterBar.tsx` and
   `components/ui/resizable-panel.tsx`.

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
   *(Done, with Labor; turned out to need a structural rebuild — see its section.
   Primitives were not restyled; see below.)*
6. **Navigation shell and Dashboard — style pass** *(done)* — apply the new tokens to the
   structural work already shipped in steps 1 and 3 (colors, type, spacing on the
   sidebar and the quote list/resume card). Does not include Quote Builder's visual
   language — that's step 7, a separate and larger piece of work, not a continuation of
   this pass.
7. **Quote Builder — visual language** *(done)* — apply new tokens to the `reopenLineItem`/
   nickname UI shipped in step 2, *and* build the sunken-bench/sealed-ledger spatial
   treatment (Gap #1 in the Quote Builder section) for the first time — this piece never
   existed in any structural form, so there's no earlier step it's "finishing." Build it
   once, directly on Foundations, since — per Sequencing strategy above — it doesn't
   decouple from styling.
8. **Module Editor — reskin + UX fixes** *(done)* — re-scoped before building (see its section):
   no chip editor, units engine, or restatement; the inline test panel is the main UX gain.
9. **Functions — reskin + safety/UX fixes** *(done)* (see "Functions and Templates").
10. **Templates — reskin + UX fixes; templates as module chains** *(done)* (see "Functions and
    Templates").
11. **MD3 leftover cleanup** — planned, next (see "MD3 leftover cleanup (step 11)").
12. **Data export/import includes templates** *(done, before step 11)* (see "Data
    export/import (step 12)").
13. **Module Editor — Simple** — on hold (see its section).
14. **Cost mix** — separate initiative, needs its own scoping for cost-attribution
    logic.
