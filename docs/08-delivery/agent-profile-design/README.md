# Agent portal — the profile screen

**Task:** `villa-agent-profile` · **Repo:** villa-memorial · **Branch:** `fm/villa-agent-profile` · **Date:** 2026-10-01
**Contract:** the captain's accepted plan `data/villa-agent-portal-plan/report.md` (§5.5 information
architecture, §9 page-by-page: `/agent/profile` — identity from the office record, the account
picture, shortcuts; change details via the office; the shared account chip) and the captain's own
line: *“Agent should also have profile.”*

---

## 1 · What shipped

| Ask | Where it lives |
|---|---|
| Identity from the **office's own agent record** (`display_name`, `email`, `office_number`) | `app/(agent)/agent/profile/page.tsx` reads `getAgentWorkspace().agent`; the session is only a fallback |
| The **account picture** — initials disc, no borrowed photograph | the shared `components/portal/avatar.tsx`; there is no recorded agent picture and no agent image store, so `avatarSrc` is absent |
| The **four shortcuts** | `wb-tool` tiles in the profile's Shortcuts panel |
| The **honest change path** — the office number read from `lib/family/contact.ts` | the header's `Call the office` primary action and the record panel's note |
| The **shared account chip** carries the agent's identity | `app/(agent)/agent/layout.tsx` now reads the office's `agent` record for the chip name and initials (falling back to the cookie), so the frame reads like the family frame's |
| The portal's approved material model + type-sizing | the page renders inside `.workbench` (page title → `--text-2xl` = 25.6 px), `wb-head`, `WorkbenchPanel`, `PortalKv`, `wb-tools` — no new layout language |

The screen replaces the stub that showed only the sign-in email and four shortcuts. Nothing the
office record does not hold is printed — **no branch, no license, no personal phone** — and no
client photograph is reused for the agent.

## 2 · The account chip

The workbench PR already opted the agent frame into the shared `AccountChip`/`AccountBlock`; this
change makes its **identity source** the office's agent record rather than the sign-in cookie alone.
The fixture cookie the shell tests carry has no display name, and the chip still renders
**Alex Agent / AA** from `lib/fixtures/agent/workspace.json` `agent` — the same record the family
frame's account owner comes from. There is still **no recorded agent picture**, so the chip and the
profile both show the initials disc; the office record never supplies one.

## 3 · Measured

| Measure | Value |
|---|---|
| h1 / page title | `wb-head__title` under `.workbench` → `--text-page-title` = **25.6 px** at the 80 % root |
| h1 count on the page | **1** |
| Avatars / `<img>` on the page | **1 / 0** (the initials disc; no photograph) |
| Record fields shown | **3** — name, email (sign-in), office number (exactly what `agent` holds) |
| Shortcuts | **4** (`/agent/prospects`, `/agent/appointments`, `/agent/lots`, `/agent/marketing`) |
| Panels | 2 (`Your record` span 7 · `Shortcuts` span 5) |
| Horizontal overflow @390 | none |

## 4 · Evidence

`before/` — the shipped stub, captured from the fixture-mode portal signed in as `agent@vm.demo`
on `next dev --port 4100`: `profile-1440.png` (1440×900), `profile-390-full.png` (390×844 full page).
`after/` — this branch at the same widths: `profile-1440.png`, `profile-390-full.png`.

## 5 · Guards

- **Rewritten** `tests/unit/agent-profile-page.test.tsx` — identity comes from the office record
  (a different session name is not printed), the record's three fields and nothing invented, the
  honest initials fallback with **no `<img>` anywhere**, the four shortcuts, the office-line change
  path (`tel:` + the printed number), and the workbench grammar (`.workbench`, `wb-head__title`,
  `wb-panel`, `wb-tools`).
- **Updated** `tests/unit/family-portal-shell.test.tsx` — the agent account chip now asserts
  **Alex Agent / AA** from the office record even when the cookie carries no display name.

## 6 · Deferred, honestly

Any profile **write/edit** is out of scope and waits on a real identity/agent contract — the screen
says the office updates the record instead. The account **picture upload** is not wired (there is no
agent image store; the family's guarded store is family-scoped). The manager/team surface (plan D5)
still needs an identity role and a reporting read.
