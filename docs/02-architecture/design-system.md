# Design System

> Dignified, calm, professional — per product-vision principle #4 ("avoid generic-ERP feel").
> Implemented as vanilla CSS design tokens + BEM-lite components. No CSS framework.
>
> **Asset mechanics:** the layout's `<%= stylesheet_link_tag :app %>` (Propshaft ≥ 1.0) links
> every `.css` file under `app/assets/**` in alphabetical order with fingerprinted URLs.
> Propshaft does NOT inline `@import` — never use it.

## Files (`app/assets/stylesheets/`)

| File (load order) | Purpose |
|---|---|
| `application.css` | Manifest notes only — contains no rules. |
| `base.css` | Reset + element defaults (serif headings, form elements, focus rings, `.container`, a11y helpers). |
| `components.css` | Reusable classes: buttons, cards, fields, tables, badges, alerts, empty states, memorial primitives, auth shells, app shell/sidebar. |
| `tokens.css` | All design decisions as `:root` custom properties: color primitives + semantic roles, type scale, spacing, radii, shadows, motion. **Single source of truth — must stay pure variables.** |
| `utilities.css` | One-off single-purpose helpers. Use sparingly. |

Effective load order is alphabetical (`application → base → components → tokens → utilities`).
This is safe because `tokens.css` defines only custom properties, which resolve at
computed-value time regardless of sheet order. If you add a file whose order matters,
prefix its name deliberately (e.g. `10-base.css`) or switch the layout to an explicit list.

## Design direction

- **Palette** — "granite" neutral scale (cool slate) for structure and text; warm "marble"
  backgrounds so screens don't feel clinical; a single restrained **brass** accent reserved for
  focus states and ceremonial moments (memorial pages, dedications). Status hues (sage/clay/amber)
  are desaturated.
- **Typography** — serif stack (Iowan/Palatino/Georgia fallbacks) for headings and memorial names;
  system sans for operational UI. Scale runs `--text-xs` (12px) to `--text-3xl` (36px).
- **Elevation** — whisper-subtle shadows ("paper on marble"); borders carry most separation.
- **Motion** — 120–200ms ease-out; fully disabled under `prefers-reduced-motion`.

## Consumption rules

1. **Never hard-code raw values** in views/components — always reference a token:
   ```css
   /* bad */  color: #434c55;
   /* good */ color: var(--color-text-secondary);
   ```
2. If a needed semantic role doesn't exist, add it to `tokens.css` first, then consume it.
3. New repeating UI pattern → new component class in `components.css`
   (`.block__element--modifier`), documented there.
4. Utilities are for layout nudges only; anything used in ≥3 places should become a component.

## Component inventory

Buttons: `.btn` + `--primary | --secondary | --ghost | --danger | --accent`, sizes `--sm/--lg`.
Cards: `.card` with `__header/__body/__footer`. Forms: `.field`, `.input/.select/.textarea`,
`.field__hint/__error`, `.checkbox`. Tables: `.table-wrapper` > `.table` (+ `.table__numeric`).
Status: `.badge--{neutral,success,warning,danger,info,accent}`. Feedback: `.alert--{...}`.
Scaffolding: `.page-header__eyebrow/__actions`, `.page-section`, `.empty-state`.
Auth screens: `.auth-shell` > `.auth-card` (with `__brand`/`__footer`) — centered card shell for
sign-in and tenant sign-up (see `sessions/new.html.erb`, `signups/new.html.erb`).
App shell: `.app-shell` (sidebar + content grid) with `.app-sidebar__brand/__eyebrow/__title/
__nav/__section/__label/__link (--active)/__footer` and content column `.app-main`. Inverse-surface
sidebar (granite-900) with the brass accent marking the active link; ghost button in the footer is
recolored for the inverse surface. Collapses to a horizontal top bar below 48rem. Used by
`layouts/staff.html.erb` and `layouts/platform.html.erb` via the shared partial
`layouts/_app_shell.html.erb`; previewed in `/styleguide`.
Memorial-specific: `.life-dates` (serif life-dates line), `.ornament-rule` (brass fade rule),
`.btn--accent`.

## Tenant theming (future)

Because every visual decision flows through `:root` custom properties in `tokens.css`,
per-tenant theming can later be delivered by overriding tokens (e.g., a tenant-scoped
`data-tenant` attribute or injected stylesheet) without touching components. Don't pre-build this;
just keep rule #1 above honest.
