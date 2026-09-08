# Villa paper forms — authoritative source copies

Clean, read-only copies of the real Villa paper documents this repo digitizes.
These are the authority for the digitization tracks in `FORMS_PLAN.md` — when a
screen or a contract module and a paper disagree, the paper wins until Villa says
otherwise.

| File | Track | Notes |
|---|---|---|
| `Purchase Application Form.docx` | Track B — lot purchase application | **2026 combined** Purchase Application **and** Agreement (one document); supersedes the separate application + agreement split. |
| `Purchase Agreement.docx` | Track B — lot purchase agreement | Earlier **standalone** purchase agreement (2025), executed alongside a separate application form. |

Rules (per the captain's approval):

- **Never edit these files.** They are byte-identical copies of what Villa
  actually signs; any change must come from the client.
- Treat them as read-only reference. `word/document.xml` inside a `.docx` holds
  the text (tables included) — extract with python3 `zipfile` / ElementTree
  when a field-by-field reading is needed.
- The `Service Contract Form.docx` paper belongs to another track's plan and is
  deliberately not copied here.
