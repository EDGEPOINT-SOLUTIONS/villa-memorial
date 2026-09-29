# Immediate assistance — implementation record (F-01, 2026-09-18)

> **REMOVED 2026-09-29 (office, inbox 040).** The route
> `app/(public)/immediate-assistance/` was deleted and every pointer rewired: the
> phone bar's "Get help" now opens `/contact`, the guide pages' "Immediate
> assistance" outline action points at `/contact`, and the sitemap entry and the
> `PublicShell` closing-band exemption went with it. This document is the
> HISTORICAL design record of that screen — it describes what was built, not a
> live route.

**Route:** `/immediate-assistance` (`app/(public)/immediate-assistance/page.tsx`).
**Brief:** checklist F-01 — "Give the hardest moment its own screen: someone has just died
and a family member is on their phone at midnight."

## What the screen does, in the order the brief fixed

1. **The call.** An enormous `tel:` target (`.ia-call`, 4.5 rem tall, gold, display-size
   number) first on the page. Number, line label and location are read from the
   staff-editable landing content document (zone 01) through `listLandingContent()` — no
   number is typed into the page. A staff edit lands here on the next request, pinned by
   `tests/unit/immediate-assistance.test.tsx`.
2. **What to do right now.** Four numbered steps (`.ia-step`): call us · have these ready
   (short chips: full name, date of birth, where they are now, who decides for the family) ·
   we come to you · we handle the rest. No paragraph prose.
3. **Reassurance.** One line (`.ia-reassure`): "Nothing needs deciding tonight. One
   coordinator handles every arrangement with you."
4. **The alternatives, clearly secondary.** Where we are · the contact form · the family
   sign-in (`.ia-alt` cards).

Honest states: the landing document carries a phone label/number and a location and nothing
else — no street address, no office hours. Those are omitted rather than guessed, and the
24/7 claim is the staff-editable `contact.phoneLabel` printed verbatim. No chat, bot or
callback promise. No motion; one `h1`; tokens only; the call button's focus ring is navy so
it can never melt into the gold surface.

## Entry points (one per surface)

| Surface | Element | Render site |
|---|---|---|
| Desktop header utility row | `anchored-header__assist` chip (hidden below 75 rem) | `components/landing/site-header.tsx` |
| Phone bottom bar | `anchored-phonebar__btn--help` ("Get help") | `components/landing/phone-action-bar.tsx` |
| Home assistance card | `rail-call__assist` ("What to do right now →") | `components/landing/landing-view.tsx` (`RailPanel`) |
| Death-at-home / death-at-hospital / transport guides | the existing "Immediate assistance" buttons (re-pointed from `/contact`) | those route files |

The approved D3 phone bar now carries three targets; the addendum is recorded in
`docs/08-delivery/public-nav-design/README.md` §4. The rail card's number stays a one-tap
`tel:` link — the screen is one more door, never a detour before calling.

## Above-the-fold evidence (production build, `next start`)

Measured with the bounding rects of the rendered elements (`innerHeight` = viewport):

| Viewport | Phone number | First step (`.ia-step`) | Phone bar | Result |
|---|---|---|---|---|
| 1440 × 900 | 343 – 421 px | 592 – 745 px | hidden | number + step 1 above the fold |
| 390 × 844  | 351 – 379 px | 544 – 665 px | 779 – 844 px (3 targets, 118 × 48 px each) | number + step 1 above the fold, no horizontal scroll |

Lighthouse mobile against the production build: **Accessibility 100**, Best Practices 100,
SEO 92 (the two flagged items are repo-wide LLM/SEO hints, not this page).

## Shots

- `shots/immediate-assistance-1440.png` — 1440 × 900, top of the page.
- `shots/immediate-assistance-390.png` — 390 × 844, top of the page (three-target phone bar).

## Tests

- `tests/unit/immediate-assistance.test.tsx` — call-first order, document-driven number,
  staff-edit propagation, the four steps, reassurance, alternatives, no invented hours or
  second number, paragraph nesting, metadata.
- `tests/unit/reading-budget.test.tsx` — the page is in `PAGES`.
- `tests/unit/public-nav.test.tsx` + `tests/unit/landing-view.test.tsx` — the entry points.
- `tests/unit/seo.test.ts` — `PUBLIC_PAGES` now publishes `/immediate-assistance`.
