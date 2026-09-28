# Open Business Decisions (Pending Villa Confirmation)

From blueprint §72 + gaps found during corpus review:

## Catalog & pricing
- [ ] Exact service/product catalog and initial pricing
- [ ] Actual chapel names, capacities, rates
- [ ] Actual park sections/blocks/lot dimensions and legal property model (needed for GIS)
- [ ] Lot ownership/rights terminology and legal documentation ("interment rights only" vs ownership)
- [ ] **Photograph ↔ price-sheet model reconciliation (opened by the 2026-09-19 imagery pass).**
      The 21 photographs the client supplied are named Tribute, Serenity, Everlasting, Divine Rest
      and Heaven's Gate — none of which is a 2026 sheet model name (White Rose, Angelica, Magnolia,
      Noble, Royal, Monarch, Majesty, Emperor, Imperial, Lumina). Every catalogue card therefore
      publishes its photograph as a LABELLED SAMPLE (`lib/client-photos.ts`, `lib/media.ts`'s
      `CASKET_MODEL_PHOTOS`), never as "the White Rose Full"; six casket photographs cover the 24
      models. Confirm which photograph is which model — and whether the seven Tribute-series wake
      photographs that show identifiable mourners (held back from publication) may be published.

## Contracts & finance
- [ ] Pre-need plan terms, transferability, assignability
- [ ] Refund/cancellation rules — **resolve 2025 vs 2026 agreement divergence**
- [ ] Installment rules and grace periods
- [ ] Payment gateways to integrate
- [ ] Accounting system/integration requirements; tax treatment by transaction type

## Track B (lot purchase application) — raised by the digitization build, FORMS_PLAN gap 2
- [ ] **Purchase-application/sale-financing record shape (dev freeze).** No contract under
      `docs/08-delivery/contracts/` names an application record or a sale's MCF/VAT/total/
      mode/amortisation terms; the capture UI in this repo uses a PROVISIONAL shape invented
      from Villa's papers (flagged in `lib/contracts/purchase-application.ts` and its
      fixture). Waits on a dev freeze before any service stores/posts it.
- [ ] **`Lot.type` vs Villa's classification vocabulary.** The frozen lot type
      (individual/family/estate) cannot express the papers' lists (Mausoleum, Garden Niche,
      Lawn Lot–Prime/Standard/Premium/Family Garden, Condo-type…), and the two paper
      revisions list different products. The application captures Villa's word per revision;
      reconciling the platform lot type with Villa's actual park sections/price list is a
      dev/data question.

## Track C (provisional receipt) — raised by the digitization build, FORMS_PLAN gap 3
- [ ] **The client's signed Provisional Receipt paper.** It is not in
      `docs/07-client-villa/paper-forms/`, and that folder's rule is "the paper wins", so the
      digitized slip (`lib/contracts/provisional-receipt.ts`) records the same information
      (payer · amount · instrument · invoice/order/case · received by · date) and prints a bold
      "not an official receipt" line rather than reproducing a form nobody has seen. Send the
      real paper and the sheet can match it.
- [ ] **Provisional-receipt record/endpoint (dev freeze).** No contract under
      `docs/08-delivery/contracts/` names a provisional-receipt record, so its POST body/response
      are app-authored and live mode answers 503; fixture mode keeps the durable journal
      (`lib/api-client/provisional-receipts-store.ts`).
- [ ] **Official-receipt linkage.** The OR display state finds a repository receipt that names
      the invoice/order/case; the frozen documents shape has no invoice field, so today only the
      row title carries it. A generated receipt row should name the invoice it settles.

## Operations & governance
- [ ] Notification channels and providers
- [ ] Digital-signature provider and legally valid document types
- [ ] Privacy policy, retention schedule, data classification (DPA/NPC)
- [ ] AI governance and human-approval requirements
- [ ] Public memorial search/privacy rules
- [ ] Branch structure
- [ ] Service-level agreements
- [ ] Commission rules and rates
- [ ] Environmental/community programs to activate (memorial tree program etc.)

## Track D (location map) — raised by the map-integration build (minutes 2026-09-21, item 6)
- [ ] **The exact park pin / coordinates, and whether a live embed is wanted.** The site publishes a
      STATIC location card (`lib/location-map.ts`, `components/public/location-block.tsx`) built from
      the recorded letterhead addresses, with "Get directions" opening the address in Google Maps or
      Apple Maps. The minutes ask for a location that is "accurate and approved by the client": please
      confirm (a) the exact pin/coordinates (or that the free-text recorded address is the approved
      one), and (b) whether an embedded interactive map is desired — an embed needs either an approved
      lat/long (OpenStreetMap) or a Google Maps API key and a consent decision. No coordinates were
      invented; the card is labelled static meanwhile.

## Track E (payment due notice) — raised by the 2026-09-28 minutes verification (minutes item 1)
- [ ] **Is an out-of-system reminder required, or is the in-portal notice the agreed scope?**
      The two-day rule (`PAYMENT_DUE_SOON_DAYS = 2`, `lib/payment-schedule.ts`) and the family
      portal's notice are real and single-sourced, but **nothing is ever sent**: there is no
      scheduler and no external channel wired (`lib/payment-reminder-channels.ts` adapters = [],
      only `in_app`). The minute's own wording is conditional ("where supported, **may** be
      delivered through other configured notification channels"); please confirm whether the
      client expects an email/SMS reminder — which waits on the platform's P4 notification
      service and a provider decision — or whether the in-portal notice satisfies item 1. Until
      answered, no surface claims a reminder "will be sent".

## Process rule
Never mark a feature "not needed" by developer preference. If business clarification is required,
create a clearly identified decision item for Villa Memorial (owner: JBR as product owner).
