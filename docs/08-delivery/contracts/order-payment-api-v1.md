# Frozen cross-track contract — KEB-M0-10
# Order/payment/catalog API v1 — producer: Track A (Keb) · consumer: Track C experience layer (Gab)

## Status
**FROZEN as of Mon Aug 24** for M0/M1. Reference implementation:
`app/controllers/api/v1/{catalog_items,orders}_controller.rb` (+ request tests locking the shapes).
Contract changes require a PR reviewed by Gab; bump the version namespace (`/api/v2/…`),
never edit `/api/v1/` shapes in place.

## Scope
The JSON surface Gab's public pages build against so Track C never blocks on Track A:
catalog reads, checkout, order lookup, and the sandbox payment behavior behind them.
Track B consumes the *event*, not this API (see `order-fulfilled-event.md`).

## Transport & tenancy rules
1. All endpoints live under `/api/v1/` on the tenant subdomain
   (`villa.staging.example.com/api/v1/catalog_items`). Tenant resolves from subdomain;
   bare-domain requests fall back to `DEFAULT_TENANT_SLUG` (staging sets it to `villa`).
   Unknown tenant → plain **404**, never unscoped data.
2. No session/auth on these endpoints. CSRF cookie checks are skipped for `POST /orders`
   (machine clients); M1 payment webhooks will instead require signature verification.
3. The **order number acts as a capability token**: anyone holding `ORD-YYYY-NNNNN` can
   read that one order. Nothing else is enumerable. Numbers are cross-tenant safe —
   a valid-format number from another tenant still 404s.
4. Money is **integer centavos** (`*_cents`) + ISO 4217 `currency`. Never floats, never strings.

## Error shape (all endpoints)
Non-2xx responses are always exactly:

```json
{ "error": "<stable machine-readable message>" }
```

| Situation | Status | error value |
|---|---|---|
| Unknown catalog id/SKU | 404 | `"not_found"` |
| Malformed / foreign-tenant order number | 404 | `"not_found"` |
| Checkout validation or payment failure | 422 | human-readable cause string |

## Endpoints

### GET /api/v1/catalog_items?item_type={package|service|add_on}
Active items only (`draft`/`discontinued` are invisible). Optional filter repeats as needed.

```json
[
  {
    "id": 42,
    "sku": "PKG-BASIC",
    "name": "Basic Package",
    "description": "...",
    "item_type": "package",
    "unit_price_cents": 1500000,
    "currency": "PHP",
    "display_price": "₱15,000"
  }
]
```

`display_price` is presentation-only (locale-formatted); never parse it — use
`unit_price_cents` for math.

### GET /api/v1/catalog_items/:id_or_sku
Same single-item shape. Accepts numeric id **or** SKU interchangeably; 404 if not active.

### POST /api/v1/orders
Places an order and charges the sandbox adapter. Client-sent prices do not exist by design —
totals are recomputed server-side from the active catalog; prices snapshotted onto lines.

Request:

```json
{
  "customer": { "name": "Juan Dela Cruz", "email": "juan@example.test", "phone": "+639171234567" },
  "items": [ { "sku": "PKG-BASIC", "quantity": 1 } ]
}
```

Rules: ≥ 1 item; quantity positive integer; duplicate SKUs merge server-side;
customer matched/upserted per-tenant by email. Response **201**:

```json
{
  "number": "ORD-2026-00042",
  "status": "paid",
  "customer_name": "Juan Dela Cruz",
  "total_cents": 1500000,
  "currency": "PHP",
  "items": [
    {
      "catalog_item_id": 42,
      "item_type": "package",
      "sku": "PKG-BASIC",
      "name": "Basic Package",
      "quantity": 1,
      "unit_price_cents": 1500000
    }
  ],
  "placed_at": "2026-08-24T08:00:00.000Z",
  "event_uuid": "0b8f…" 
}
```

`status` is one of `pending | paid | cancelled`; M0 checkout returns synchronously as
`paid` (sandbox). `event_uuid` echoes the published `order.fulfilled` outbox row —
Gab may correlate the staff ops-board appearance against her confirmation UI.

### GET /api/v1/orders/:number
Reads one order back in the same shape minus `event_uuid`. 200 / 404 only.

## Payment behavior (M0)
Charging runs through the `Payments` adapter registry; staging/M0 uses the **fake**
adapter (always succeeds, deterministic). This is deliberate: no real money moves until
M1 wires the gateway integration at the edge. Webhook ingestion (idempotent via
`payment_reference` + signature verification) is an **M1 addendum** to this contract —
it will be appended, not substituted.

## Consumer rules (Gab)
1. Treat every field above as read-only; extra fields may appear over time — ignore them,
   don't crash on them (tolerant reader).
2. Never derive totals client-side; display `total_cents`/`unit_price_cents` as received.
3. Polling/refresh of order status should key on `number`, not internal ids.
