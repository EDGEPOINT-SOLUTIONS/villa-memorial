# The sign-in page's editorial panel (2026-09-30)

**Brief (captain):** *"The login page, improve it, it looks so plain, make it more sharp,
premium, Greetings, left side is a section it can be a news/promotion/events/invitation to
members etc… and this is also editable in the pages and content in the admin panel."*

The staff door at `/login` becomes a two-column page: the sign-in card on one side and the
office's own editorial panel on the other. The panel is the **LEFT** column (as the captain
said) and carries a greeting plus the office's news, promotions, events and member
invitations. **Every word and photograph comes from a page document** the office edits in
Pages & content → **Sign in**.

## What is new

| surface | change |
|---|---|
| `/login` | the classic centred card, plus the office's editorial panel when the document carries anything to print |
| `lib/content-catalog.ts` | the `login` page-document key, the `notice` block type (reader + validator), and `EDITORIAL_BLOCK_TYPES` (the panel's curated palette) |
| `components/content/login-editorial.tsx` | the panel — a server component in the home's grammar |
| `components/sign-in-card.tsx` | an optional server-rendered `editorial` slot; the two-column shell exists only when a panel is present |
| `lib/fixtures/content/pages.json` | the seeded `login` document (office-editable seed text) |
| `styles/components.css` | the `.signin-editorial*` block — sky ground, gold kickers, hairline-separated entries |
| Pages & content | the login document opens at `/staff/landing/login` through the same page-editor seam every other page document uses |

**Sign-in behaviour is unchanged.** The form, its destination and the signed-in redirect are
untouched; only the presentation changes. An empty or unreadable document leaves the classic
centred card rather than a dark hole beside it (`hasEditorialContent` gates the whole shell).

## The editable fields

The `login` page document (Pages & content → Sign in):

| field | meaning |
|---|---|
| `hero.eyebrow` | the greeting kicker (`Greetings` in the seed) |
| `hero.headline` | the greeting title |
| `hero.lead` | one supporting line |
| `hero.image` | an optional hero photograph (absent renders nothing) |

Each panel entry is a **`notice`** block:

| field | meaning |
|---|---|
| `category` | a short kicker — News · Promotion · Event · Invitation |
| `heading` | the entry title (required) |
| `text` | the words |
| `image` | an optional photograph with alt text (and an optional caption) |
| `href` / `linkLabel` | an optional link — both or neither; an internal path, `#anchor` or `https://` |

The editor offers only the editorial palette (`notice`, `paragraph`, `bullets`, `links`,
`note`) on this document, so a price table cannot be placed in a greeting. Every field is
rendered only when filled; an empty field leaves no blank space.

## The grammar

The panel follows the home's settled grammar, not a new language: a display-serif greeting at
the page-title step (weight 500, never bold), a gold micro-step kicker, **hairline-separated**
entries (never a grid of equal boxes), and whole photographs at a 4:3 box. The ground is the
sky ramp (`--sky-950`), the same brand surface as the footer; the links take the gold ramp
with dark ink never used as text.

## Evidence

Measured in a headless Chrome at each viewport (`document.documentElement`):

| page | width | height | horizontal overflow |
|---|---|---|---|
| `/login` before, 1440×900 | 1440 | 900 | none |
| `/login` after, 1440×900 | 1440 | 1479 (panel scrolls) | none |
| `/login` before, 390×844 | 390 | 844 | none |
| `/login` after, 390×844 | 390 | 1991 | none |

The phone layout stacks the **form first**, then the panel (`.signin-shell--editorial`
collapses to one column below 60 rem).

- `before-1440.png`, `before-390.png` — the plain centred card on `main`.
- `after-1440.png`, `after-390.png` — the panel beside the card.
- `admin-editor-1440.png` — Pages & content → Sign in, showing the new `notice` fields
  (Category · Title · Words · Link label · Link destination · Attach photo).

## Guards

`tests/unit/login-page.test.tsx` pins the panel, the empty/unreadable fallbacks and the
`notice` reader/validator; `content-catalog`, `content-pages-store`, `content-stores-durable`,
`pages-and-content-admin` and `demo-quick-fill` cover the seven-document catalogue and the
editor. The typography, accessibility-craft, composition and page-background guards run over
the same files.
