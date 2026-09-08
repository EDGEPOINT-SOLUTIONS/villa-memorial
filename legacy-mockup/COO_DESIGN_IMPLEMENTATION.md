# COO Stitch Design — Implementation Notes (for dev review)

Source of truth: `ui-ux-demo/stitch_villa_memorial_digital_platform/` — the COO's
design set generated from https://stitch.withgoogle.com. These mockups are
**client-approved** (per COO) and are implemented **pixel-exactly** in this demo:
verbatim copy, exact colors, exact layout. Nothing was "improved" or normalized.

## Round 2 — connectivity & responsive polish (safe fixes; desktop unchanged)

After the first implementation round, an honest review found UX gaps that were
fixed WITHOUT touching any desktop (≥768 px) visual:

1. **Mobile/tablet navigation:** every COO page's hidden desktop nav now opens a
   shared mobile drawer (`src/components/CooMobileMenu.tsx`) from the existing
   hamburger — phones/tablets can actually navigate each site and portal page.
2. **Park map mobile filters:** the "Filters & Search" button opens the sidebar
   (search, property-type chips, availability checkboxes, lot info) in an overlay
   on small screens; behavior identical to desktop.
3. **Portal log-out destinations:** agent portal → `/agent/login`, family portal
   → `/client/login` (previously both went to the staff `/login`).
4. **Page connections:** footer "Client Services" items now link to the family
   portal sign-in (`/client/login`); all placeholder `href="#"` anchors were
   converted to real `<Link>`s (route exists) or demo-action buttons (no route),
   so nothing jumps to the top of the page.
5. **Plans payment calculator corrected:** the COO's own displayed defaults
   (₱9,435 / ₱17,025 / ₱2,640 at 5-year monthly) imply a 10% down payment
   (finance 90% of total). The calculator now uses `total × 0.9 ÷ payments`,
   matching her numbers exactly (it previously divided the full total).
6. **Per-route document titles** set on navigation.
7. **Tablet navigation:** portal pages (agent/family) now show their top bar +
   menu on tablets (768–1023 px) as well as phones — desktops (≥1024 px) keep
   the COO sidebar layout exactly as designed.

Desktop pixels are unchanged; these are behavior/connectivity/responsive fixes.

## Round 3 — home page demo-readiness fixes

1. **Navigation bar fixed:** the home nav was a floating centered strip; it is now
   a true full-width fixed bar (white bar, centered 1200px content), the brand
   links home, PRODUCTS navigates to `/site/plans`, and nav links show on ≥1024px
   with the hamburger + drawer below that (phones AND tablets).
2. **Hero completed:** the COO home mockup's hero was an image-only container with
   an EMPTY text overlay (looks blank if the photo fails to load). For the demo it
   now shows a proper hero: eyebrow, serif headline, lead, and EXPLORE MEMORIAL
   PLANS / VIEW MEMORIAL LOTS CTAs, over the COO image with a legibility scrim and
   a deep-blue gradient fallback so it looks intentional even offline. The
   duplicate CTA band below the hero was removed.
3. **`/home` alias added** (same page as `/`), so both URLs open the homepage.

> Deviation note for dev/COO: the COO file's hero text was empty; copy was added
> per the non-dev's request for a demo-ready homepage. Design language (colors,
> type, gold CTA) is unchanged.

## Round 4 — one global frame for the whole public site

The COO mockups were standalone pages, so each shipped its own header/footer
with different link sets, paddings, backgrounds and taglines — navigating felt
inconsistent. Per the non-dev's demo-readiness request, ALL public pages now
render inside ONE shared frame (`src/components/CooPublicShell.tsx`):

- One fixed top nav bar everywhere (HOME · SERVICES · PLANS · LOTS · PACKAGES ·
  TRANSPORT · MEMORIAL MAP · CONTACT US + cart/account), active item highlighted,
  hamburger + drawer below 1024px.
