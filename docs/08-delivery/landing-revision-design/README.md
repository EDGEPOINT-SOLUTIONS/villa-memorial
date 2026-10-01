# The home, re-visioned — `/`

**Captain's brief, 2026-10-02:** *"what if you make a one prompt that will really compare them
both, like make a prompt that will re vision our home page in landing page. and let's see which
of them produced a much better output"*

This is the record of that re-vision: the same product and the same truth, composed better.
The route, the links, the figures and the contact details are unchanged.

| | before (`c7ffd38`) | after |
|---|---|---|
| full page @ 1440 | **6692 px** | **4977 px** (−26%) |
| full page @ 390 | **9703 px** | **7919 px** (−18%) |
| screenshot weight @ 1440 | 2654 KB | 1507 KB |
| screenshot weight @ 390 | 1947 KB | 901 KB |
| bands | 7 | 6 |
| images on the page | 16 | 12 |
| the h1 | 76.4 px (a 1.5× "gateway type scale") | **35.2 px** (`--text-page-title`) |

Files: [`before-1440.png`](before-1440.png) · [`before-390.png`](before-390.png) ·
[`after-1440.png`](after-1440.png) · [`after-390.png`](after-390.png) — full-page captures of
`http://localhost:4004/`, production CSS, at 1440×900 and 390×844.

---

## What leads, and why

A family arriving at this page is not shopping. They are at-need, or they are planning ahead
for someone they love, and they arrive carrying a question. The page is composed in the order
those questions actually arrive, and **each band leads with exactly one dominant element** —
never a grid of equal boxes.

**1 · The opening — the words lead, the park's own gate supports.**
Eyebrow (`ISABELA CITY, BASILAN`) → the one headline at the ladder's own top step → a
≤25-word lead → the ONE action that matters at 3 a.m. (the 24/7 number, gold) with the plan
action beside it → three recorded facts under a hairline. The photograph is the client's own
picture of the park gate, at a 3:2 band-lead frame with a 22 rem ceiling, **beside** the words
it supports. Before, the same picture was a full-bleed 74 rem band of its own — a band whose
only content was a 1184 px image, which is the "unnecessary large imagery" the brief names.

**2 · Arrange it — the live cost builder leads.**
The builder is the only element on the page that answers *"what will this cost"* with the
office's own published figures: casket · preparation days · chapel, totalled live, then one
call and one link to the full builder. It is a working tool, not a picture of a working tool,
and it takes the band's lead column. The two chapel rooms support it with one photograph and
two honest lines each (`Fits about 120 people` is the schedule record, not copy).

**3 · The grounds — the client's own masterplan leads.**
This is the band where the before shot was worst: a 2×2 of four near-identical marketing tiles
beside a small map, with every figure — the only reason anyone reads the band — buried in a
panel underneath. Now the map is the lead at full column width with **every recorded plot
pinned at its own outline centroid**, and the four lot families read beside it as four priced
rows: name · area · **plots still open** · monthly. The open count is counted from the same pins
the map paints, so a row can never disagree with the picture above it, and the selected family's
full dossier (contract total, senior rate, six-year term) sits under, in a live region.

**4 · Plan ahead — a rate card, not five arches.**
Five rising tiers as five equal cells: name, the monthly that leads, **the same plan on the
sheet's yearly figure**, and **the tier's own lid line** — the thing that actually separates
Bronze 1 from Bronze 2 is printed, so the five cards are told apart by something real instead
of by their position. The long casket description and the senior rate sit behind one disclosure
per card, where there is room to read them.

