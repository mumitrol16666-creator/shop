# Maestro Music Store — Commerce Core (Stage 1)

Stage 1 replaces client-trusted price, stock and payment state with one shared
commerce domain. It deliberately does not change information architecture or
redesign the storefront.

## Runtime flow

```text
Product storage (D1 or VPS products.json)
  → ProductReadModel
  → shared pricing/configuration validation
  → versioned local CartDraft (identifiers only)
  → POST /api/cart/validate
  → POST /api/orders + Idempotency-Key
  → order/item/payment/history snapshots
  → stock reservation
  → payment_reported
  → trusted admin/provider confirmation to paid
```

The framework/Sites runtime uses D1. The VPS runtime uses the same TypeScript
domain bundled to `dist-vps/commerce-core.cjs`; its state is written atomically
to `.runtime-data/commerce.json`. One PM2 instance plus a serialized mutation
queue prevents concurrent file-state writes.

## CRM mapping

| Commerce concept | Existing operational source | Stage 1 mapping |
| --- | --- | --- |
| Product | D1 `products` / VPS `products.json` | Immutable `id` and unique `sku` |
| Variant and stock | D1 `product_variants` / `variantItems` | Unique variant SKU; available = physical − reserved |
| Price | D1 `product_pricing` / product and variant price | Shared `PriceBreakdown` with `pricingVersion` |
| Bundle/course | Existing product bundle flags | Explicit bundle and component SKUs in read model and snapshot |
| Customer/order/payment | No reusable shop-order tables were present | Additive commerce tables/state; future CRM sync can consume order/status history |

## API

- `GET /api/catalog` — canonical public catalog read models.
- `GET /api/products/:slug` — one canonical product read model.
- `POST /api/cart/validate` — authoritative price/configuration/stock reconciliation.
- `POST /api/orders` — server order creation; requires `Idempotency-Key`.
- `GET /api/orders/:publicToken` — customer-safe snapshot without phone/comment/internal metadata.
- `POST /api/orders/:id/payment-report` — customer may only report payment.
- `POST /api/admin/orders/:id/confirm-payment` — authenticated trusted transition to `paid`.
- `POST /api/admin/orders/:id/cancel` — authenticated cancellation and reservation release.

## Migration and backup

The D1 migration is additive: `orders`, `order_items`, `payments`,
`order_status_history`, `stock_reservations`, and `product_pricing.pricing_version`.
It adds unique keys, foreign keys, checks, indexes and stock reservation triggers.
There are no destructive statements and no existing row rewrite.

Before a production migration, retain the provider database backup/restore point
and record the previous Sites version. VPS data remains in `.runtime-data`; each
atomic write keeps the preceding `commerce.json.bak`.

## Rollback

1. Redeploy the preceding Sites version and revert the VPS commit.
2. Set `COMMERCE_CORE_V2=0` only together with the preceding frontend bundle if
   an emergency API shutdown is needed.
3. Keep additive tables and `.runtime-data/commerce.json`; they are ignored by
   Stage 0 and preserve order history. Do not drop commerce tables during an
   application rollback.
4. If the migration itself must be reversed in a non-production copy, export
   commerce rows first, drop Stage 1 triggers/tables, then rebuild the database
   from the pre-migration backup. Production rollback should prefer restore.

The feature flag is temporary and should be removed after one stable production
release and Stage 2 acceptance.

## Reservation policy

- Initial reservation: `COMMERCE_RESERVATION_TTL_MINUTES`, default 30 minutes.
- After customer payment report: `COMMERCE_REPORTED_RESERVATION_TTL_MINUTES`,
  default 1,440 minutes.
- D1 protects last stock with an atomic trigger inside the batch transaction.
- VPS protects last stock with a single-process serialized mutation queue.

## Safe production smoke

The hidden `TEST-STAGE1-SMOKE` SKU is available only when both `testMode: true`
and `x-maestro-smoke-test: stage1` are present. It is excluded from the public
catalog and cannot change real product stock.