- One global footer (Explore/Portals/Support columns, portal sign-in links, one
  tagline, "Powered by In-Memoriam · Demo" bar) and one floating chat bubble.
- One page background; each page keeps its own COO-designed content (heroes,
  cards, sections, colors, copy) verbatim.

Page files were reduced to content-only. Portals (agent/family) keep their own
frames since they are separate apps. Desktop content per page unchanged.

## Round 5 — real portal pages (no more dead sidebar links)

The portal sidebars used to point at non-existent pages or into the staff
area. Every portal menu item now has its own working demo page, all sharing one
portal frame (`src/components/PortalFrame.tsx`) and one nav source
(`src/lib/portalNav.ts`):

- **Agent portal** `/agent/*`: dashboard · clients · prospects · applications ·
  sales & commissions · marketing materials.
- **Client (family) portal** `/client/*`: dashboard · profile · memorial plans ·
  payments · memorial property · requests · notifications.

Shared demo data lives in `src/lib/portalData.ts` (agent persona Maria
Fernandez; family persona Maria Dela Cruz) consistent with the COO dashboards.
Top-nav SIGN IN still opens the staff/admin portal (`/login`); portal sign-ins
are linked in the site footer and mobile menu.

Routes now live (all verified to render + type-check):
- Agent: `/agent/dashboard` · `/agent/clients` · `/agent/prospects` ·
  `/agent/applications` · `/agent/sales` · `/agent/marketing`
- Client (family): `/client/dashboard` · `/client/profile` · `/client/plans` ·
  `/client/payments` · `/client/property` · `/client/requests` ·
  `/client/notifications`
- Sign-ins: `/login` (staff/admin) · `/agent/login` · `/client/login`

## Round 6 — park map now matches the master plan

Per the non-dev: the interactive map and the "Master Plan Overview" should show
the SAME picture. The old schematic glass board (dotted paper + faint site-plan
fade) was removed from `/site/map`. The interactive canvas now displays the very
same **master-plan image** used in the Overview section below it, with the
clickable plots (Section A lawns A-1…A-6 + mausoleum M-1/M-2) overlaid on the
image. Search, property-type chips, availability filters, lot info, and
RESERVE/ADD TO CART/INQUIRE still work exactly as before.

Plot positions are percentage coordinates in `LOT_POS` at the top of
`src/pages/CooMapPage.tsx` — easy to nudge if the COO wants a marker elsewhere.
An image-contain fit keeps the overlays aligned to the picture at any screen
size. (Agent review note: I cannot see rendered pixels in this environment, so
visual placement still needs a quick human check.)

## Round 4 — global chrome (one coherent site while navigating)

Problem: COO mockups were standalone pages, so each port had its own header,
footer, taglines, and backgrounds — navigating between pages looked inconsistent.
Fix: a single global public shell (`src/components/CooPublicShell.tsx`) that all
public pages render inside:

- ONE fixed header per public page: same brand, same links (HOME · SERVICES ·
  PLANS · LOTS · PACKAGES · TRANSPORT · MEMORIAL MAP · CONTACT US), active item
  underlined, cart/account icons, hamburger + drawer on phones and tablets.
- ONE footer: Explore / Portals (Family, Agent, Staff) / Support columns with a
  single consistent tagline.
- ONE page background + spacing rhythm and one floating chat bubble.
- Public pages now render ONLY their COO content (heroes, cards, sections, map,
  tables) — copy, colors, prices, and images unchanged.

