# Home rebuild — a new foundation, a new home, and the old home at /blog (2026-09-27)

**Brief:** *"Redesign this please, everything looks awful… the home page now will become 'blog' page
and I want you to make a new page for home that will be the best homepage… it should practice all
the things here [aitooltiphub.com/free-guides]… all these pages should have a new ui/ux design…
clean the whole folder for all the things that we didn't need… clean and ready for deployment."*

Decisions taken with the captain before any file changed: the current home **moves to `/blog`
verbatim**; the foundation is **rebuilt from scratch** rather than extended; and the cleanup is the
**safe tier** — stale render evidence plus only provably-dead code.

---

## 1 · The guide, and how it was read

`free-guides` is an index; the applicable guide is **`/ui-guide` — "Make It Human: Prompts to Fix AI
Generated UIs"**, whose thesis is the whole problem:

> *"AI generated UIs almost always share one problem. The AI makes design with no decisions in it.
> Everything gets equal weight, because the model has no reason to make one thing matter more than
> another."*

Both guides are client-rendered, so `web_fetch` returned only a `<title>`. They were rendered in
Chromium through the existing harness and the text extracted (kept for reference at
`.design-audit/guide-ui-guide.txt`). The seven prompts:

| # | Prompt | The move |
|---|---|---|
| 01 | Sharpen the Message | Rewrite generic copy; a plain-spoken promise; **one** accented phrase |
| 02 | Break the Symmetry | Asymmetric hero; one element breaks the grid |
| 03 | Build the Argument | A landing page argues in sequence; every section has ONE job |
| 04 | Pick the Winner | One item dominates by size, weight and space — not colour |
| 05 | Scale the Type | One clear scale with obvious jumps; one clear top |
| 06 | Give Color Meaning | The accent is an action, not decoration |
| 07 | Add a Signature | One memorable detail, applied only where it fits |

> **The UX guide (`/ux-guide`) is a different job.** Its four features — Magic Mouse (contextual
> help), Adaptive UI, Onboarding Agent, Smart Search — all call an LLM at runtime. This deployment is
> fixtures-only with no AI service or key, so none of them are buildable here. That is a product
> decision (which provider, whose key, what budget), not a design one, and it is **not** done.

---

## 2 · Cleanup: 161.5 MB recovered, measured before it was deleted

659 archived captures under `docs/08-delivery/**/{shots,before,after,media}/` were deleted —
`docs/` went from **166 MB to 4.5 MB**.

Checked before deleting, rather than trusting the label:

- **0** were embedded in any README (`![…](…)`), so no document rendered them inline;
- **nothing** under `docs/` is served at runtime (grepped the app for `docs/` asset paths);
- `docs/prototypes/villa-home-ui/` — the captain-approved prototype `AGENTS.md` pins the package
  page to — contains **no images** and is intact;
- they rendered a **serif** typeface the product had already stopped using, so they showed a
  product that no longer existed and were the input most reviews had been misled by.

~350 are still *named in prose* by the design records. Rather than leave 350 silent dangling
references, the retirement is recorded in the `docs/README.md` refresh log with the reason and the
recovery path (`git log --diff-filter=D`).

---

## 3 · The foundation, rebuilt

`styles/tokens.css` was replaced whole. What changed and why:

| | Before | Now | Prompt |
|---|---|---|---|
| Ground | `#ffffff` | warm bone `#faf7f2` | — (a cold grey reads institutional to a bereaved family) |
| Brand | sky blue `#3f97d1` | deep evergreen `#264a39` | 06 — the park *is* green; the client's own photographs are the brand |
| Accent | gold on buttons, badges, prices, borders | brass, three legal uses | 06 — an accent that is everywhere points at nothing |
| Type | Inter only | **TeX Gyre Bonum display + Inter UI** | 07 — one memorable detail |
| Ladder | 12/14/16/18/22/28/36 (steps ~1.1×) | 12/14/17/20/24/32/44, hero 44→72 | 05 — "obvious jumps… one clear top" |
| Spacing | space-5…9 = 1.5/2/3/4/6rem | 1.75/2.5/4/6/8rem | 03 — "generous vertical spacing" |

