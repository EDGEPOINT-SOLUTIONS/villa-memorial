#!/usr/bin/env bash
# Stages the prototype's images into this folder so docs/prototypes/villa-home-ui/
# home.html and package.html render exactly as reviewed.
#
# The binaries are NOT committed: they are the client's supplied media (kept in
# the read-only client library) plus copies already shipped in public/media.
# Point VILLA_CLIENT_MEDIA at the client library if it lives somewhere else.
#
#   ./stage-assets.sh && python3 -m http.server 4180   # from the repo root
#   open http://127.0.0.1:4180/docs/prototypes/villa-home-ui/home.html
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
PUBLIC="$REPO/public/media"
CLIENT="${VILLA_CLIENT_MEDIA:-/home/gab/firstmate/projects/villa-memorial/public/media/VILLA MEMORIAL PROJECT 2026}/VILLA MEMORIAL PROJECT 2026"
DOCS="$CLIENT/CLIENT DOCS VILLA MEMORIA"

copied=0
copy() { # copy <source> <name-in-this-folder>
  if [ -f "$1" ]; then
    cp "$1" "$HERE/$2"
    echo "  ✓ $2"
    copied=$((copied + 1))
  else
    echo "  – not found, skipped: $1"
  fi
}

echo "From the repo's public/media:"
copy "$PUBLIC/hero-1.jpg" img-hero-gate.jpg
copy "$PUBLIC/plan-packages.png" img-promo-card.png
copy "$PUBLIC/lot-primary.png" img-primary-lot.png
copy "$PUBLIC/lot-premium.png" img-premium-lots.png
copy "$PUBLIC/lot-garden-niches.png" img-garden-niches.png
copy "$PUBLIC/lot-mausoleum.png" img-mausoleum.png
copy "$PUBLIC/the very first memorial park in basilan.jpg" img-pavilion.jpg
copy "$PUBLIC/bronze-casket.jpg" bronze-casket.jpg
copy "$PUBLIC/silver-casket.jpg" silver-casket.jpg
copy "$PUBLIC/gold-casket.jpg" gold-casket.jpg
copy "$PUBLIC/logo-sanctuario.png" logo-sanctuario.png
copy "$PUBLIC/logo-villa-group.png" logo-villa-group.png
copy "$PUBLIC/logo-villa-agency.png" logo-villa-agency.png

echo "From the client library ($CLIENT):"
copy "$CLIENT/CLIENT DOCS VILLA MEMORIA/Website Proposed Images/Park map.png" img-park-map.png
copy "$CLIENT/Divine Rest.jpg" img-casket-divine-rest.jpg
copy "$CLIENT/Heaven_s Gate.jpg" img-casket-heavens-gate.jpg
copy "$CLIENT/Everlasting.jpg" img-casket-everlasting.jpg
copy "$CLIENT/Serenity full glcass.jpg" img-casket-serenity.jpg
copy "$CLIENT/Serenity full gass 2.jpg" img-casket-detail.jpg
copy "$CLIENT/our services (5).jpg" img-service-viewing-lux.jpg
copy "$CLIENT/our services (2).jpg" img-service-viewing.jpg
copy "$CLIENT/our services (4).jpg" img-service-stage.jpg
copy "$CLIENT/urn set up.jpg" img-service-urn.jpg
copy "$CLIENT/creamation urn set up.jpg" img-service-cremation.jpg
copy "$CLIENT/Karwahe.jpg" img-karwahe.jpg
copy "$CLIENT/karwahe (2).jpg" img-karwahe-2.jpg
copy "$CLIENT/Tribute (5).jpg" img-tribute-video.jpg
copy "$CLIENT/Tribute.jpg" img-tribute-wake.jpg
copy "$DOCS/PRICE LIST FOR 2026.jpg" doc-price-list-2026.jpg
copy "$DOCS/COMPLETE MEMORIAL PACKAGE.jpg" doc-complete-package.jpg
copy "$DOCS/TYPES OF COFFIN.jpg" doc-types-of-coffin.jpg
copy "$DOCS/SERVICES WE OFFER.jpg" doc-services-we-offer.jpg

# Price-list sheets II/III exist only as PDFs; render page 1 when a converter is
# available, otherwise the two evidence figures in package.html stay unstaged.
render_pdf() { # render_pdf <pdf> <out.jpg>
  if [ ! -f "$1" ]; then echo "  – not found, skipped: $1"; return; fi
  if command -v pdftoppm >/dev/null 2>&1; then
    pdftoppm -jpeg -r 110 -f 1 -l 1 -singlefile "$1" "${2%.jpg}" && echo "  ✓ $2"
  elif python3 -c "import pymupdf" 2>/dev/null; then
    python3 - "$1" "$2" <<'PY'
import sys, pymupdf
doc = pymupdf.open(sys.argv[1])
pix = doc[0].get_pixmap(dpi=110)
pix.save(sys.argv[2])
PY
    echo "  ✓ $2"
  else
    echo "  – no PDF rasteriser (pdftoppm/pymupdf), skipped: $2"
  fi
}
echo "Price-list sheets II/III (PDF):"
render_pdf "$DOCS/PRICE LIST FOR 2026 II.pdf" doc-price-list-2026-II.jpg
render_pdf "$DOCS/PRICE LIST FOR 2026 III.pdf" doc-price-list-2026-III.jpg

echo
echo "Staged $copied images. Serve the repo root with a static server and open:"
echo "  docs/prototypes/villa-home-ui/home.html     (home page mock)"
echo "  docs/prototypes/villa-home-ui/package.html  (package page mock)"
