# Notification ⓡ spec walkthrough notes

Gab's Day-1 walkthrough artifact (issue #24). Source specs:
`docs/04-modules/documents-contracts.md` §"Notifications engine" (blueprint §41),
§"Extended digital document capabilities", plus the ⓡ generic-language rule
(`docs/08-delivery/cp1-day-plan.md`, ADR-005).

## What the spec asks for (blueprint §41)

- **Channels:** SMS · email · in-app notifications (real providers deferred to Phase 2;
  CP-1 ships console delivery only).
- **Triggers seen in the corpus:** payment reminders (due/overdue), contract renewal,
  death-anniversary / birthday / All Souls' Day remembrance (`crm-cases.md` §46), case-stage
  updates, booking confirmations, document-ready notices, maintenance work orders.
- **Consent & privacy:** remembrance engagement is "designed around consent and privacy"
  (`crm-cases.md` §46) — consent state must gate outbound messages.
- **Templates:** per-tenant configurable templates with placeholder variables; tenant theming
  rule implies templates are configuration, never code.

## What ⓡ (generic-language rule) means for this service

ADR-005's two-layer model: the notification service is a *reusable platform layer*. It knows
about events, recipients, channels, templates, consent — it must know NOTHING about funerals.
Concretely:

- Event subscriptions are config: `order.fulfilled` → template X is a posting-rule-style
  mapping row, not an import of commerce types into the service.
- Vocabulary ban: no funeral/memorial/lot/chapel words in code, schemas, seeds, or API paths.
  Domain meaning lives in consuming adapters + template/rule config.
- Consequence for Phase-2 planning: "remembrance" campaigns are just scheduled-event rules +
  templates configured per tenant.

## Open questions for Keb (before any notification code gets written)

1. Which event types does the service subscribe to at CP-2 — is there a frozen list, or do we
   add subscription config per release?
2. Consent storage: owned by notification service or by the CRM/customer service?
3. Template variable contract: is there a schema for placeholder variables, or freeform strings?
4. Delivery-provider interface: one adapter interface (console now, SMS/email later) — where is
   its seam defined so Phase 2 doesn't touch core code?

## Status

Walkthrough complete — no code written yet. Implementation deferred to Aug 27+ per capacity
decision on issue #3 (screens first). Nothing above invents contracts; all questions route to
Keb before build starts.
