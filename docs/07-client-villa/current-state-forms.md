# Current-State Forms Analysis (Villa)

## 1. Funeral Service Contract (Funeraria Villa, 2025)
**Parties**: Funeraria Villa (Armando A. Villa) + CLIENT (+ optional Co-MAKER, jointly & severally liable).
**Header data captured**: deceased name/gender/date of death/civil status/DOB/senior-citizen flag;
client identity/address/contacts (incl. Facebook)/relationship to deceased/ID presented+number.
**Line items**: services rendered vs packaged deals — ROD, coffin types, embalming (days), lizo JR/SR,
delivery, pick-up, lights, interment, extension, others → total.
**Deductions block**: LGU guarantee (coffin/embalming days/others), DSWD/Senior Citizen,
SSS/GSIS ID, Life Plan/Insurance plan # → grand total after deductions.
**Key business rules extracted**:
- Payment due **9 days** after contract date unless extended (extension fees apply)
- Guaranteed instruments (LGU/DSWD/SSS/life plans/insurance/pre-need) must be submitted within **3 days**
- Failure ⇒ standard prices forfeit discounts + **10%/month interest**, immediately due
- **Special power of attorney**: Villa appointed to process/claim/encash burial benefits from government/private agencies
- Indemnity re: transport without embalming; attorney's fees ≥ ₱50,000; PH law; notarized.

## 2. Purchase Agreement — Sanctuario de Mercedes y Gloria (lot sales)
**Seller**: AA Villa Memorial Park Development Service. Property conveyed = "right for interment
purposes only" per maps on file.
**Classification options (2025)**: Mausoleum, Garden Niche, Lawn Lot–Family Garden, Lawn Lot–Prime,
Lawn Lot–Premium, Condo-type Vaults.
**Pricing fields**: basic price, total contract price, MCF (Memorial/Maintenance Care Fund),
VAT, amortization (years/months), mode: annual/semi/quarterly/monthly.
**Key business rules (2025 version)**:
- First amortization on signing = down payment, else treated as option money
- Default penalty **4% per month**; 60-day default ⇒ cancellation without court intervention
- Cancellation ⇒ seller may resell; prior payments retained as liquidated damages (restructuring at seller's option)
- Buyer-initiated cancellation refund less: reservation fee forfeiture + **30% liquidated damages** + broker commission + unpaid charges
- **No interment unless fully paid** (exception clause allows remains transfer to reserved space on default-after-interment)
- Exchange/substitute property within 30 days if no interment; credit = principal+maintenance paid less transfer fee/penalties
- Full payment + docs ⇒ **Deed of Sale + Certificate of Ownership**; transfer/assignment needs written seller consent
- Endowed Maintenance Care Fund (irrevocable); marker rules; exclusions list (interment fee, casket, opening/closing, vault, construction, taxes)
- Attorney's fees ≥ ₱20,000 (2025) / ≥ ₱50,000 (2026); venue Zamboanga City courts; notarized (4 pages)

⚠️ **2026 revision differences**: classification list changes (Lawn Lot Standard, Condo-type; drops Premium/Family Garden/Penthouse→"Condo-type"); adds "Interment (1st)/Funeral Bundle Inclusion" field;
**no-refund** buyer cancellation (60-day window to transfer/sell instead of refund schedule); notice
via email address rather than mailing address.

## 3. Purchase Application Form (+ 2026 combined version)
Buyer demographics incl. TIN, GSIS/SSS, Facebook account, employer info, beneficiaries (age,
relationship). Classification, block/lot no., pricing fields as above. Data-privacy consent clause
(DPA-style). Sales agent co-signature. 2026 version merges application + full agreement text into one document.

## 4. Provisional Receipt
Initial lot payment receipt: payer, amount (figures+words), lot no., receipt no./date, authorized rep
signature. Valid only if confirmed by official receipt; initial payment only. ⇒ implies OR issuance flow.

## 5. Villa Memorial Plan membership / COC (Eternal Plans)
Plan holder + beneficiary (legal spouse/children of legal age/parents/siblings), branch, coverage type
("Memorial Services within Eternal Plan's network of mortuary partners"), amount, COC no., coverage
start/end dates. Rules: benefit covers all causes of death but limited to Life Plan Value (excess billed
to planholder); transferable to living person; exclusive-planholder services rendered by accredited
mortuaries; request only via hotline (never directly to a mortuary); unrendered service ⇒ **70% of
Life Plan Value** as cash benefit; coverage starts 12:01 noon PST, 1-year term. Includes insurance
application health declarations + DPA consent (marketing/research purposes listed).

## Digitization implications
- Every field above becomes structured data capture (no free-text scans)
- Deductions/guarantees need a claims/instrument tracking sub-ledger
- Penalty rates, grace periods, forfeiture and refund matrices are tenant-configurable rules — with
  effective-date versioning because terms changed 2025→2026
- SPA for claims processing = document generation + e-signature workflow
- Provisional-receipt→official-receipt confirmation chain = payment reconciliation workflow
