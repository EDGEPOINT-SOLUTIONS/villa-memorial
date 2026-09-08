# Lot Geometry Contract Proposal (Leaflet park map) — for Keb

> Status: **PROPOSAL — dev-authored freeze required.** Written so Keb can review
> before any real GIS data is built against. Nothing here is frozen; the demo
> runs on a PROVISIONAL fixture flagged in code.
> Related plan: Phase 1–2 of the Leaflet park map (see PR description when opened).

## Business goal
Customers (public `/map`) and staff (`/staff/property`) should see REAL lot plots
drawn on the memorial park, and customers should eventually reserve/order an
available plot online (that journey additionally needs **M1 lot-as-order-line**
and the public lots read route — both listed as separate dev items).

## What exists today
- Lots are points in the frozen Lot contract (KEB-D3-01): section/block/number/status — **no geometry**.
- property-gis has no geometry/GIS layer (GIS foundation deferred).
- The web demo now renders **provisional** rectangular plots (percent-of-image
  coordinates in `web/lib/fixtures/property/plots.json`) purely so the UI can be
  built and shown before real data exists. Marked provisional in the file header.

## Proposed contract shape (discussion seed — Keb decides)
Two options, or a combination:

**A. Geometry on the Lot shape (recommended for v1)**
Add to the frozen Lot response an optional field:
```
geometry: { outline_percent: [[x,y],…], section_band?: string } | null
```
- Coordinates are **percent of the park map image** (0–100), consistent with the
  current derived-layout model and the Leaflet CRS.Simple view.
- `null` = no survey yet (screens fall back to a dot).
- Property-gis seeds/migration carry the outlines; web keeps rendering them.

**B. Separate park map document (later, for survey-grade GIS)**
A `park_maps` resource with surveyed GeoJSON polygons + imagery metadata per
tenant (needs the GIS module). Useful when a real aerial/survey exists; keep as
Phase-2 evolution behind option A's field.

## Open questions for Keb
1. Option A vs B now; field name/shape; is percent-of-image acceptable v1?
2. Who supplies the park image + outlines (client survey, admin tool, seed)?
3. Should outlines be exposed on the **public** read path (requires the public
   lots gateway route decision) or staff-only first?
4. Timeline link to M1 (lot as commerce order line) so the public reserve/pay
   journey can be scheduled together.

## What the demo does meanwhile (honest)
- `plots.json` fixture is PROVISIONAL demo geometry, flagged in its provenance
  header; screens degrade gracefully if geometry is absent (dot fallback).
- No fake GPS coordinates, no survey claims; pan/zoom over the park image only.

## Acceptance when frozen
When the dev freezes option A (or B), we: replace the fixture with recorded
live geometry through the typed client, delete the provisional flag, and keep
screens unchanged (the seam already exists).
