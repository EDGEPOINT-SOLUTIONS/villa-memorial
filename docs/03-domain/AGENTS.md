# AGENTS.md — 03 Domain

## Scope
The funeral/memorial services domain model: entities, relationships, business models the platform
must accommodate, and bounded-context groupings.

## Key decisions captured here
- Domain model is a *candidate inventory* — determine required/optional/generalized per tenant; do
  not implement blindly.
- Business models A–F range from single home to fully integrated group; platform must support all
  via module activation.
- Key modeling rule: **customer ≠ deceased**; memorial lots are property/assets, not products.

## Files
- `domain-model.md` — entity inventory + core relationship patterns
- `business-models.md` — Models A–F and module activation implications

## Agent guidance
When adding an entity, check the inventory first to avoid duplicates; generalize before specializing.
