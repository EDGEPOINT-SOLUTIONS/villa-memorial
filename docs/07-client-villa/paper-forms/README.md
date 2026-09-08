# Villa paper forms — authoritative source copies

Clean, read-only copies of the real Villa paper documents this repo digitizes.
These are the authority for the digitization tracks in `FORMS_PLAN.md` — when a
screen or a contract module and a paper disagree, the paper wins until Villa says
otherwise. They are staged here so capture screens and contract code can be
checked against the real documents without hunting the `public/forms/` staging
area (which is never committed).

| File | Track | Notes |
|---|---|---|
| `Service Contract Form.docx` | Track A — funeral service contract | Funeraria Villa at-need service contract (`FORMS_PLAN.md` gap 1). |
| `Purchase Application Form.docx` | Track B — lot purchase application | **2026 combined** Purchase Application **and** Agreement (one document); supersedes the separate application + agreement split. |
| `Purchase Agreement.docx` | Track B — lot purchase agreement | Earlier **standalone** purchase agreement (2025), executed alongside a separate application form. |

Rules (per the captain's approval):

- **Never edit these files.** They are byte-identical copies of what Villa
  actually signs; any change must come from the client. When the paper changes,
  the changed copy replaces the file whole (or lives next to it), never by
  hand-editing the copy.
- Treat them as read-only reference. A `.docx` is a zip; the human text (tables
  included) lives in `word/document.xml` — extract with python3 `zipfile` /
  `xml.etree` (ElementTree) when a field-by-field reading is needed, or read
  the transcript below for the field inventory.
- Legal wording on the printed contract comes from `web/lib/contracts/villa-terms.ts`
  (versioned by effective date), never from this file at render time.

## Funeral Service Contract — field inventory (transcript of the .docx)

Header: `SERVICE CONTRACT No.: ___` · `Date ___`

**Deceased** — Name · Gender (M/F) · Date of death · Civil status (S/M/O) ·
Date of birth · Senior Citizen? (Yes/No)

**Client** — Name · Gender (M/F) · Address · Civil status (S/M/O) ·
Telephone numbers · Facebook · Relationship to deceased · Email · ID presented · ID#

**Services rendered vs packaged deals** (two columns, each with an Amount cell):

| Services rendered | Packaged deals |
|---|---|
| ROD | Ordinary Coffin |
| ARABESQUE 1/2 | Embalming `___` days |
| ARABESQUE Full glass | Lights |
| Lizo `___`JR `___`SR | Delivery |
| Metal 1/2 | Pick-up |
| Metal Full / Bubble Top | Interment |
| Others `___` | Extension |

`TOTAL COST OF SERVICES RENDERED`

**Less: LIFE PLANS / INSURANCES / BURIAL ASSISTANCE / GUARANTEES:**
LGU (`coffin` / `embalming ___ days` / `Others ___`) · DSWD / Senior Citizen ·
SSS (ID# `___`) / GSIS (ID# `___`) · Life Plan / Insurance (Plan # `___`)

`GRAND TOTAL AFTER DEDUCTIONS` · `DOWNPAYMENT` · `BALANCE & DUE DATE (___)`

**Body terms**: parties (Funeraria Villa / Armando A. Villa; CLIENT + optional
Co-Maker/CLIENT) · payment within nine (9) days · guarantee instruments within three
(3) days · forfeiture of discounts + 10%-per-month interest on failure · special power
of attorney for burial-benefit claims · indemnity for transport-without-embalming ·
venue/jurisdiction · waiver + time-is-of-the-essence · signatures (CLIENT /
Co-Maker / Armando Villa, Funeraria Villa) · notarial acknowledgement with Doc/Page/
Book/Series lines.

See `docs/07-client-villa/current-state-forms.md` §1 for the business rules extracted
from this paper, and `web/lib/contracts/villa-terms.ts` for the versioned clause
wording the app prints.
