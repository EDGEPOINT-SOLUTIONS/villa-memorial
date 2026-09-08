# docs/ — project knowledge snapshot

This folder is a **reference snapshot** of the In-Memoriam platform's docs
(`docs/` in the `in-memoriam` repo), copied here so this frontend repo is
self-contained and aligned with the project while building in villa-memorial.

**Source of truth:** the live docs remain in the `in-memoriam` repo
(dev-gated). Nothing in this folder is edited here; when the dev merges changes
that affect these docs (especially `08-delivery/contracts/`), refresh the
snapshot by re-copying from `in-memoriam/docs`.

**Snapshot taken:** 2026-09-08 (after the frontend migration, commit `03f1e58`).

## What matters most for the forms work

| Path | Why |
|---|---|
| `07-client-villa/current-state-forms.md` | The Villa business forms to digitize (contract, agreement, application, COC…) |
| `07-client-villa/client-profile.md` | Who Villa is; what the product must say/do |
| `07-client-villa/client-to-saas-mapping.md` | How business areas map to platform modules |
| `07-client-villa/open-questions.md` | Open business questions for the dev |
| `08-delivery/contracts/` | Frozen API/event shapes — **never invent new ones** |
| `08-delivery/notes/` | Frontend work logs (route coverage, lot-geometry proposal…) |
| `02-architecture/service-template.md` | Definition of done incl. "Frontend adaptation" |
| `02-architecture/design-system.md` | Design-token consumption rules |
| `02-architecture/adr-003-react-nextjs-frontend.md` | Why React/Next.js is the frontend |
| `08-delivery/exemplars/web-AGENTS.md` | Source exemplar for this repo's `AGENTS.md` |
