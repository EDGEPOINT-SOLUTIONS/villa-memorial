# docs/ — the platform snapshot, its rules, and Villa's own record

**What this folder is: a snapshot PLUS villa-only documents.** It began as a copy of the
IN MEMORIAM platform docs (`in-memoriam/docs`), taken 2026-09-08 (copied into this repo in
commit `ae86ddf`, after the frontend migration `03f1e58`) so this repo would be self-contained
while the villa frontend was built. Since then the villa build has **added** its own records
inside the folder and made a few **villa revisions** to snapshot files — so the old
“read-only copy, nothing edited here” statement is no longer true. The rules below replace it.

**Reading rule when two documents disagree:** the platform snapshot owns shapes and
architecture (it is the platform's authority — never reinterpret it); the villa record owns the
product's *current* state (it is newer — trust it about what is built). The frozen contracts are
the platform's; the build never edits a shape to match itself.

**Snapshot taken:** 2026-09-08 · **Last refresh:** none since the initial copy · **Refresh log:**
at the bottom of this file.

---

## 1 · Never edited here — platform-owned files

The source of truth for these is `in-memoriam/docs`. Read them, cite them, build against them;
do not rewrite them here. When one is wrong or missing something, that is a contract/spec ask to
the platform (see `08-delivery/open-items.md`), not an edit.

| Path | Why it is hands-off |
|---|---|
| `08-delivery/contracts/**` | The frozen API/event shapes this repo records. Never invent a new one and never edit a shape to fit the app. **One recorded exception already exists** — see §3. |
| `01-product/`, `03-domain/`, `04-modules/`, `05-ai/`, `06-cultural-digital-memorial/` | The PRD's product/domain/module/AI/cultural specs. |
| `02-architecture/**` except `premium-admin-direction.md` | ADRs and the service/design-system templates. |
| `07-client-villa/client-profile.md`, `client-to-saas-mapping.md`, `current-state-forms.md` | The platform's client analysis; the villa build points at it, never overwrites it. |
| `08-delivery/exemplars/**` | Keb's reference AGENTS.md files, copied at scaffold time. |
| The platform plans and notes (`checkpoint-delivery-plan.md`, `mvp-roadmap.md`, `microservices-build-plan.md`, `capacity-building-plan.md`, `team-and-workflow.md`, `cp1-day-plan.md`, `august-september-schedule.md`, `qa-testing.md`, `risks.md`, `service-priorities.md`, `parallel-development-tracks.md`, `deploying-staging.md`, `agents-md-standard.md`, `notes/cp1-retro.md`, `notes/phase-2-backlog.md`, `notes/lot-geometry-contract-proposal.md`, `notes/notification-r-spec-walkthrough.md`) | The platform's own delivery record. |
| `AGENTS.md` (this tree's) | The platform's documentation-tree guidance. Its title carries the 2026-09-08 villa rename; leave the title and the rules as they are. |

## 2 · Edited here — Villa's own documents

These are maintained here, with the work they record (the design-record convention: a feature's
record lands in the same PR as the feature). A few began as snapshot files and have been taken
over since — the route index is the clearest case.

| Path | What it is, and the edit rule |
|---|---|
| `08-delivery/prd-alignment-audit.md` + `prd-alignment-audit/` | The 2026-09-17 audit (readable artifact included). **Findings are evidence and are never rewritten** — the file grows dated post-audit notes and review-record rows, nothing else. |
| `08-delivery/open-items.md` | The standing short list: what is closed, what remains, who can act. Update or close an item as it lands; it links to the document that owns each claim. |
| `08-delivery/villa-extensions.md` | The captain's extension-layer decision; it points at the audit's §5 table as the list's only home (do not restate the 13 rows). |
| `08-delivery/frontend-complete.md` | The dated front-end completion record: what shipped, which PRs, what remains with the platform and the client. Update with a dated row when a remaining item lands. |
| `08-delivery/notes/demo-web-route-coverage.md` | **Living route index** — the first thing to read before touching a route. Change a page and its row in the same PR. |
| `08-delivery/deploying-web.md` | The front end's **production profile** (compose override + env file + healthy-deploy checks + what can go live) and its verification record. The demo stack is `docker-compose.yml`; the Rails platform's Kamal runbook stays `deploying-staging.md`. Update it when an env switch, the container or the live-contract list changes. |
| `08-delivery/aws-deploy.md` | The front end's **AWS shape A** runbook: the Terraform package under `infra/aws/` (EC2 host + ALB + ACM + Route 53 + SSM), prerequisites, deploy/update/verify/rollback, log access and the ECS Fargate migration path. Update it when the infrastructure package changes; the application recipe stays in `deploying-web.md`. |
| `08-delivery/*-design/` and `visual-craft-pass/` (`agent-portal-design` · `commission-design` · `component-kit-design` · `composition-pass-design` · `facilities-design` · `family-portal-design` · `guarantee-instruments-design` · `immediate-assistance-design` · `journey-fixes-design` · `lead-record-design` · `lot-lifecycle-design` · `membership-folio-design` · `memorials-design` · `ops-board-design` · `paper-layer-design` · `provisional-receipt-design` · `public-nav-design` · `service-builder-design` · `service-quote-design` · `services-design`) | Per-feature design records and render evidence (shots). Add/extend with the feature. |
| `07-client-villa/park-3d-spec.md` | The binding contract for the park's 3D world (captain-approved). |
| `02-architecture/premium-admin-direction.md` | The captain-approved premium palette direction (the platform copy of the palette text is untouched). |
| `prototypes/villa-home-ui/` | The captain-approved home/package prototypes the views are pinned to. |

## 3 · Client material and the two shared-in-place files

| Path | Rule |
|---|---|
| `07-client-villa/paper-forms/*.docx` | **Never edit.** Byte-identical copies of what Villa signs; when the paper changes, the client's new copy replaces the file whole. The `README.md` transcript beside them is villa-maintained. |
| `07-client-villa/open-questions.md` | Villa's question register. The build **adds** its own questions (Tracks B/C came from the digitization work) and Villa's answers update it — this one file is maintained here, not upstream. |
| `08-delivery/notes/known-limitations-cp1.md` | The CP-1 checkpoint record. Villa may add **dated revisions** when the villa build changes one of its entries; new post-CP-1 limitations belong in the route-coverage note or a design record, not here. |
| `08-delivery/contracts/case-events-v1.md` | Frozen contract with **one recorded villa addition**: the 2026-09-08 “intake client-channel completeness” block (four additive, nullable `client_*` fields, tolerant-reader rule unchanged — no version bump). Do not extend it further; a future refresh must preserve that block, or the platform absorbs it upstream. |
| `AGENTS.md`, `02-architecture/adr-005-reusable-service-layers.md`, `08-delivery/delivery-plan.html` | Snapshot files that already carry the villa rebrand (title/name only, 2026-09-08). Leave the revisions as they are; no further edits. |
| `08-delivery/notes/demo-script-cp1.md` | The CP-1 demo script, revised once for the server-side demo quick-fill. Same rule as `known-limitations-cp1.md`: dated villa revisions only. |

## 4 · What triggers a refresh

The snapshot is refreshed **manually** — `scripts/sync-from-monorepo.sh` protects `docs/`
entirely, so an app sync never touches it. Refresh when:

1. **The platform changes or freezes a document this repo builds against** — above all a new or
   amended `08-delivery/contracts/*` or a module spec that changes a screen's rule;
2. **A platform document is known to have been superseded** (e.g. a palette/architecture text the
   captain has already overridden) and the villa record points at it;
3. **The platform publishes new docs this repo's readers need** (a new exemplar, a new ADR).

How: re-copy the platform-owned paths from `in-memoriam/docs` (do not run the app sync for this),
then, in one commit:

- preserve every file in §2 and §3 — never overwrite a villa record;
- for the **shared files** in §3, merge the upstream change into the existing file (never replace
  it): `open-questions.md` keeps the villa Tracks B/C, `case-events-v1.md` keeps its addendum,
  `known-limitations-cp1.md` keeps its dated revisions, and the rebranded snapshot files keep
  their villa names;
- add a row to the refresh log below with the date, the source, and what changed;
- re-check the links in `open-items.md` / `frontend-complete.md` that cite refreshed anchors
  (heading text feeds GitHub anchors).

**This folder is not the platform's live docs.** A refresh here never edits the `in-memoriam`
repository, and a villa decision recorded here never becomes platform policy until the platform
adopts it.

## 5 · What matters most

| Path | Why |
|---|---|
| `08-delivery/notes/demo-web-route-coverage.md` | Every route's current state — the honest map of the build. |
| `08-delivery/frontend-complete.md` | The dated completion record: delivered, by which PRs, what remains. |
| `08-delivery/open-items.md` | The open list: platform contracts and the client's five answers. |
| `08-delivery/prd-alignment-audit.md` | The 2026-09-17 PRD alignment evidence (annotated, never rewritten). |
| `07-client-villa/open-questions.md` | The client question register (incl. the digitization build's Tracks B/C). |
| `08-delivery/contracts/` | Frozen shapes — build against them, never edit them. |
| `07-client-villa/current-state-forms.md` | The Villa forms to digitize (contract, agreement, application, receipt…). |
| `07-client-villa/paper-forms/` | The client's own paper copies — the authority for every digitized form. |
| `08-delivery/notes/known-limitations-cp1.md` | The CP-1 checkpoint's per-module limitations. |
| `02-architecture/service-template.md` · `design-system.md` · `adr-003-react-nextjs-frontend.md` | DoD, token rules, and why Next.js. |
| `08-delivery/exemplars/web-AGENTS.md` | The source exemplar for this repo's `AGENTS.md`. |

## Refresh log

| Date | Source | What changed |
|---|---|---|
| 2026-09-08 | `in-memoriam/docs` @ `03f1e58`-era | Initial snapshot, copied in commit `ae86ddf` (the full PRD tree + contracts + exemplars). |
| — | — | No refresh since; the villa additions in §2/§3 have accumulated in place. |
