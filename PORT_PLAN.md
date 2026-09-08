# villa-memorial — real frontend home (migration status)

## What this repo is now

This repo holds the **real production frontend** — the full In-Memoriam web
application (Next.js + TypeScript), copied in whole from the `web/` folder of
the `in-memoriam` monorepo. Every feature built there — including the premium
public storefront, real 2026 content, and the park-map work (PR #65) — is
therefore present here by construction, not by re-implementation.

**Why:** the dev decided villa-memorial is where the client-facing frontend
lives and is deployed, aligned with the project's real stack (React/Next.js
frontend; Rails/Puma + PostgreSQL services behind the gateway). The old
clickable mockup (React + Vite) was a design prototype only; it is archived
under [`legacy-mockup/`](legacy-mockup/) and preserved in git at the tag
`mockup-design-final`.

## Layout

| Path | What it is |
|---|---|
| `app/ components/ lib/ styles/ stub-gateway/ tests/` | The frontend app (source of truth: `in-memoriam/web`) |
| `legacy-mockup/` | Archived COO blue/gold clickable prototype (design reference only) |
| `.env.example` | Environment contract — gateway URL unset ⇒ BFF serves recorded fixtures (standalone demo mode) |
| `README.md`, `AGENTS.md` | App docs & rules (from the monorepo `web/`) |

## How to run

```bash
npm ci
npm run dev        # demo/fixture mode on :4000 (no gateway needed)
```

Point `.env.local` at the live edge gateway to run against real services
(see `.env.example`). Build + test + lint scripts match the monorepo `web/`.

## Open decisions for the dev (no work done on these yet)

1. **Palette** — this app currently carries the DOC granite/marble/brass
   tokens. The archived mockup is the COO blue/gold "Radiant Compassion" look.
   Which palette is the deployed product? (Re-theme is a contained tokens-only
   task once decided.)
2. **Source-of-truth policy** — `in-memoriam/web` is still the monorepo's
   frontend. Recommend: keep that as the canonical repo; villa-memorial is the
   deployment copy, refreshed with one sync (`cp` from `in-memoriam/web`) after
   the dev merges PR #65 and later changes. Alternative: split web/ out of the
   monorepo entirely (bigger change — dev decision).
3. **Deployment** — Vercel/other build config to be set by the dev/ops once
   the gateway URL + secrets are provided.

## What happened to the earlier hand-port plan

The `PORT_PLAN.md` slices (1–6) were a hand-port of web/ features into the Vite
mockup. Superseded by this migration — the mockup no longer needs feature
porting because the real app now lives here. Slice-1/2 changes (real 2026 data
mirror, real photos) that are still useful live on in the app's own files:
`lib/villa-pricing.ts`, `public/media/*` (real uploads), catalogue prices.

## Alignment checklist (status 2026-09-08)

Done:
- [x] Real frontend in repo (root) — verified build/tests/typecheck/lint green
- [x] Mockup archived (`legacy-mockup/`, tag `mockup-design-final`)
- [x] Full docs snapshot in [`docs/`](docs/README.md) (client/forms context + frozen contracts + frontend exemplars)

Still needed (each is a one-time item, mostly dev-provided):
- [ ] **Sync policy** — a documented one-command refresh from `in-memoriam/web`
      after the dev merges PR #65 / later changes (avoid drift between repos)
- [ ] **Live gateway env** — `.env.local` with the gateway URL + secrets so the
      app runs against real services (dev provides; until then, fixture mode)
- [ ] **Deployment** — host/build config for the villa-memorial deploy (dev/ops)
- [ ] **Palette decision** — DOC granite/marble/brass (current) vs COO blue/gold
      (see `legacy-mockup/`) for the deployed product
- [ ] **Forms work plan** — next step: pick the forms to build first from
      `docs/07-client-villa/current-state-forms.md`, fixture-first, honest
      not-wired states, nothing invented against frozen contracts
