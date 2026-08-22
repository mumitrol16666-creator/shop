import { commerceError } from "./errors";
import type { OrderStatus } from "./types";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["pending_contact", "awaiting_payment", "cancelled"],
  pending_contact: ["awaiting_payment", "paid", "cancelled", "expired"],
  awaiting_payment: ["payment_reported", "paid", "cancelled", "expired"],
  payment_reported: ["paid", "cancelled", "expired"],
  paid: ["processing"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
};

export const canTransitionOrder = (
  from: OrderStatus,
  to: OrderStatus,
  actorType: "customer" | "admin" | "provider" | "system",
) => {
  if (!transitions[from].includes(to)) return false;
  if (to === "paid" && actorType !== "admin" && actorType !== "provider") {
    return false;
  }
  return true;
};

export function assertOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
  actorType: "customer" | "admin" | "provider" | "system",
) {
  if (!canTransitionOrder(from, to, actorType)) {
    throw commerceError(
      "FORBIDDEN_TRANSITION",
      `Переход заказа ${from} → ${to} запрещён.`,
      { recoverable: false, details: { from, to, actorType } },
    );
  }
}
