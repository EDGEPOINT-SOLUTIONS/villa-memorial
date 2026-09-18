# Villa extensions — the tenant extension layer

**Decision (captain, 2026-09-18):** the surfaces this build carries beyond the IN MEMORIAM PRD
are Villa's **tenant extension layer**. The upstream PRD is deliberately **not** modified.
**Status:** decided and recorded — documentation only; no code change and no change in the
`in-memoriam` repository.
**Source:** the captain's answer on [open item 1](./open-items.md#1-prd-drift-policy), raised by
the [PRD alignment audit](./prd-alignment-audit.md).

---

## 1. Why the PRD is left alone

The PRD already names the boundary this decision uses:

- [`saas-strategy.md`](../01-product/saas-strategy.md) — the three strict customization
  boundaries, whose third is **EXTENSIONS** (genuinely unusual): *“built in extension layer,
  never contaminating core.”*
- [`configuration-engine.md`](../02-architecture/configuration-engine.md) — the guardrail:
  *“keep the 80–90% common core opinionated; configure the genuinely variable 10–20%; push true
  outliers to the extension layer.”*

(Both are PRD documents, kept in this repo as the 2026-09-08 snapshot; the live originals remain
in `in-memoriam`.)

So this is not an exception to the PRD — it is the PRD's own mechanism, used as intended. No
upstream edit is needed, and none is made. Backporting a section into the PRD stays available
later if the platform's developer wants it; that would need the captain's explicit permission
for the `in-memoriam` repository and is **not** part of this decision.

## 2. The authoritative list

The complete list — all **13** extensions, with where each lives, its approval/evidence and its
conflict flag — is the audit's §5 table:

> **§5 “Beyond the PRD — the villa extensions (13)”**
> → [`docs/08-delivery/prd-alignment-audit.md` §5](./prd-alignment-audit.md#5-beyond-the-prd--the-villa-extensions-13)

That table is the list's only home. This note deliberately does **not** restate or re-derive the
13 rows: adding, changing or removing an extension happens there (and in the code and documents
each row cites), so the list cannot drift from its owner.

## 3. The reading rule

**A surface named in that table is deliberate, captain-approved scope — not an accident.**

The PRD describes the platform's common core; Villa's extension layer is where its approved
outliers live. Before treating the PRD as the complete description of this product — or
rebuilding, renaming or “correcting” one of those 13 surfaces to match it — read the table
first, including each row's approval/evidence column. `hr:read` is the failure this prevents: an
invented scope went live and sat in no contract for four days.

One corollary for new work: this layer records approved, evidenced outliers; it is not a place
to park undecided scope. A new surface earns its row in the audit table — approval and conflict
flag included — at the same time it lands, not afterwards.

---

*Recorded 2026-09-18 from the captain's decision on [open item 1](./open-items.md#1-prd-drift-policy).
The audit's §5 table and the documents it cites remain the authoritative evidence.*