**The display serif is the client's own letterhead face.** `TeX Gyre Bonum` is already vendored for
the printed papers (`public/fonts/paper/`, GUST Font License) because the client's 2026 forms are set
in Bookman Old Style. Using it for display means the website and the service contract a family signs
speak in one voice — a real signature, and **zero new downloads**. AGENTS.md already anticipated a
second face ("Introducing an actual second face means updating `typography-system.test.ts` in the
same PR"), so this is the sanctioned path.

**The signature (P07) is the margin rule**: a short brass hairline at the left of a section kicker,
the way a printed document marks its own margin. It appears on section heads only — never the hero —
because a signature that shows up everywhere stops being one.

**The legacy bridge.** `components.css` carries ~5,500 references written against the old primitive
names (`--granite-*`, `--sky-*`, `--navy-*`, `--gold-*`). Rather than repaint 21k lines by hand,
each legacy name is redefined onto the new ramps in a clearly-marked block, so `--sky-600` now paints
evergreen. It is labelled as aliases, not decisions, with the new names to reach for — and it is
deleted when the last block is migrated.

---

## 4 · The new home

Route: `app/(public)/page.tsx` → `components/public/home-page.tsx` + the `/* HOME */` block at the
tail of `styles/components.css`. Each section carries its prompt in a comment, so the next reader can
check the work against the brief.

| Section | Prompt | What it does |
|---|---|---|
| Hero | 01 + 02 | *"Someone has died. Call us, and **we will carry it from here.**"* — a plain-spoken promise with ONE brass phrase. Words left, photograph right, and the credential card **overlapping the photo's corner** to break the grid. |
| Qualifying strip | 03 | *"For families in Isabela City, Basilan and across the province…"* — the right visitor knows immediately. |
| The fork | 03 + 04 | The page's real decision. **The urgent door wins** — bigger title, white card, brass edge — while "planning ahead" is a lighter rule-separated tier. |
| The park | 04 | **The one winner.** Largest band, photograph-led, the live map at full width. |
| What it feels like | 03 | One visual (the promise as a printed page, not a screenshot) + three short lines in the family portal's own voice. |
| The ask | — | **Inherited.** The home now renders inside `(public)`, so `PublicShell` supplies the same closing band as every other page — no second closing grammar. |

**Every number is derived, never authored:** the entry plan figure comes from
`planMonthlyPrice(planPricing, PLAN_TIERS[0].id)` and the lot figure is the cheapest monthly
installment any recorded product carries — both read from the pricing store at request time.

**Copy ownership, stated plainly.** The structural copy is route-local, exactly like
`/immediate-assistance` (whose content order is its contract and whose only editable value is the
phone number). Every FACT — phone, wordmark, addresses, the park's own story, both money figures —
is read from the documents. The hardcoded strings carry no client data, so nothing can go stale; the
follow-up is an editor so staff can reword them.

---

## 5 · `/blog` — the former home, verbatim

`app/blog/page.tsx` reproduces the previous home byte-for-byte: the three-column anchored shell, both
staff-editable rails, the plans-and-lots card grid, the tier × term board, the live park map and the
newsfeed. Nothing was trimmed in the move.

It sits **outside** `app/(public)/` on purpose: `LandingView` carries its own anchored header and
footer, so inside the group it would paint two of each.

> **Honest note for the next pass:** `/blog` is currently a storefront that happens to contain a
> newsfeed, not a blog. A real blog needs the `content.blog` posts as an article listing plus
> `/blog/[slug]` article pages. That change was deliberately not bundled into the home rebuild.

---

## 6 · Guards updated — each one a replaced decision, none weakened

Eight guards pinned decisions this rebuild deliberately replaced. Each was updated to pin the **new**
decision, and several were made **stronger**:

| Guard | Change | Stronger? |
|---|---|---|
| `typography-system` ladder | new seven steps (12/14/17/20/24/32/44) | — |
| `typography-system` display | asserts the clamp's **shape** + a 72px ceiling + that the hero out-ranks the ladder's top | ✅ no longer a retyped literal |
| `typography-system` typefaces | one face → **two faces, each with a job**, both self-hosted at real paths | ✅ now verifies the file exists |
| `typography-system` ink roles | hardcoded hexes → **resolves the `var()` chain** and checks the contrast promise on all four grounds | ✅ it can no longer pass while the ramp underneath changes |
| `typography-system` figure caps | 18/22/22 → 20/24/24 (the rule is unchanged: a figure must not out-shout its role) | — |
| `composition-pass` primary button | `--sky-300` → `--ever-700`; still flat, no gradient, no shadow | — |
| `page-backgrounds` grounds | "must be `#ffffff`" → "must come from the paper ramp, never a brand wash" | ✅ catches the real defect class |
| `page-backgrounds` footer | `--sky-200` → `--ever-900` **and** that it re-inks its subtree through the tokens | ✅ |
| `page-backgrounds` buttons | identity kept, ramp names updated | — |
| `hero-background` palette | 14 swatches repointed from the retired blues to the evergreen/paper/brass ramps | — |
| `seo` route table | home moved into the group; `/blog` is the one documented outside-the-group public page | — |
| `accessibility-craft` focus ring | hardcoded token names → asserts both resolve through tokens and are **different values** | ✅ |

---

## 7 · Two regressions this rebuild caused, and how they were caught

Recorded because both are instructive and neither was found by a unit test.

**1. Invisible footer links (1.4:1) — a one-token omission on every public page.**
The dark footer flips its surface by re-pointing the text tokens on
`.anchored-footer`, so twelve child colour rules re-ink at once. But it re-pointed only
`--color-text-primary` and `--color-text-accent` — leaving **eight links per page** painting
`--color-text-secondary`, a *dark* ink, on the deep ground. Measured 1.4:1, i.e. effectively
invisible. Caught by the 410-capture contrast sweep, **not** by any test.

Fixed by re-pointing every ink a footer child can reach (13.9 / 9.3 / 6.6 / 9.4 : 1, measured
against `#152c22`), plus the hairline tokens. Guarded by a new test that asserts **every** text role
is re-pointed *and* that the value it resolves to clears AA on the footer's ground — so a future
omission fails with the ratio in the message.

**2. The accent metric silently died.** The audit's accent probe held the *old* gold hexes, so after
the brass ramp landed it reported **zero accent elements on every route** — which read as a triumph
rather than a broken instrument. A metric that cannot fail is not a metric; the ramp list now says
so and must track `tokens.css`.

**Also fixed in the same pass, both from reading the first render:** the park band's copy was
vertically centred against a much taller media column (a dead half-screen above the heading — now
`align-items: start`), and the live map was a ~380px postage stamp whose plot labels could not paint
(now full band width at a 34rem minimum, which is the height the label-density rule needs).

---

## 8 · The 80% scale, and two bugs it exposed

**The request:** *"I want the whole page to look like how it looks look like when you minimize it
at 80%."*

**What 80% zoom actually is — measured, not assumed.** The page was captured at a true 80% (viewport
1800 CSS px, device pixel ratio 0.8, which is what a 1440px window reports at 80%). The result:
**not one CSS value changes.** The `h1` is still `72px` in CSS and the root is still `16px`. Only the
window's CSS width changes, from 1440 to 1800 — so the same type occupies a smaller *fraction* of the
screen.

**So the faithful implementation is one declaration**, in `styles/base.css`:

```css
html { font-size: 80%; }
```

Because every type, space and layout token in this product is rem-based, this reproduces **both**
halves of the zoom in a 1440px window, and it was verified to match the reference exactly:

| | True 80% zoom | This build |
|---|---|---|
| `h1` rendered | 72 CSS × 0.8 = **57.6px** | **57.6px** |
| container | 99rem × 16 = 1584 CSS × 0.8 = **1267px** | **1267px** |

The container's *fraction of the window* is identical (88%), which is the half a naive "make the text
smaller" edit always gets wrong. Breakpoints are untouched: `em`/`rem` in a media query resolve
against the browser's initial font size, not this one, so `@media (max-width: 48rem)` is still 768px.
The printed-paper layer is in `pt` and unaffected.

**The floor is pinned, and the cost is stated.** At a 12.8px root the two smallest rungs would fall
to 9.6px and 11.2px — under this product's hard 12px floor, on a site read by older people. They are
therefore declared in **absolute px** (`--text-xs: 12px`, `--text-sm: 13px`) and do not scale.
Rendered ladder: **12 · 13 · 13.6 · 16 · 19.2 · 25.6 · 35.2**, hero 35.2 → 57.6.
The unavoidable cost: micro/caption/body are now 12/13/13.6, so the small tier is compressed — there
is only 1.6px of room between them. If the small tier matters more than the scale, raise the root to
90%; that is the one knob.

**Bug 1 — the map covered the navigation bar.** `.anchored-header` is `position: sticky; z-index: 40`.
Leaflet paints its internal panes at z-index **400** (overlay), 600 (marker), 700 (popup) and **1000**
(its control corners). A static `.geo-map` creates no stacking context, so those numbers escaped into
the page's and won. Fixed with `isolation: isolate; position: relative; z-index: 0` on `.geo-map` —
one rule for every map in the product (the home band, `/map`, the staff property explorer, the lot
pages), which keeps Leaflet's internal order intact while the whole map sits at a single level under
the header.

Verified by **hit-testing rather than z-index arithmetic**: scroll the map under the header, then ask
the document what is actually on top at three points inside the header.

```
/      header z=40 sticky   map z=0 isolation=isolate   overlaps=true
       probe (360,27) -> nav.anchored-header__nav   header=true map=false
       => PASS: the header is on top at every probe
/map   => PASS        /blog  => PASS
```

**Bug 2 — `<sup>` broke the 12px floor without a single declared size.** The stylesheet gate cannot
see `sup`: the browser's own `font-size: smaller` decides (0.833em of the parent). At the old 17px
body step that computed 14.2px and nothing noticed; at the shipped 13.6px step the same rule computes
**11.33px** — measured on `/products`, on the footnote asterisk. `base.css` now pins `sup, sub` to
`--text-xs`, with a guard asserting the declaration exists and that it never says `smaller`.

---

## 9 · "Where are our blogs?" — two gaps, and the weight behind them

> **Later change (captain, 2026-09-27): the home's blog band was REMOVED.** This section records why
> it was added and stays as written, but the band no longer renders — see
> `docs/08-delivery/portal-restyle/README.md` §16. The nav and footer links described below are
> untouched, so `/blog` is still reachable from every public page; only the home's reprint of three
> posts is gone.

Asked after the rebuild shipped. The answer was uncomfortable: the blog existed but **nobody could
reach it**, and the home said nothing about it.

**Gap 1 (mine): `/blog` was in the sitemap and linked from nowhere.** No nav entry, no footer entry.
A route that only a crawler can find is not published, it is hidden. It is now the **first item in
the "Explore more" menu** ("News from the park") and a row in the footer's Explore column — so it is
reachable from every public page. Verified by counting live `/blog` anchors per route: **3 on the
home** (header, the band's "See all news", footer) and **2 on every other public page**.

**Gap 2 (mine): the rebuilt home dropped the newsfeed entirely.** The old home carried "News from the
park"; the new one argued its case and stopped. It is back as a band that obeys the same prompts —
the newest post leads, the next two sit in a lighter tier (P04), and a post with no media renders
text-only rather than borrowing a picture. `content.blog` is already staff-editable, so the band
cannot go stale.

**What the posts actually are.** They are newsfeed cards — `caption · media[] · link`, no title and
no body — not articles. So there are no article pages to build, and inventing bodies would be
fabrication. A real `/blog` with `/blog/[slug]` needs article bodies authored first; that is content
work, not code.

**Then the band exposed a real regression, and fixing it found a bigger one.**

| | requested images |
|---|---|
| The home right after the news band | **7,494 KB** |
| …after routing post media through `libraryThumb()`/`libraryThumbSet()` | 2,827 KB |
| …after the masterplan's WebP derivative | **706 KB** |

The composition pass had measured the home at **1,371 KB**; the first cut of the news band served the
library's *print-sized* lot tiles raw (2.3–2.5 MB each) and pushed it to 7,494 KB — the exact defect
that pass fixed. The fix is the rule that already existed in the old newsfeed
(`components/landing/landing-view.tsx`), and `ProductCard`'s `photo` object.

**The last 2.3 MB was the client's masterplan.** `public/media/Park map.png` is 2,331 KB and 82% of
the home's remaining bytes. It could not simply be resized: `lib/park-3d/masterplan.ts` records the
plan as **1254 × 1254** and every plot coordinate is authored in that pixel space
(`MASTERPLAN_PX`, `pxToWorld`, `pxPathToWorld`), so a resize would silently move every plot. So
`scripts/build-park-map-derivative.mjs` re-encodes it as WebP **at the identical 1254 × 1254** —
2,331 KB → **209 KB (91% off)** — and asserts the dimensions match.

The swap happens at **display time** (`parkMapImage()` in `lib/media.ts`, applied where the canvas
gets its URL), *not* in the park record: that field is part of the 3D coordinate contract
(`tests/unit/park-3d-coords.test.ts` pins it) and AGENTS.md says the masterplan is not to be swapped.
Verified on `/map`: the overlay's `naturalWidth` is still **1254×1254** and **182 plots** still bind.

---

## 10 · The three named pages, and why they didn't match

The brief named `/services`, `/plans` and `/map`. Measured before touching them, they disagreed with
each other and with the home in three separate ways — all of them *scope* failures of the kind this
whole record is about.

**Finding 1 — the signature existed on exactly one page.** The margin rule (P07) lived on the home's
private `.home-kicker`. Every other public page had **no signature at all**, so eleven pages read as
one design and the home as another. The rule now lives on the shared primitive —
`.section-head__kicker::before` — which means the 31 `SectionHead` call sites across the public site
inherit it at once. The home simply uses the same class; its private class and span are deleted.

Coverage, measured: **11 of 12 public routes** now paint the rule (`/` 4, `/price-list` 5,
`/services` 3, `/products` 3, `/gallery` 3, `/facilities` 2, `/memorials` 2, `/contact` 1,
`/faq` 1, `/map` 1, `/plans` 1). The exception is **`/lots`**, whose heads use the composition
pass's pinned `.band-head` grammar (group name · real count · one action) rather than a section
kicker — a deliberate different device on the surface the brief designates for retail grammar.

**Finding 2 — one heading, two roles.** `.public-hero__title` is pinned by the role map to the
**page-title** step (35.2px), with its own note: *"An interior opening is a PAGE title, not the
home's display hero… the captain's 'no oversizing'."* But `/services` was **also** matched by a
legacy `.sv-page h1 { font-size: var(--text-hero) }` — written before `PublicHero` existed — so that
one page opened a full rung above the other nine, at 57.6px. The override is **deleted**, and
`.sv-page h1` is out of the guard's hero role group.

`/map` had the same disagreement from the other direction: it renders a bespoke `.hero-premium`
opening, and `.hero-premium__title` carries the **hero** role (right for `/plans/[sku]`, wrong here).

Result — **every public page now opens on the same rung**:

```
/services 35.2  /plans 35.2  /map 35.2  /products 35.2  /lots 35.2
/price-list 35.2  /gallery 35.2  /facilities 35.2  /faq 35.2  /memorials 35.2
```

`/map` is brought down by a **page-scoped** rule (`.park-hero .hero-premium__title`) rather than by
changing the shared class, because `.plans/[sku]` legitimately uses the hero rung. That override is
honest debt, and the comment says so: the real fix is migrating the park page's bespoke opening onto
`PublicHero variant="interior"`, which deletes the override and the legacy family with it.

**Finding 3 — `/plans` had no section head worth the name.** Its single `SectionHead` carried a
title and nothing else — no kicker (so no signature) and no lead. It now has both. The page's
structure is otherwise untouched: `AGENTS.md` pins its five printed card checklists and its height
ceiling, so this is an addition, not a restructure.

**One thing I did NOT change, and it is a real question.** Brass now means two different things:
on the home it is **the call** ("Call 0917 617 8489"), and on the catalogue pages it is **the
per-item action** ("Request a quote", "Add to cart") while the call is the evergreen primary. That
second one is the captain-approved 3-rung CTA grammar (`btn--primary` page commitment · `btn--accent`
per item · `btn--secondary`), so I left it. But prompt 06 says to reserve the accent for *the one
action you most want people to take*, and for a funeral home that action is the call. **Making brass
mean "call the office" everywhere — and demoting per-item requests to the secondary rung — is a
captain decision, not mine.**

**Housekeeping:** `.design-audit/**` is now eslint-ignored. It is gitignored scratch output, and
linting it only produced warnings about throwaway probes — which is how a team learns to ignore its
own lint output. The real harness in `scripts/design-audit/` is still linted.

---

## 11 · Evidence

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npm test` | **228 files, 2,656 tests pass** |
| `npm run build` | compiled successfully |
| `npm run smoke` | **61 of 61 advertised routes render** |
| Consistent opening rung | **10 of 10** public pages at 35.2px (was 8 at 35.2, `/services` at 57.6, `/map` at 57.6) |
| The signature (margin rule) | **11 of 12** public routes (was: the home only) |
| Full audit, 208 routes × 2 viewports (416 captures) | **0 routes failed to render** · **0** decorative gradients on interactive elements · **0** elements under the 12px floor · **0** multiple/missing `h1` · **0** images without `alt` · **1** horizontal overflow (a phone document page, pre-existing) · contrast flags **20, ALL on gradient/photo surfaces the probe cannot resolve — 0 genuine** |
| `/` image weight | **706 KB** (7,494 KB at the start of the blog round) |
| `/` | HTTP 200 · one `h1` at 57.6px · 0px overflow · 3,563px tall |
| `docs/` | 166 MB → **4.5 MB** |
| Home CSS block | 22 font-sizes, **0** off-ladder · **0** gradients · **0** raw hex · **0** `!important` |

Captures: `.design-audit/home/home-1440.png`, `home-1440-full.jpg`, `home-390.png`,
`blog-1440.png`; the full sweep's summary is `.design-audit/summary.md`, and the renders copied
into this record are `home-1440-full.jpg`, `home-390.png`, `blog-1440.png`.

---

## 9 · What remains

1. **`/services`, `/plans`, `/map`** — the three pages named in the brief, relocated onto the same
   language. The foundation already lifts them (they are visibly different above); they still need
   their own asymmetric heroes, winners and margin-rule rhythm.
2. **Dead CSS/components** — the second half of the cleanup: measure which of the 2,871 selectors in
   `components.css` are still referenced, and delete the rest with evidence.
3. **The legacy token bridge** — migrate the remaining `--sky-*`/`--granite-*` references onto the new
   names and delete the aliases.
4. **`/blog` as a real blog** — article listing + `/blog/[slug]`.
5. **The home's copy editor** — so staff can reword the route-local strings.
6. **The UX guide's four AI features** — blocked on an AI-service decision, not on design.
