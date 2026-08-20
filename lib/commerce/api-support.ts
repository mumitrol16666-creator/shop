import { getD1Binding } from "../../db";
import { readCatalog } from "../../app/api/products/route";
import { buildCatalogReadModels, stage1SmokeProduct } from "./catalog";
import { ensureSeedCatalogInD1 } from "./d1-catalog";
import { CommerceDomainError, toErrorResponse } from "./errors";
import type { CommerceD1 } from "./d1-store";
import type { ProductReadModel } from "./types";

export const noStoreHeaders = { "Cache-Control": "no-store" };

export function commerceD1(): CommerceD1 | null {
  return getD1Binding() as CommerceD1 | null;
}

export function isSmokeRequest(request: Request, requested: boolean) {
  return requested && request.headers.get("x-maestro-smoke-test") === "stage1";
}

export async function commerceCatalog(options?: {
  includeSmoke?: boolean;
}): Promise<ProductReadModel[]> {
  const d1 = commerceD1();
  if (d1) await ensureSeedCatalogInD1(d1);
  const products = buildCatalogReadModels(await readCatalog(false));
  return options?.includeSmoke ? [...products, stage1SmokeProduct()] : products;
}

const statusByCode: Record<string, number> = {
  INVALID_REQUEST: 400,
  PRODUCT_NOT_FOUND: 404,
  VARIANT_REQUIRED: 409,
  VARIANT_NOT_FOUND: 409,
  VARIANT_OUT_OF_STOCK: 409,
  INSUFFICIENT_STOCK: 409,
  INVALID_BUNDLE: 409,
  INVALID_COMPONENT: 409,
  PRICE_CHANGED: 409,
  CART_INVALID: 409,
  ORDER_NOT_FOUND: 404,
  ORDER_EXPIRED: 410,
  PAYMENT_ALREADY_REPORTED: 409,
  PAYMENT_METHOD_NOT_REPORTABLE: 409,
  FORBIDDEN_TRANSITION: 409,
  IDEMPOTENCY_REQUIRED: 400,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function commerceFailure(error: unknown) {
  const shape = toErrorResponse(error);
  const status =
    error instanceof CommerceDomainError ? statusByCode[shape.error.code] ?? 400 : 500;
  if (status >= 500) console.error("commerce_api_error", { code: shape.error.code });
  return Response.json(shape, { status, headers: noStoreHeaders });
}

export function requiredIdempotencyKey(request: Request) {
  return request.headers.get("idempotency-key")?.trim() ?? "";
}

export const reservationTtlMinutes = () =>
  Math.max(5, Number(process.env.COMMERCE_RESERVATION_TTL_MINUTES || 30));

export const reportedReservationTtlMinutes = () =>
  Math.max(30, Number(process.env.COMMERCE_REPORTED_RESERVATION_TTL_MINUTES || 1440));
