# Sanctuario Memorial Park — interactive 3D experience (build spec)

Status: specification captured 2026-09-16 from the captain's brief; not yet built.
Owner of the intent: the captain. Implementer: a crewmate task in the villa-memorial repo.
Delivery: direct-PR (no validation pipeline), one PR per phase.

---

## 0. THE ANTI-HALLUCINATION CONTRACT (read this first, it is binding)

An implementing model must never invent facts about this property. Specifically:

1. **The masterplan is the only spatial source of truth.** The reference image is
   `public/media/Park map.png` in this repository (original preserved at
   `data/villa-memorial-media-originals/VILLA MEMORIAL PROJECT 2026/VILLA MEMORIAL
   PROJECT 2026/CLIENT DOCS VILLA MEMORIA/Website Proposed Images/Park map.png`).
   Never invent a section, road, building, gate, feature, or landmark that is not on it.
2. **Never invent numbers.** No invented lot counts, lot numbers, dimensions, areas,
   prices, statuses, owner names, or coordinates presented as fact. Where the client has
   not supplied inventory, generate it from a single configurable module and label it
   plainly as placeholder data (both in code comments and in the PR description).
   Display prices as "Contact for pricing" unless a real, supplied figure exists.
3. **Geometry from an illustration is approximate by definition.** Normalize everything
   into one configurable coordinate system (`siteWidth = 100` units, proportions preserved
   from the image). Never claim survey, CAD, or legal accuracy. Every derived dimension
   lives in one place so survey/CAD/GIS data can replace it later.
4. **State assumptions explicitly.** Maintain an `ASSUMPTIONS` list (in this file or a
   sibling `docs/` note) naming every value that was chosen rather than measured, and keep
   each one configurable. No silent assumptions.
5. **No fake interactivity.** Lots must be real 3D objects with real IDs, picked by real
   raycasting — never invisible HTML hotspots over a flat image.
6. **Evidence, not claims.** Do not report a feature as working without having run it and
   checked it against the QC list below with the development masterplan overlay on.
7. **Do not fabricate client copy.** The only supplied copy is: the park name, location,
   tagline, the legend labels, the section labels on the plan, and the repo's existing
   canonical copy. Everything else is either omitted or clearly marked placeholder.
8. **Do not touch the existing property map.** The current 2D map page
   (`/map`, `components/park-maps-view.tsx`, `components/parks-canvas.tsx`,
   `lib/park-maps.ts`, `lib/fixtures/property/*`) and its editor stay exactly as they are.
   The 3D experience is additive.
9. If a decision is genuinely impossible from the supplied reference, do not guess
   precisely: make it a clearly-named configurable parameter and say so. Ask firstmate
   only when the choice changes the product's meaning.

---

## 1. Project

- Name: **SANCTUARIO MEMORIAL PARK**
- Location: **Begang, Isabela City, Basilan, Philippines**
- Tagline: **"A Sacred Place. A Lasting Legacy."**
- Purpose: a memorial park where families can virtually explore the property, understand
  the layout, walk the grounds, inspect available burial lots, and select a lot for a
  loved one. It must feel peaceful, respectful, premium, realistic, and emotionally
  appropriate — a tranquil architectural visualization, never a horror or combat game.
- Emotional contract: every interaction must read CALM, RESPECTFUL, DIGNIFIED, PEACEFUL,
  CLEAR, TRUSTWORTHY, PREMIUM. The user should feel "I am peacefully visiting the memorial
  park", not "I am playing a cemetery game".

## 2. Masterplan reading (from the supplied image)

Top-down masterplan with a rendered, slightly angled presentation. Recognized regions, in
the image, with their legend colours:

| Region | Position on the plan | Legend colour |
|---|---|---|
| PREMIUM LOTS | large grid at the top (two big blocks split by a central aisle) | mid green |
| MAUSOLEUM | centre-left, with plaza, steps and reflecting water | navy |
| PRIMARY LOTS | below the mausoleum, right of centre | pale green |
| Parking | between Primary Lots and Garden Lots (with parked cars) | grey |
| GARDEN LOTS | lower-middle, below the parking | light green |
| GARDEN NICHES | lower-left, long niche structures in two rows with a driveway | teal |
| MAIN ROAD | grey loop: enters bottom-right, runs up the right edge, around the top, down the left | grey |
| WALKING PATH | tan path from the left edge down toward the mausoleum plaza | tan |
| PARK / LANDSCAPE | all planted areas, plus the large landscaped memorial garden on the right with its curved paths, groves and circular features | bright green |
| FUTURE DEVELOPMENT | lower-right open green area, labelled | green |
| MAIN ENTRANCE | bottom-right corner, labelled | — |

