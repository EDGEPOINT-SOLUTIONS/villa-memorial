# Workflow Engine

## Why it's a differentiator
Different funeral companies run different sequences (e.g., Wake→Chapel→Embalming→Burial vs
Cremation→Viewing→Ceremony→Columbarium). A configurable workflow engine avoids rebuilding software
per client.

## Example funeral case lifecycle (NOT universal — configurable)
Inquiry → Lead → Arrangement → Case Creation → Planning → Service Selection → Scheduling →
Documentation → Service Delivery → Billing → Payment → Completion → Records/Archive → Follow-up

## Engine capabilities
Configurable stages · branching · approvals · required documents · required tasks · deadlines ·
notifications · dependencies · escalations · exceptions · cancellation · reopening · reassignment ·
assignments · automated actions · conditions.

## Interment workflow example (Villa blueprint §21)
Request → Verify Deceased → Verify Lot → Verify Ownership → Verify Payment → Verify Permits/Documents
→ Schedule → Assign Team → Prepare Grave → Interment → Update GIS/Deceased/Lot → Upload Documents → Close

## Critical state machines to define (PM plan §25)
Cart · Order · Payment · Quote · Service fulfillment · Chapel/resource booking · Vehicle dispatch ·
Funeral case · Embalming/preparation · Pre-need contract · Lot · Lot reservation · Ownership/transfer ·
Interment · Exhumation · Maintenance/work order · Document · Support ticket · Async AI request.

## Operational checklists (configurable checklist engine, no code changes)
- Embalming: identity, authorization, documents, preparation, embalming, dressing, cosmetics, final ID, release
- Interment: lot, ownership, payment, permit, schedule, grave prep, personnel, interment, record update
- Chapel: setup, cleanliness, equipment, family arrival, viewing start/end, teardown
- Vehicle: assignment, driver, route, dispatch, completion, maintenance issue

## Concurrency rule
Transactional integrity + concurrency controls prevent double booking (chapel/lot/vehicle), double
reservation, and conflicting ownership changes.
