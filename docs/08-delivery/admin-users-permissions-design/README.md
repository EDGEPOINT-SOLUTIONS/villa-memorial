# Users & roles — permission checkboxes (2026-10-03)

**Task:** `villa-admin-access` · **Captain, 2026-10-02:** *"The users and roles should be
improved, we should be able to check checkboxes for permissions."*

`/staff/users` (S30) was a read-only account of the recorded identity-access seed: four role
cards listing every permission in plain words and its frozen token. The captain asked for the
model to be **editable with checkboxes**. This record covers that change — and, just as
importantly, the two things it deliberately did **not** change.

## What ships

| Piece | What it owns |
|---|---|
| `lib/fixtures/auth/access-control.json` | The read-only role seed (unchanged scope lists, pinned to the seeded personas). |
| `lib/api-client/access-control.ts` | The durable role-scope store: seed + an append-only `role_scopes_set` journal (`ACCESS_CONTROL_STORE_PATH` or `.data/auth-access-control.json`), folded on every read. Every token is validated against the frozen vocabulary on the way in and out. |
| `app/api/access-control/roles/route.ts` | The one write (`POST`), gated `identity:users:manage`, 401/403 before the store, 422 for any token outside the vocabulary. |
| `app/(staff)/staff/users/scope-checkboxes.tsx` | The ONE permission reading: the 23 frozen scopes in five module groups, as real checkboxes (plain words + raw token), usable read-only. |
| `app/(staff)/staff/users/roles-editor.tsx` | The role editor: one card per role, all boxes, ONE **Save permissions** action, dirty/discard, a live-region success message. |
| `app/(staff)/staff/users/page.tsx` | The screen: People table (each account's own scopes behind a read-only checkbox view) + the role editor. |

## The rules it keeps

- **The frozen vocabulary is the only permission set.** A box exists only for a scope in
  `rbac-scopes-v1`; the store refuses a save carrying anything else (`422`, nothing written).
  `tests/fixture-contract/access-control.test.ts` still pins the seed, and
  `tests/unit/access-control-store.test.ts` pins the refusal.
- **The gate model is unchanged.** A saved edit changes the **role record** this screen reads,
  never a running session's scopes: `rbac-scopes-v1` rule 1 says the service boundary is the
  authority, and the app gates on the verified session claims only. No route, nav gate or
  scope array changed. `tests/unit/access-control-admin-rbac.test.tsx` proves both directions —
  emptying a role does not lock out a session that holds its scopes, and granting a role a scope
  does not open the page to a session that was not issued it.
- **No invented endpoint, no invented scope.** No contract names a role-write endpoint, so the
  route stores an app-authored record and says so; the PR carries the contract ask below.

## Before / after

| | before | after |
|---|---|---|
| Role permissions | plain-word list + raw token, read-only | one checkbox per frozen scope, grouped by module, ticked = recorded state |
| Saving | nothing to save; a warning Alert | one **Save permissions** (whole record), Discard, "Unsaved changes" / "Saved", last-saved stamp + actor |
| A person's scopes | a `<details>` list of grants | the SAME checkbox groups, read-only, behind the count |
| User provisioning | named as not wired | unchanged — still named as not wired (no invite form) |
| Durability | none | append-only journal, atomic write, one in-process lock; the edit survives a restart and shows on the next read |

## Evidence

Shots (`shots/`), captured from the production build on a local server:

| File | What it shows |
|---|---|
| `1440-roles-before.png` / `390-roles-before.png` | The page at seed state: People table, then four role cards with the recorded ticks. |
| `1440-staff-checkboxes-before.png` / `390-staff-checkboxes-before.png` | One role's checkboxes (Staff, 14 permissions), before. |
| `1440-roles-after.png` / `390-roles-after.png` | After ticking **Read the record of who changed what** (`audit:events:read`) on Staff and pressing Save: "Saved" + last-saved stamp, Staff now 15 permissions. |
| `1440-staff-checkboxes-after.png` / `390-staff-checkboxes-after.png` | The Staff role's checkboxes, after — the audit box is ticked. |

The 390 shots show the checkbox grid stacked one column (`.perm-grid`, `≤60rem`) and the
role card reading top-to-bottom with no sideways pan.

## Verification

- `tests/unit/access-control-store.test.ts` — fold = seed; a save is durable; unknown scope,
  duplicate, unknown role, repeated role and a non-list payload are refused and write nothing;
  a no-op save writes nothing; stored order is the contract's order; a corrupt journal fails 500.
- `tests/unit/access-control-admin-rbac.test.tsx` — API 401/403/422/save; the page gate; and the
  gate-model proof above.
- `tests/unit/users-page.test.tsx` — the real page renders one checkbox per frozen scope per
  role, the seed ticks, the read-only person view, the honest provisioning states and the house
  rules (one `h1`, no skipped level, no nested paragraphs).
- `tests/unit/reading-budget.test.tsx` — the screen stays inside the 30-word paragraph budget.
- `npm run lint && npm run typecheck && npm test` (3358 passing) and `npm run build` pass.

## Contract ask (carry to `docs/08-delivery/open-items.md`)

`identity-access` publishes no role read or role-write endpoint, and `rbac-scopes-v1` records
only the vocabulary. The screen therefore keeps the role record locally and edits it as an
app-authored document. When the service freezes a role endpoint, `lib/api-client/access-control.ts`
gains the live branch and the screen's shape does not change.