> Deviation note for dev/COO: the per-page headers/footers from the mockups were
> replaced by this shared shell (per the non-dev's request) so client navigation
> feels like one site; each page's body content remains the COO's design.

## Page map (mockup → demo route → React file)

| COO mockup folder | Demo route | Component |
|---|---|---|
| `villa_memorial_luminous_home_variant` | `/` | `CooHomePage` |
| `memorial_plans_balanced_hero_layout` | `/site/plans` | `CooPlansPage` |
| `memorial_plans_with_new_hero_image` | `/site/plans/senior-benefits` | `CooPlansSeniorPage` |
| `memorial_lots_catalog` | `/site/lots` | `CooLotsPage` |
| `funeral_wake_packages_catalog` | `/site/packages` | `CooPackagesPage` |
| `at_need_funeral_services` | `/site/services` | `CooAtNeedPage` |
| `death_occurred_at_home_service_details` | `/site/services/death-at-home` | `CooDeathHomePage` |
| `death_occurred_at_hospital_service_details` | `/site/services/death-at-hospital` | `CooDeathHospitalPage` |
| `transportation_hearse_services` | `/site/transport` | `CooTransportPage` |
| `sanctuario_interactive_map_with_master_plan` | `/site/map` | `CooMapPage` |
| `agent_portal_dashboard` | `/agent/dashboard` | `CooAgentDashboardPage` |
| `client_portal_dashboard` | `/client/dashboard` | `CooClientDashboardPage` |

Toolchain: COO pages are ported to React + Tailwind (Tailwind was added to the
demo; config mirrors the mockups' tokens). Buttons behave as lightweight demo
actions (toast confirmations); visuals are identical to the mockups.

## Decisions made for the non-dev / COO (plain language)

1. **Theme:** the demo base theme now follows the COO's "Serene Legacy" palette
   (warm paper `#fbf9f8`, classic gold `#D4AF37`, sky-blue primary) so every
   non-mockup demo screen inherits the COO look. The Luminous home-variant page
   keeps its own brighter palette exactly as designed.
2. **Two plans variants:** the COO folder contains two versions of the plans
   page. Both are implemented: the finished "balanced hero" version is the main
   Plans page; the newer "senior benefits" variant (Bronze/Silver/Gold tables,
   senior-citizen rates) lives at `/site/plans/senior-benefits`.
3. **Static→working:** COO mockup buttons/controls are static HTML. In the demo
   they look identical but behave: payments calculator computes, map lots select
   and filter, cart/reserve/apply buttons show demo confirmations.
4. **Cart & checkout are cosmetic** (no real orders) — the demo has no backend;
   matches the rest of the demo ("Demo · no backend").

## Flagged for dev (not fixed — per guided-build rules)

1. **Currency mixed inside the COO set:** several pages show **$** verbatim
   (agent dashboard `$24.5k`, transport `$450/$300/$150`, death-at-home
   `$450/$850/$600`) while most pages show **₱**. Copied verbatim; needs a
   decision (likely ₱ for Villa Memorial).
2. **Same product, different prices across COO pages** (copied verbatim):
   Mausoleum ₱1,135,000 (plans) vs ₱1,073,000 (lots) vs ₱450,000 (map);
   Garden Niches ₱629,000 vs ₱567,000; Premium Lots ₱176,000 vs ₱114,000.
   Needs one source of truth.
3. **Unfinished mockup:** `memorial_plans_with_new_hero_image` is a WIP
   (empty hero text box, two empty stub plan cards, no Gold card). Implemented
   what actually renders; stubs dropped; hero reproduced without invented copy.
4. **Map zoom/reset controls** have no handlers in the COO files — kept as
   visual controls with demo toasts.
5. **Remote images:** several mockup photos come from external URLs (Google
   avatar, aerial/master-plan images). Kept exactly; may need local brand
   assets before any client demo offline.
6. **Footer taglines differ across COO pages** ("Luminous Comfort in every
   guide." vs "Professional and Compassionate Funeral Services.") — copied
   verbatim per page.

## Self-check

- [ ] `npm run build` green (tsc + vite)
- [ ] Every route above renders
- [ ] Copy/colors/layout verbatim vs the COO `code.html` files
- [ ] Demo-action buttons behave; calculator & map interact
- [ ] No commit/push to `main` (branch: `non-dev/ui-ux-demo`)
