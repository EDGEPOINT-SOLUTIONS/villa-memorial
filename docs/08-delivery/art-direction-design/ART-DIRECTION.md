# Art direction — Villa Memorial (binding)

> One page. Every screen is judged against it, and a change that contradicts it needs a
> decision, not a commit. The measured evidence behind each line is in
> [`README.md`](README.md); the guards that enforce it are named where they exist.

## The thesis

**A well-run funeral home's front office: quiet rooms, daylight, and one competent person
walking beside you.**

Not a marketplace. Not a dashboard. The visitor is either in the worst week of their life or
planning calmly for a distant one — and the design's job is to be *legible, warm and already
decided*, so they never have to make a design decision to get help.

## The two tests every screen must pass

1. **In three seconds, does the eye land on the one thing this person came for?**
2. **Would a 68-year-old on a mid-range Android, in a hospital corridor, get it?**

If a screen fails either, it is not finished — regardless of how it scores on anything else.

## The five non-negotiables

1. **One face, one ladder.** Inter, and the seven steps in `styles/tokens.css`. No second
   typeface, no off-ladder size, nothing below 12px. *Guarded: `typography-system.test.ts`.*
2. **One ramp per colour idea.** `--granite-*` structure · `--marble-*` warm ground ·
   `--sky-*` controls · `--gold-*` accent · status hues. A second name for an existing colour
   is a defect, not a synonym. *The `--brass-*` duplicate ramp was retired on this rule.*
3. **Blue is a control colour; white is the ground.** The brand blue lives on buttons, selected
   states, the call actions and the footer — never a page, section or table surface.
   *Guarded: `page-backgrounds.test.ts`.*
4. **Gold is ceremony and action — never data, never a surface.** Three legal uses: the
   ceremonial hairline, the eyebrow/kicker micro-label, and **one action per screen.** Decorative
   gold never carries text. *Guarded: `typography-system.test.ts`.*
5. **Honest states are the deliverable.** "Not recorded", "Price on request", "Illustration
   purposes only", "nothing was sent" — an invented figure is worse than a blank one.
   *Guarded: `kit/README.md` rules, `catalog-sources.test.ts`.*

## The kill list

Removed, and not to return without a written decision:

| Killed | Why |
|---|---|
| **Decorative gradients on public controls** | The client's president read the product as *"so noticeable that it's built by AI"*. Measured: the composition pass removed them from `.btn--accent`/`.btn--primary` and missed the three **call** controls, where they survived on 59 captures each. *Guarded: `composition-pass.test.tsx`.* |
| **Two names for one colour** | `--brass-300/400/500/600` were byte-identical to `--gold-300/400/500/700`. Nobody could know which to reach for. Collapsed; verified visually neutral (5,854 elements, 0 diffs). |
| **Internal vocabulary on public surfaces** | A public homepage tile labelled **"Lead"** — CRM language on a grieving family's screen. Now "Featured", which is also the honest word (`item.featured` is a staff choice, not a popularity claim). |
| **A route that only renders in dev** | `/price-list` shipped a production-only `HTTP 500` while sitting in the sitemap at `priority: 0.9`. *Guarded: `npm run smoke`.* |
| **A guard written as a hand-picked selector list** | This is *how* the call controls kept their sheen. Guard the role or the capability, and prove the guard fails against the previous revision. |
| **Appending a decision without deleting the old rule** | Two rules contradict each other about `.ag-hero` in `components.css` (the "type, not a box" rule vs. the card it was later wrapped in). The later append wins silently and the earlier comment becomes a lie. |
| **Amazon browse grammar outside `Decide`** | Retail grammar signals *shop and compare*. It belongs where browsing is genuinely deliberative — nowhere near the emergency path. |

## The page archetypes

Every route is one of six. A seventh needs a decision, not a new stylesheet.

| # | Archetype | The one job | Routes |
|---|---|---|---|
| 1 | **Arrival** | One promise, one action, call-first. Reachable by someone who has just been bereaved. | `/`, `/immediate-assistance`, `/services` + guides, `/facilities`, `/faq`, `/gallery`, `/memorials`, `/memorials/find`, `/map`, `/transport` |
| 2 | **Decide** | Browse, compare, price — the ONLY home for retail grammar (sticky refine rail, per-option counts, sort). | `/lots`, `/lots/[id]`, `/lots/price-list-2026`, `/products`, `/products/[sku]`, `/plans`, `/plans/[sku]`, `/price-list`, `/gallery`'s filters |
| 3 | **Answer** | ONE sentence answers the page; everything else is rows. The best writing in the product lives here. | `/client/*` (15 screens) and `/agent/*` (11 screens) — the family and agent portals |
| 4 | **Do** | A form flow with a commit and an honest confirmation. Nothing pretends to have been sent. | `/builder`, `/quote`, `/appointments`, `/contact`, `/cart`, `/checkout`, `/login`, `/register`, `/platform/sign-up` |
| 5 | **Read** | Prose, papers and legal text — the reading envelope, the largest type, the fewest boxes. | `/client/privacy`, `/orders/[number]`, the paper sheets (`components/paper/*`), `/staff/landing/[doc]` |
| 6 | **Work** | Dense operational truth: tables, figures, statuses. Optimised for a staff member on their fifth hour, not their first. | `/staff/*` (65) and `/platform/tenants` |

**The measure of a page is the archetype it declares.** An `Arrival` page that browses is wrong.
A `Work` screen that explains itself in prose is wrong. An `Answer` page that needs scrolling to
reach its sentence is wrong.

## Decision owners (not mine to change)

- **Brand name** — three names ship today ("Villa Funeraria" 7×, "Villa Memorial Park" 48×,
  bare "Villa Memorial" 179×), and one page shows two. Client-facing copy decision.
- **The public home's three-column anchored shell** — captain-approved and test-pinned
  (`landing-view.test.tsx`, `composition-pass.test.tsx`). **Measured, and it holds:** at 1440 the
  page is 4,996px, the middle column 790px wide × 4,213px, and both 272px rails are
  `position: sticky` with 731/811px of content — so the help card and the quick actions stay in
  view for the whole scroll. An earlier draft of this brief called the rails "dead space"; that
  was an unmeasured assertion and it was wrong. No change recommended.
- **`docs/02-architecture/design-system.md`** — platform-owned, still describes the retired Rails
  app and a serif type system, while `docs/README.md` §5 points readers to it as "the token rules".
  This is the single biggest reason each new session re-decides.
- **The 353 archived screenshots under `docs/08-delivery/**/shots/`** render a serif the product
  no longer uses. They are the input most reviews have used; they should be marked superseded.

## How to hold the line

A design change is done when: `npm run lint && npm run typecheck && npm test` pass,
`npm run build` passes, **`npm run smoke` returns 60/60**, and the guard for the rule you
touched *fails* against the revision before your fix.
