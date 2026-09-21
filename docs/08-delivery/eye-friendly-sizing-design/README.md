# Eye-friendly sizing + minimalist home pass (2026-09-21)

Captain's direction (2026-09-21): the PDP sample photograph
(`/products/CSK-ANGELICA-HALF`) is "too big"; the pages must be eye-friendly with
images at the right sizes; the home is to be inspired by
`public/media/frontend-home.png` for proportion and section rhythm; and (added
mid-task) the home is a **redesign** — minimalist, premium, not wordy, with the
middle section understandable at a glance.

Scope for this PR, per the captain's scope note: the **homepage redesign**, the
**PDP / public-page image sizing**, and the **"What we do / Services we offer"
block**. The same minimalist grammar is the reference pattern for follow-up PRs
across the rest of the public site.

## The minimalist public grammar (the reference pattern for follow-ups)

Applied to the home here; to be carried to the other public pages by follow-ups.

- **Hero: one sentence.** One display headline, one short lead (≤ 12 words), one
  primary action + one secondary. Hero type is Inter (the product's one face) at
  a lighter display weight, tight leading and balanced wrapping — a treatment,
  not a second typeface.
- **Sections lead with the answer.** A `kicker · heading · one-line intro`, then
  the facts. No prose intro longer than the one line.
- **At a glance, numbers lead.** The services/routes band prints its live figure
  as the dominant element (`from ₱X`), with the words as one supporting line.
- **Progressive disclosure.** Detail (full price tables, deep copy) lives behind
  its own section/page, never as a wall on the band.
- **Right-sized imagery.** A picture fits its column, is never upscaled, and
  every `sizes` hint matches the box it is in. A band leads with ONE picture.
- **The public word budget** (`tests/unit/reading-budget.test.tsx`): opening
  sentence ≤ 12 words, paragraph ≤ 30 words, list item ≤ 30 words, paragraph
  prose ≤ 300 words per page. The home's copy is staff-editable content, so it is
  measured here, not gated.

## What changed

### Homepage (redesign)

- The middle column is now **one raised sheet** (`.anchored-mid__inner`) whose
  sections are separated by a hairline and space (`.mid-section`), not six
  competing bordered boxes. Fewer borders, no band shadows, a calmer rhythm.
- The hero is a band, not a floating card: lighter display weight, tighter
  leading, a measured lead line, and a scrim that is near-opaque behind the copy
  and opens to the photo on the right. No new palette; sky/gold tokens only.
- The About figure is capped at 20rem; the service lead photograph takes a
  supporting 0.8fr share so the live figure can lead.
- Home copy trimmed across the hero, About, Services, Plans, Blog and Map
  regions. All live prices, plan tables, honesty states and contact facts are
  unchanged; **no amount was added or restated**.
- The rail's lead picture is now placed absolutely in its 14rem frame (it stood
  399px tall inside a 224px box and was clipped).

### PDP / public-page image sizing

- `.pdp-layout` is bounded to 64.5rem (media column = 40rem) and centred. The
  sample photograph that rendered **966 × 644** now renders **638 × 425** and the
  browser picks a 960px-wide derivative for the 640px slot — no upscale.
- `CasketSampleFigure` and `PdpGallery` carry a `sizes` hint that matches the
  40rem column; the gallery also serves library photographs through the sized
  WebP derivatives (`libraryThumb` / `libraryThumbSet`).
- `/products`: the card `sizes` hint was 26rem for a real ~28rem column, so the
  browser stretched the 440px derivative to 448px. The hint now matches and the
  880px derivative is chosen.
- `/gallery`: the grounds feature was capped at 60rem and upscaled its 940px
  file to 958px. Cap is now 58.75rem (940px).
- Audit of `/`, `/services`, `/plans`, `/products`, `/products/[sku]`, `/lots`,
  `/gallery`, `/facilities`, `/map` at 1440: **no rendered image is wider than
  the file the browser selected.**

## Measured evidence

### Rendered image sizes (CSS px, 1440 viewport)

| Surface | Before | After | Note |
|---|---|---|---|
| PDP sample photograph | 966 × 644 (960 file, **upscaled**) | 638 × 425 (960 file) | non-upscaled, fits 40rem column |
| PDP sample (390) | 340 × 227 | 349 × 233 | column width on a phone, no upscale |
| Home service lead photo | 330 × 220 | 303 × 202 | number now leads the row |
| Home About photo | 252 × 212 | 254 × 213 | was already right-sized |
| `/products` card | 448 × 336 (**440 file stretched**) | 448 × 336 (880 file) | hint now matches the column |
| `/gallery` grounds feature | 958 × 555 (**940 file stretched**) | 938 × 543 (940 file) | cap = native width |
| Home rail lead picture | 299 × 399 img in a 224 box | 299 × 224 | object-fit now lines up |

### Page / section heights

| Page | Before | After |
|---|---|---|
| Home @ 1440 | 5338 px | 5032 px |
| Home @ 390 | 8259 px | 7501 px |
| Services band @ 1440 | 834 px | 736 px |
| Services band @ 390 | 1360 px | 1002 px |

### The middle-section word count (services + plans prose)

| Copy | Before | After |
|---|---|---|
| Services + Plans prose (`intro` + card lines) | 100 words | 52 words |
| Whole home field prose | 239 words | 127 words |

### Screenshots (`shots/`)

- `home-1440-{before,after}.webp`, `home-390-{before,after}.webp` — the hero.
- `services-1440-{before,after}.webp`, `services-390-{before,after}.webp` — the
  "What we do / Services we offer" band.
- `pdp-1440-{before,after}.webp`, `pdp-390-{before,after}.webp` — the sample
  photograph.

## Where the reference conflicts (kept ours)

- The reference hero is a solid navy panel; the product's public brand is **sky
  blue** (captain 2026-09-16) — kept sky, no new palette.
- The reference's "Services in full detail" is six editorial services; the home
  sells the **four live-priced lot families**. Kept ours and kept the figures
  live — the reference's service list belongs to `/services`.
- The reference's left/right rails are compact only; our rails carry one lead
  card each (staff-editable `featured`) — kept the feature, fixed its sizing.

## Rules preserved

Tokens and the kit only; one face (Inter) with the hero as a treatment, so
`tests/unit/typography-system.test.ts` is untouched; live prices unchanged; one
`h1` per route; honesty states (sample chips, illustration notes, placeholder
chapel state) preserved; no new visual language.
