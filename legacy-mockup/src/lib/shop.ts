// ============================================================================
// shop.ts — LEGACY COMPATIBILITY SHIM. The canonical catalogue and money
// helpers now live in catalog.ts (the "admin's shelf") and store.tsx (editable
// context). This file re-exports the shared helpers so existing consumers keep
// working. New code should import money/parseMoney from "./catalog".
// ============================================================================

export { money, parseMoney } from "./catalog";