**5 · The services — five scannable lines, and every line earns its row.**
Request-for-Quote only, no amount (the captain's minute 5). Each line is: the client's own
photograph at a 5.5 rem identification plate · the name · **the one-line description**
· one action. Both the photograph and the description come from the content the rest of the
product already owns — `lib/catalogue-imagery.ts` (the same picture `/services` shows for the
same line) and the services page document (the same sentence `/services` prints) — so a line is
never a bare label beside a button, and the home's copy cannot drift from the services page's.
One sample note for the whole band, the way `/services` carries it.

**6 · Contact — the form leads, the place supports.**
The enquiry form, the embedded map of the office's recorded address, both real phone lines, the
office address, and directions. The Google Maps key is read server-side and never reaches
client JS.

## What was cut, and why each cut is a decision

- **The 74 rem hero photograph band.** A picture is not a band. It now sits at a 3:2 / 22 rem
  frame beside the words it supports.
- **The four lot marketing tiles.** Four near-identical squares at a size that demoted the map;
  the plots behind them were illustrations, and the map is the client's own drawing.
- **The five rising arch shapes.** Decoration that fought the figures. A rate card is the
  familiar form for "five things at five prices".
- **The five service plates at tile size.** A row of five small dark pictures is noise; each
  line keeps its photograph as an identification plate instead.
- **The centred-everything rhythm.** Every band was centred, so nothing led. The heads are now
  the shared `SectionHead` shape — kicker, title, one action at the right — and each band has
  exactly one dominant element.
- **The 1.5× "gateway type scale"** (76.4 px rendered) and with it the last type above the
  ladder's top step. Hierarchy is weight, colour and space.

## Uniform section width (captain, 2026-10-02)

The brief's follow-up: *the 2nd, 5th and 6th sections must share the same content width as the
others.* Every band is a direct child of `.home`, no band/grid/inner panel declares a second
measure, and the only `max-width` left in the block bounds a **paragraph**, never a band's
content. Measured at 1440, all six bands are **1222 px at left 109**; at 390, all six are
**345 px at left 22**, and `document.scrollWidth === 390` — no sideways scroll.

`tests/unit/home-styles.test.ts` now pins this ("gives every band the SAME content width"), so
the next band that reaches for its own envelope fails the gate.

## The rules that are binding, made CSS and tests

- **Type ceiling.** The h1 rides `--text-page-title`; a figure is capped too — a tier's monthly
  is `--text-xl`, a lot row's is `--text-body`. No multiplier is declared in the block.
  `tests/unit/typography-system.test.ts` and the new `home-styles` case enforce it.
- **One envelope, one lead per band, hairlines and space instead of chrome.** Only the builder
  card and the contact place-card are surfaces, because they are forms.
- **The palette** is the approved sky + gold ramps. Gold is structure — the hairline, the
  selected lot's rule, the top tier's rule and label — plus the one gold action pair (the
  opening's call and its gold-outline partner). Gold never carries white ink.
- **Every picture is right-sized** through the shared `PublicImage` frame: the gate is a band
  lead (3:2, 22 rem), a room's plate 7 rem, a service line's plate 5.5 rem. Audited at both
  widths: no image renders wider than the derivative the browser picked.
- **1440 and 390 are both first-class.** At ≤40 rem the service rows become a deterministic
  two-line shape (plate + words, then the action on its own line) — flex wrapping had left the
  action beside the name on the rows whose description happened to be short and below it on the
  others — and the five rate cards re-flow to one price list instead of a two-up grid of tall
  cards. Focus rings, reduced motion and the entrance overlay are untouched.

## The move that is a fix, not a design choice

The re-vision removed the `.home-band-head*` rules with the home's own block. Those classes are
still rendered by `/contact`, `/gallery`, `/price-list`, `/facilities` and `/park`, so four
other public pages had silently lost their band-head title
(`tests/unit/contact-page-redesign.test.tsx` caught it). The grammar has been **moved out of the
home block** into the shared public grammar it now belongs to: a rule the home no longer renders
does not belong to the home, and the next home edit would otherwise take four pages down with it.

## Content homes (nothing here is authored in a view)

| what | where it comes from |
|---|---|
| every band's words, actions, kickers | the landing document, edited at `/staff/landing/home` |
| plan monthlies **and the yearly figure** | the pricing store (`planRateOf`) |
| the builder's options | the live catalogue joined to the 2026 sheets (`lib/home-model.ts`) |
| lot areas, contract totals, senior rates, the six-year term | the pricing store |
| map pins, each family's open count, the availability split | the plot records' own outlines + the live lot statuses |
| the two chapel rooms' capacity | the chapel schedule record |
| the five service photographs | `lib/catalogue-imagery.ts` (the one map) |
| the five service descriptions | the services page document (`lib/service-content.ts`) |
| the map embed URL | the recorded address, key read server-side |

No invented data, no new backend, no fabricated statistic. The route, the working links and the
real contact details are unchanged.
