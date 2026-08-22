import type { PublicOrder } from "./types";
import { fulfilmentLabels, paymentLabels, type CheckoutPaymentMethod, type FulfilmentMethod } from "./checkout";

const escapeHtml = (value: string) => value.replace(/[&<>]/g, (symbol) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[symbol]!);
const money = (value: number) => new Intl.NumberFormat("ru-RU").format(value);

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.warn("mystore_info_skipped", { reason: "telegram_not_configured" });
    return false;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!response.ok) console.error("mystore_info_failed", { status: response.status });
    return response.ok;
  } catch (error) {
    console.error("mystore_info_failed", { error: error instanceof Error ? error.message : "unknown" });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function notifyNewOrder(order: PublicOrder, origin: string, phone: string) {
  const fulfilment = fulfilmentLabels[order.fulfilmentMethod as FulfilmentMethod] || order.fulfilmentMethod;
  const payment = paymentLabels[order.paymentMethod as CheckoutPaymentMethod] || order.paymentMethod;
  const address = order.customer.deliveryAddress ? `\n📍 ${escapeHtml(order.customer.deliveryAddress)}` : "";
  const contactTime = order.customer.preferredContactTime ? `\n🕐 Связаться: ${escapeHtml(order.customer.preferredContactTime)}` : "";
  const lines = order.items.map((item) => `• ${escapeHtml(item.title)} × ${item.quantity}`).join("\n");
  return sendTelegram(
    `<b>🛒 Новый заказ ${escapeHtml(order.displayId)}</b>\n` +
    `${lines}\n\n<b>${money(order.totals.final)} ₸</b> · ${escapeHtml(payment)}\n` +
    `${escapeHtml(fulfilment)}${address}${contactTime}\n` +
    `Клиент: ${escapeHtml(order.customer.name)} · ${escapeHtml(phone)}\n` +
    `<a href="${escapeHtml(`${origin}/order/${order.publicToken}`)}">Открыть заказ</a>`,
  );
}

export function notifyPaymentReported(order: PublicOrder, origin: string) {
  return sendTelegram(
    `<b>💳 Оплата отправлена на проверку</b>\nЗаказ ${escapeHtml(order.displayId)} · <b>${money(order.totals.final)} ₸</b>\n` +
    `<a href="${escapeHtml(`${origin}/order/${order.publicToken}`)}">Открыть заказ</a>`,
  );
}
