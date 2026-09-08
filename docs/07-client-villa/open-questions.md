# Open Business Decisions (Pending Villa Confirmation)

From blueprint §72 + gaps found during corpus review:

## Catalog & pricing
- [ ] Exact service/product catalog and initial pricing
- [ ] Actual chapel names, capacities, rates
- [ ] Actual park sections/blocks/lot dimensions and legal property model (needed for GIS)
- [ ] Lot ownership/rights terminology and legal documentation ("interment rights only" vs ownership)

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

## Process rule
Never mark a feature "not needed" by developer preference. If business clarification is required,
create a clearly identified decision item for Villa Memorial (owner: JBR as product owner).
