# The client's 2026 photographs — originals and provenance

Imported from the client's own folder ("VILLA MEMORIAL PROJECT 2026") by
`scripts/build-client-photos.mjs`. Every file here is the client's original,
byte-for-byte; the published derivatives live in `public/media/client/` and are
what the site actually serves. Re-run the script (with `--source <dir>`) to
rebuild them; each source file's md5 is pinned in the script, so a changed source
fails loudly.

This folder sits OUTSIDE `public/` on purpose. Seven of these photographs show
identifiable mourners at a real wake (one a named memorial screen), and a file
under `public/` is fetchable by URL even when no page links it; here they are
archived with their provenance and the server never serves one.

The full record of what each photograph shows — the description the mapping is
built on — is `lib/client-photos.ts`; the surfaces that use it are pinned by
`tests/unit/client-photos.test.ts`.

## Published (14)

- `casket-white-gold-glass-lid.jpg` — 4 web derivatives, 151 KB total
- `casket-white-gold-closed.jpg` — 4 web derivatives, 175 KB total
- `casket-white-gold-wreath-lid.jpg` — 3 web derivatives, 79 KB total
- `casket-wood-white-gold-bible-lid.jpg` — 3 web derivatives, 70 KB total
- `casket-white-open-lid.jpg` — 4 web derivatives, 198 KB total
- `casket-white-closed.jpg` — 3 web derivatives, 67 KB total
- `hearse-carriage-gold-side.jpg` — 3 web derivatives, 347 KB total
- `hearse-carriage-gold-rear.jpg` — 3 web derivatives, 305 KB total
- `chapel-hall-candle-pedestals.jpg` — 4 web derivatives, 137 KB total
- `chapel-hall-flags.jpg` — 4 web derivatives, 126 KB total
- `wake-setup-lamp-alcove.jpg` — 3 web derivatives, 147 KB total
- `wake-setup-casket-draped.jpg` — 3 web derivatives, 141 KB total
- `wake-setup-flower-bank.jpg` — 3 web derivatives, 197 KB total
- `wake-setup-dressing.jpg` — 3 web derivatives, 118 KB total

## Imported but NOT published (7)

These show identifiable mourners at a real wake (and one shows a named memorial
screen). They are preserved here with their provenance, but no page may publish
them and no derivative is written: the product's own rule for memorial material
is that nothing about a family is published without consent
(lib/memorials.ts). The captain can reverse this by adding them to the record
with `publish: true` once the client confirms consent.

- `wake-home-memorial-video.jpg`
- `wake-lantern-gathering.jpg`
- `wake-eulogy-speaker.jpg`
- `wake-evening-crowd.jpg`
- `wake-memorial-screen.jpg`
- `wake-night-visitation-a.jpg`
- `wake-night-visitation-b.jpg`

## Payload

Published derivatives total 2.21 MB across every
width; a page loads only the two or three it renders (see the PR's image
inventory).