The distinctive spatial chain that must be recognizable in 3D:
PREMIUM LOTS → MAUSOLEUM → PRIMARY LOTS → GARDEN LOTS → GARDEN NICHES, with the MAIN ROAD
loop, the WALKING PATH, the landscaped right-side garden, FUTURE DEVELOPMENT to the
lower-right, and the MAIN ENTRANCE at the bottom-right.

## 3. The page: one page, two connected modes (captain's direction, 2026-09-16)

The existing **Villa Memorial Park page (`/map`)** hosts both modes, with a mode toggle:

- **Map mode** — the plain masterplan image (`public/media/Park map.png`) with the existing
  plotting/editing behaviour: draw, place, move, edit and inspect plots on the image.
- **3D mode** — the 3D park built from the same masterplan, entered in **full screen**
  (the mode switch requests full screen; a visible in-experience control leaves it, and the
  switch degrades gracefully where a browser refuses the request).

**Role separation (captain's direction, 2026-09-16).** Plotting/editing is **admin only**.
On the customer-facing page a visitor sees the map and the lots, can inspect and select
them, and must have **no plotting or editing tools at all**; staff (authenticated, with the
property edit scope) additionally get the plotting tools. The shared store is the same; the
capability differs by viewer. Selection sync still applies to everyone.

**Movement is drone flight with Minecraft-style controls (captain's direction, 2026-09-16).**
The 3D camera flies freely over and through the park, and its controls feel like Minecraft's:
first-person pointer-locked mouse look (click the world to capture the mouse, `Esc` to
release), **W A S D** movement relative to where you are looking, **Space** ascends and
**Shift** descends while held, **double-tap Space** toggles the flying state exactly as
Minecraft's creative flight does, and a sprint control (Minecraft's `Ctrl` / double-tap `W`)
moves faster. Smooth, calm acceleration throughout - no walking model, no head-bob, no
footsteps, and never a shooter-style snap.

**All controls live inside the experience (captain's direction, 2026-09-16).** The 3D
mode carries its own in-world, game-style interface — mode/exit controls, view toggles,
section list, filters, search, settings and the details panel — rather than relying on the
page's chrome around the canvas. It stays elegant and minimal, never a gaming HUD with
health/score chrome.

**The two modes are connected.** They must share one lot/plot store, so:

- a plot drawn, placed, moved, edited or deleted in Map mode appears/updates in 3D mode;
- a plot placed in 3D mode appears/updates in Map mode (3D placement writes the same
  image-space coordinates the map uses);
- **selecting** a plot in either mode selects it in the other, and the details panel is the
  same;
- plot status, type, section/block text and linked lot stay identical in both.

`lib/park-maps.ts` is already the single shared store (image-space coordinates, plot
shapes, status, type, linked lot, demo-local persistence). Keep it the single source for
both modes and map image-space coordinates to 3D world coordinates through one documented
conversion (the image is the shared spatial frame). The Villa park's map image becomes the
masterplan PNG so both modes share one frame.

## 3a. Core experience (functional requirements)

1. Entry through the MAIN ENTRANCE as the natural starting point.
2. Free movement through the property (walk; optionally a slow drive along the main road).
3. Mouse/touch look controls; zoom and orbit.
4. Camera modes: a **drone-style fly camera with Minecraft-style controls** (the primary
   mode - first-person pointer-locked mouse look, W A S D relative to the view, Space up,
   Shift down, double-tap Space to toggle flight, sprint to move faster, with smooth
   acceleration and adjustable sensitivity/speed), an orbit/masterplan camera, and a
   lot-inspection camera that frames a selected lot. No walking model, no head-bob, no
   footsteps. Smooth transitions - never teleport except an explicit "Go to lot".
5. Landscaping, roads, paths, structures and lots rendered as real 3D geometry with
   believable materials (grass, concrete/asphalt, warm tan paving, light stone).
6. Click/tap individual lots → know exactly which real lot object was hit.
7. Lot states visible: available / reserved / occupied / unavailable; hover and selection
   states elegant and subtle (no neon, no flashing).
8. Lot information panel: lot number, section, status, dimensions, type, price placeholder,
   with actions VIEW LOT / SELECT LOT / CLOSE.
9. Selected lot physically highlighted in the 3D world (soft outline/raised marker/floating
   number) and framed by the camera.
10. Search by lot number, section, status; filters by section, status and (optional) lot
    type, affecting visible/selectable lots.
11. Overhead MASTERPLAN view toggle, with clickable regions that navigate into the area.
12. Minimap showing player position, roads, sections, mausoleum, entrance, selected lot,
    orientation — subtle, never dominating.
13. Navigation menu of named points of interest: Main Entrance, Premium Lots, Mausoleum,
    Primary Lots, Garden Lots, Garden Niches, Future Development — smooth camera travel.
14. Proximity prompts only where useful ("MAUSOLEUM — press E / tap to explore",
    lot hover "P-024 — tap to view details"). Never label everything at once.
15. Confirmation flow ends in a contact/inquiry form carrying name, contact number, email,
    selected lot, section, message. Wording says "selected for inquiry" — never
    "purchased" or "reserved", and no payment is taken.
16. Landing screen with the park name, tagline, [ENTER MEMORIAL PARK] and
    [VIEW MASTERPLAN].
17. Debug/development mode (dev builds only): site boundary, world axes, lot IDs, lot
    coordinates, section boundaries, masterplan overlay toggle, collision boxes,
    navigation paths, FPS, object count.

## 4. Environment and art direction

- Peaceful late-morning / early-afternoon daylight; soft natural sun, subtle clouds, soft
  believable shadows; clear or lightly cloudy. No fog obscuring the view, no darkness, no
  scares.
- Optional time-of-day slider (day → afternoon → sunset → evening) with pathway, entrance
  and mausoleum lighting at evening — respectful and calm.
- Subtle ambient audio (gentle wind, birds, soft nature) once assets exist; never thunder,
  horror, creepy music, or jump scares. Keep audio optional and user-controlled.
- Vegetation: tropical Philippine planting that is lush but controlled — not a jungle.
  Mature and young trees, ornamentals, palms where appropriate, shrubs, hedges, planted
  beds. Trees must not cover burial lots, and must respect roads, paths, lot boundaries,
  access and sightlines.
- Parking area near the primary lots: realistic paving, bays, curbs, landscaped islands,
  markings, and a few static vehicles — never a busy commercial car park.
- Roads: light grey paved surface, realistic width and curvature, subtle curbs, drainage
  where appropriate, landscaped edges, pedestrian crossings; no heavy traffic.
- Walking paths: warm beige stone/concrete/pavers, walkable, landscaped edges, connecting
  Entrance → Mausoleum → Premium → Primary → Garden → Garden Niches.
- Lots: maintained grass with subtle grid organization, and an elegant, understated
  physical marker (small stone/bronze plaque with the lot number) per lot.
- FUTURE DEVELOPMENT: undeveloped landscaped open land, clearly labelled, no lots in it,
  built so a later development phase can replace it cleanly.

## 5. Data and architecture (admin-ready)

- One structured lot model, never lots hard-coded into UI logic. Minimum fields:
  `id`, `section`, `type`, `row`, `column`, `status`
  (`available|reserved|occupied|unavailable`), `dimensions {width, length}`,
  `price` (`null` until supplied), `coordinates {x, y, z}` (world units).
- Existing repo shapes may inform the model but the 3D inventory is its own configurable
  module; the current 12-lot demo fixture and the 2D map's parks/lots fixtures are **not**
  modified.
- Lot positions live in world coordinates with helper conversions
  (`worldToLotCoordinates`, `lotToWorldCoordinates`, `screenToWorld`, `worldToScreen`) so
  GIS/CAD/GeoJSON/DXF/survey/drone data can replace the approximated geometry later.
- All geometry is replaceable: the masterplan image is a development overlay/reference,
  never a permanently required runtime dependency.
- Design (do not build) for a future admin: create/edit lots, numbers, availability,
  prices, dimensions, sections, images, descriptions, reserve/occupy — without a rewrite.
- Status and price changes must be data/config driven so real inventory can be dropped in.

## 6. Technology

Existing stack in this repository: Next.js 15, React 19, TypeScript, the repo's own CSS.
Add, unless a better-justified choice is explained first: **three.js** with
**@react-three/fiber** and **@react-three/drei**, and **zustand** for UI/3D state.
No unnecessary or duplicate technologies; keep the app's existing conventions, lint and
test setup. Suggested structure follows the repo's `components/`, `lib/` layout, with 3D
scene logic, UI, lot inventory, camera controls, navigation and the data/API layer
separated.

## 7. Performance, responsive, accessibility

- Performance first: instanced meshes for lots, trees and markers; LOD; frustum culling;
  compressed textures; efficient lighting; lazy loading where sensible; bounded object
  counts. Target smooth interaction on desktop, laptop, tablet, and modern mobile.
- Responsive: desktop (large viewport, side panel, minimap, controls), tablet
  (collapsible panels), mobile (touch movement, pinch-zoom, drag-look, tap selection,
  collapsible panels). The 3D world stays the focus.
- Accessibility: readable type, sufficient contrast, keyboard navigation where practical,
  visible focus states, text alternatives for non-3D information, reduced-motion support,
  labels rather than icon-only controls.
- Camera comfort: smooth acceleration, adjustable speed/sensitivity, no shake, no extreme
  FOV, no abrupt teleporting, respect reduced-motion.

## 8. Collision and walkability

No walking through walls, buildings, trees, lot markers, or outside the site boundary.
Roads and paths stay easy to navigate. Collision is sensible and simple, not exact physics.

## 9. Build phases (one PR each)

1. **Accurate 3D blockout** — terrain, boundary, main road, entrance, mausoleum, premium
   lots, primary lots, garden lots, garden niches, future development, walking paths;
   masterplan overlay in dev mode; walkable camera; normalized coordinate system.
2. Interactive lots (real objects, IDs, hover/selection).
3. Lot data + selection UI (panel, search, filters, selection → inquiry form).
4. Realistic landscaping (instancing/LOD).
5. Camera modes and navigation (first/third/orbit/inspection, POI menu).
6. Environment: lighting, sky, time-of-day, ambient audio.
7. Search/filter/minimap/masterplan toggle polish.
8. Performance pass.
9. UI polish and transitions.

First deliverable (phase 1 + the core of 2–3): a working prototype where the park is
visible in 3D, the masterplan layout is recognizable, the user can move around, the major
sections exist, individual lots can be clicked and highlight, lot information appears, the
camera can navigate to sections, and an overhead view is available. Functionality over
visual perfection on the first iteration.

## 10. Quality control checklist (verify against the image, with the overlay on)

- Main entrance correctly positioned (bottom-right).
- Mausoleum correctly positioned (centre-left, with plaza/water).
- Premium lots in the upper section; primary lots near the mausoleum; garden lots below the
  primary; garden niches lower-left; future development lower-right.
- Main road follows the plan (loop around the premium section, down the right side to the
  entrance).
- Walking path follows the plan (from the left toward the mausoleum plaza).
- Right-side landscaped memorial garden present with its curved paths and features.
- Lots are individually selectable; lot status is visible; selection highlights.
- Camera transitions smooth; search works; section/status filtering works.
- Masterplan view works; minimap present and subtle.
- Mobile interaction considered; performance acceptable; UI does not obstruct the world.
- No horror/combat/game-HUD aesthetics anywhere.

## 11. Decisions (captain-confirmed 2026-09-16)

1. **Placement** — inside the existing `/map` page (Villa Memorial Park) as a mode toggle;
   the page's existing plotting behaviour is preserved as Map mode for staff, and the two
   modes share one store as described in section 3. Customers see the same two modes
   without any plotting/editing capability.
2. **Identity** — the 3D experience uses the masterplan's own identity (Sanctuario Memorial
   Park, Begang, Isabela City, Basilan; "A Sacred Place. A Lasting Legacy.") while the page
   keeps its existing Villa Memorial Park framing. Both names already appear on the current
   page; do not rename the app or other pages.
3. **Inventory** — placeholder plots generated from configurable grids with clearly-marked
   placeholder IDs (`P-001`, `PR-001`, `G-001`, `GN-001`) until the client supplies the
   real lot list; they live in the shared store so either mode can edit them.
4. **Prices** — "Contact for pricing" placeholders; no invented prices.
5. **Assets** — v1 uses procedural/primitive geometry and generated textures; no purchased
   model packs. Richer trees, avatar and vehicles come later.
6. **Audio** — deferred to a later phase.
7. **Masterplan asset** — the PNG is copied in from the preserved client media and
   committed with the first PR (the clone currently holds it untracked); add
   `*:Zone.Identifier` to `.gitignore` so Windows metadata sidecars never get committed.

## 12. Out of scope for v1

Admin CRUD screens, payment/reservation backends, CAD/GIS import pipelines, real inventory
integration, and multi-language support. The architecture must allow each of these later
without a rewrite.
