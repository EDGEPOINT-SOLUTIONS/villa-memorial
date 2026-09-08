# AGENTS.md — 01 Product

## Scope
Why the product exists, who it serves, how it is packaged and sold. Strategic/commercial layer.

## Key decisions captured here
- Product category: **Funeral & Memorial Services Management Platform** (broader than "funeral home ERP")
  so it can span funeral homes, memorial parks, chapels, crematoriums, cemeteries, pre-need companies,
  merchandise, and integrated groups.
- First client (Villa Memorial) = **first implementation / reference tenant**, not product definition.
- Packaging: Core / Professional / Enterprise + optional modules; pricing deferred.
- Every feature classified: Core SaaS · Configurable SaaS · Optional Module · Integration ·
  Client-specific · Future roadmap.

## Files
- `product-vision.md` — vision, target market, core principles, anti-goals
- `saas-strategy.md` — build-once/configure-many, stages, overfitting guards
- `packaging-commercialization.md` — tiers, modules, commercialization tests

## Agent guidance
When evaluating any new feature request, first place it in one of the six classifications above and
record why. Challenge requirements that reduce reusability.
