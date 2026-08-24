const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

// Load .env file (if present) — only sets vars not already in process.env
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  }
} catch { /* .env is optional */ }

const commerceCore = require("./dist-vps/commerce-core.cjs");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, ".runtime-data");
const DATA_FILE = path.join(DATA_DIR, "products.json");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const COMMERCE_FILE = path.join(DATA_DIR, "commerce.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const SEED_PRODUCTS_FILE = path.join(__dirname, "data/products.json");
const SEED_COURSES_FILE = path.join(__dirname, "data/courses.json");
const SESSION_COOKIE = "maestro_admin_session";
const SESSION_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days (~6 months)
const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || "6ec46d8955935973cd4e4089f7ebf149";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "914d0810c4fd1aa5e6c6b401bec3a3449645ea9a46e8f5061813be7cc5be1ba097ee32648fa9644bbb20af2e4346f08bcda2d9c385f080eb28cf72cf48fcbc2d";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "880a5dcaa082dff12c0636a5356cf659b56706ddb1323aec3582239eb003e184";
const loginAttempts = new Map();
const commerceAttempts = new Map();
const COMMERCE_CORE_V2 = process.env.COMMERCE_CORE_V2 !== "0";
let commerceMutationQueue = Promise.resolve();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

function isCompressible(type) {
  return /text|javascript|json|svg|css/i.test(type || "");
}

function applySecurityHeaders(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if ((req.headers["x-forwarded-proto"] || "").includes("https")) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function escapeTelegramHtml(value) {
  return String(value || "").replace(/[&<>]/g, (symbol) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[symbol]);
}

async function sendMyStoreInfo(text) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const rawChatIds = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  if (!token || !rawChatIds) {
    console.warn("mystore_info_skipped", { reason: "telegram_not_configured" });
    return false;
  }
  const chatIds = rawChatIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chatIds.length === 0) return false;

  let anySuccess = false;
  for (const chatId of chatIds) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        anySuccess = true;
      } else {
        const errorData = await response.text();
        console.error("mystore_info_failed", { chatId, status: response.status, error: errorData });
      }
    } catch (error) {
      console.error("mystore_info_failed", { chatId, error: error?.message || "unknown" });
    }
  }
  return anySuccess;
}

function adminOrderUrl(req, order) {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "shop.maestro.com.kz").split(",")[0].trim();
  return `${proto}://${host}/admin/orders?order=${encodeURIComponent(order.orderId)}`;
}

function parseCookies(req) {
  const result = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key) result[key] = decodeURIComponent(value.join("="));
  }
  return result;
}

function signSession(expiresAt) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(String(expiresAt)).digest("hex");
}

function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${expiresAt}.${signSession(expiresAt)}`;
}

function isAdminRequest(req) {
  let token = parseCookies(req)[SESSION_COOKIE] || "";
  if (!token) {
    const authHeader = String(req.headers["authorization"] || "");
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      token = String(req.headers["x-admin-token"] || "").trim();
    }
  }
  if (!token) return false;
  const [expiresRaw, signature = ""] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) return false;
  const expected = signSession(expiresRaw);
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function sessionCookie(req, token, maxAge = SESSION_TTL_SECONDS) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function verifyPassword(password) {
  const actual = crypto.scryptSync(String(password || ""), ADMIN_PASSWORD_SALT, 64);
  const expected = Buffer.from(ADMIN_PASSWORD_HASH, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function loginAllowed(req) {
  const key = clientIp(req);
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  return current.count < 8;
}

function recordFailedLogin(req) {
  const key = clientIp(req);
  const current = loginAttempts.get(key) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
  current.count += 1;
  loginAttempts.set(key, current);
}

function clearFailedLogins(req) {
  loginAttempts.delete(clientIp(req));
}

function commerceRateAllowed(req) {
  const key = clientIp(req);
  const now = Date.now();
  const current = commerceAttempts.get(key);
  if (!current || current.resetAt <= now) {
    commerceAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 30;
}

function requireAdmin(req, res) {
  if (isAdminRequest(req)) return true;
  sendJson(res, 401, { error: "Требуется вход администратора" });
  return false;
}

function publicProduct(product) {
  if (!product || typeof product !== "object") return product;
  const { adminPricing: _adminPricing, supplierName: _supplierName, supplierProductUrl: _supplierUrl, ...safe } = product;
  if (Array.isArray(safe.variantItems)) {
    safe.variantItems = safe.variantItems.map((variant) => {
      const { adminPricing: _variantPricing, ...publicVariant } = variant || {};
      return publicVariant;
    });
  }
  return safe;
}

function publicProducts(products) {
  return products
    .filter((product) => !product.publicationStatus || product.publicationStatus === "published")
    .map(publicProduct);
}

function ensureRuntimeFile(target, seed) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) {
    if (fs.existsSync(seed)) fs.copyFileSync(seed, target);
    else fs.writeFileSync(target, "[]\n", "utf-8");
  }
}

function writeJsonAtomic(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  const backup = `${target}.bak`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  if (fs.existsSync(target)) fs.copyFileSync(target, backup);
  fs.renameSync(temp, target);
}

ensureRuntimeFile(DATA_FILE, SEED_PRODUCTS_FILE);
ensureRuntimeFile(COURSES_FILE, SEED_COURSES_FILE);
fs.mkdirSync(path.dirname(COMMERCE_FILE), { recursive: true });
if (!fs.existsSync(COMMERCE_FILE)) {
  writeJsonAtomic(COMMERCE_FILE, commerceCore.emptyCommerceStoreState());
}
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function serveStaticFile(req, res, filePath, contentType, isHtml = false) {
  try {
    const acceptEncoding = String(req.headers["accept-encoding"] || "");
    const acceptHeader = String(req.headers["accept"] || "");
    const isApplicationBundle = /^bundle\.(?:js|css)$/.test(path.basename(filePath));
    const isMedia = /\.(?:png|jpe?g|webp|svg|ico|woff2?|ttf)$/i.test(filePath);

    let targetPath = filePath;
    let targetContentType = contentType;
    if (acceptHeader.includes("image/webp") && /\.(?:png|jpe?g)$/i.test(filePath)) {
      const webpAlternative = filePath.replace(/\.(?:png|jpe?g)$/i, ".webp");
      if (fs.existsSync(webpAlternative)) {
        targetPath = webpAlternative;
        targetContentType = "image/webp";
      }
    }

    const targetStat = fs.statSync(targetPath);
    const etag = `"${targetStat.size.toString(16)}-${Math.floor(targetStat.mtimeMs).toString(16)}"`;

    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, {
        "ETag": etag,
        "Cache-Control": isMedia ? "public, max-age=31536000, immutable" : "no-cache",
      });
      res.end();
      return;
    }

    const headers = {
      "Content-Type": targetContentType,
      "ETag": etag,
      "Cache-Control": isHtml || isApplicationBundle
        ? "no-cache, must-revalidate"
        : isMedia
          ? "public, max-age=31536000, immutable"
          : "public, max-age=86400",
    };

    const rawStream = fs.createReadStream(targetPath);

    if (/\bbr\b/.test(acceptEncoding) && isCompressible(targetContentType)) {
      headers["Content-Encoding"] = "br";
      res.writeHead(200, headers);
      rawStream.pipe(zlib.createBrotliCompress()).pipe(res);
    } else if (/\bgzip\b/.test(acceptEncoding) && isCompressible(targetContentType)) {
      headers["Content-Encoding"] = "gzip";
      res.writeHead(200, headers);
      rawStream.pipe(zlib.createGzip()).pipe(res);
    } else {
      headers["Content-Length"] = targetStat.size;
      res.writeHead(200, headers);
      rawStream.pipe(res);
    }
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("File not found");
  }
}

function readProducts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading products:", err);
  }
  return [];
}

function writeProducts(products) {
  try {
    writeJsonAtomic(DATA_FILE, products);
    return true;
  } catch (err) {
    console.error("Error writing products:", err);
    return false;
  }
}


function readCourses() {
  try {
    if (fs.existsSync(COURSES_FILE)) {
      return JSON.parse(fs.readFileSync(COURSES_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading courses:", err);
  }
  return [];
}

function writeCourses(courses) {
  try {
    writeJsonAtomic(COURSES_FILE, courses);
    return true;
  } catch (err) {
    console.error("Error writing courses:", err);
    return false;
  }
}

function readCommerceState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(COMMERCE_FILE, "utf-8"));
    if (parsed?.schemaVersion === 1) return parsed;
  } catch (error) {
    console.error("commerce_state_read_failed", { message: error?.message });
  }
  return commerceCore.emptyCommerceStoreState();
}

function writeCommerceState(state) {
  writeJsonAtomic(COMMERCE_FILE, state);
}

function withCommerceMutation(work) {
  const operation = commerceMutationQueue.then(work, work);
  commerceMutationQueue = operation.catch(() => undefined);
  return operation;
}

function readJsonBody(req, maxBytes = 128 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) reject(new Error("REQUEST_TOO_LARGE"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });
    req.on("error", reject);
  });
}

function commerceStatus(code) {
  return {
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
  }[code] || 500;
}

function sendCommerceError(res, error) {
  const shape = commerceCore.toErrorResponse(error);
  const status = commerceStatus(shape.error.code);
  if (status >= 500) console.error("commerce_api_failed", { code: shape.error.code });
  sendJson(res, status, shape);
}

function requestAllowsSmoke(req, payload) {
  return payload?.testMode === true && req.headers["x-maestro-smoke-test"] === "stage1";
}

function baseCommerceCatalog(state = readCommerceState()) {
  const usage = commerceCore.reservationUsage(commerceCore.expireReservationsInMemory(state));
  return commerceCore.buildCatalogReadModels(readProducts(), usage);
}

async function handleCommerceRequest(req, res, pathname) {
  const requestId = String(req.headers["x-request-id"] || crypto.randomUUID());
  const startedAt = Date.now();
  try {
    if (!commerceRateAllowed(req)) {
      throw commerceCore.commerceError("RATE_LIMITED", "Слишком много запросов. Повторите через минуту.", { recoverable: true });
    }

    if (pathname === "/api/catalog" && req.method === "GET") {
      const state = readCommerceState();
      const products = baseCommerceCatalog(state);
      sendJson(res, 200, { schemaVersion: 1, catalogVersion: commerceCore.catalogVersion(products), products });
      return;
    }

    if (pathname.startsWith("/api/products/") && req.method === "GET") {
      const identifier = decodeURIComponent(pathname.slice("/api/products/".length));
      const product = commerceCore.productByIdentifier(baseCommerceCatalog(), {
        productId: identifier,
        productSku: identifier,
        slug: identifier,
      });
      if (!product) throw commerceCore.commerceError("PRODUCT_NOT_FOUND", "Товар не найден.", { recoverable: false });
      sendJson(res, 200, { product });
      return;
    }

    if (pathname === "/api/cart/validate" && req.method === "POST") {
      const payload = await readJsonBody(req);
      let products = baseCommerceCatalog();
      if (requestAllowsSmoke(req, payload)) products = [...products, commerceCore.stage1SmokeProduct()];
      sendJson(res, 200, { reconciliation: commerceCore.reconcileCart(products, payload.cart) });
      return;
    }

    if (pathname === "/api/orders" && req.method === "POST") {
      const payload = await readJsonBody(req);
      const idempotencyKey = String(req.headers["idempotency-key"] || "").trim();
      if (!idempotencyKey) {
        throw commerceCore.commerceError("IDEMPOTENCY_REQUIRED", "Для создания заказа нужен Idempotency-Key.", { recoverable: true });
      }
      const smoke = requestAllowsSmoke(req, payload);
      if (payload.testMode && !smoke) {
        throw commerceCore.commerceError("INVALID_REQUEST", "Тестовый режим доступен только production smoke.", { recoverable: false });
      }
      const result = await withCommerceMutation(() => {
        const state = readCommerceState();
        let products = commerceCore.buildCatalogReadModels(readProducts());
        if (smoke) products = [...products, commerceCore.stage1SmokeProduct()];
        const created = commerceCore.createOrderInMemory({
          state,
          products,
          request: payload,
          idempotencyKey,
          reservationTtlMinutes: Math.max(5, Number(process.env.COMMERCE_RESERVATION_TTL_MINUTES || 30)),
        });
        writeCommerceState(created.state);
        return created;
      });
      console.info("commerce_order_created", {
        requestId,
        orderId: result.order.orderId,
        idempotencyRef: commerceCore.stableHash(idempotencyKey),
        status: result.order.status,
        replayed: result.replayed,
        test: smoke,
        durationMs: Date.now() - startedAt,
      });
      if (!result.replayed && !smoke) {
        const items = result.order.items.map((item) => `• ${escapeTelegramHtml(item.title)} × ${item.quantity}`).join("\n");
        const address = result.order.customer.deliveryAddress ? `\n📍 ${escapeTelegramHtml(result.order.customer.deliveryAddress)}` : "";
        void sendMyStoreInfo(`<b>🛒 Новый заказ ${escapeTelegramHtml(result.order.displayId)}</b>\n${items}\n\n<b>${Number(result.order.totals.final).toLocaleString("ru-RU")} ₸</b>\nКлиент: ${escapeTelegramHtml(result.order.customer.name)} · ${escapeTelegramHtml(payload.customer.phone)}${address}\n<a href="${escapeTelegramHtml(adminOrderUrl(req, result.order))}">Открыть в админке</a>`);
      }
      sendJson(res, result.replayed ? 200 : 201, { order: result.order, replayed: result.replayed });
      return;
    }

    const paymentReport = pathname.match(/^\/api\/orders\/([^/]+)\/payment-report$/);
    if (paymentReport && req.method === "POST") {
      const payload = await readJsonBody(req);
      const order = await withCommerceMutation(() => {
        const changed = commerceCore.reportPaymentInMemory({
          state: readCommerceState(),
          orderId: decodeURIComponent(paymentReport[1]),
          reference: payload.reference,
          receiptMetadata: payload.receiptMetadata,
          reportedReservationTtlMinutes: Math.max(30, Number(process.env.COMMERCE_REPORTED_RESERVATION_TTL_MINUTES || 1440)),
        });
        writeCommerceState(changed.state);
        return changed.order;
      });
      console.info("commerce_payment_transition", {
        requestId,
        orderId: order.orderId,
        status: order.status,
        durationMs: Date.now() - startedAt,
      });
      void sendMyStoreInfo(`<b>💳 Оплата отправлена на проверку</b>\nЗаказ ${escapeTelegramHtml(order.displayId)} · <b>${Number(order.totals.final).toLocaleString("ru-RU")} ₸</b>\n<a href="${escapeTelegramHtml(adminOrderUrl(req, order))}">Проверить в админке</a>`);
      sendJson(res, 200, { order });
      return;
    }

    if (pathname === "/api/admin/orders" && req.method === "GET") {
      if (!requireAdmin(req, res)) return;
      const includeTest = new URL(req.url, `http://${req.headers.host || "localhost"}`).searchParams.get("include_test") === "1";
      const state = commerceCore.expireReservationsInMemory(readCommerceState());
      writeCommerceState(state);
      sendJson(res, 200, {
        orders: commerceCore.listAdminOrdersInMemory(state, { includeTest, limit: 200 }),
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    const confirm = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/confirm-payment$/);
    if (confirm && req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const order = await withCommerceMutation(() => {
        const changed = commerceCore.confirmPaymentInMemory({
          state: readCommerceState(),
          orderId: decodeURIComponent(confirm[1]),
          actorType: "admin",
        });
        writeCommerceState(changed.state);
        return changed.order;
      });
      void sendMyStoreInfo(`<b>✅ Оплата подтверждена</b>\nЗаказ ${escapeTelegramHtml(order.displayId)} · <b>${Number(order.totals.final).toLocaleString("ru-RU")} ₸</b>`);
      sendJson(res, 200, { order });
      return;
    }

    const statusChange = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
    if (statusChange && req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const payload = await readJsonBody(req);
      const allowedStatuses = new Set(["awaiting_payment", "processing", "completed"]);
      if (!allowedStatuses.has(payload.status)) {
        throw commerceCore.commerceError("INVALID_REQUEST", "Недопустимый статус заказа.", { recoverable: true, field: "status" });
      }
      const order = await withCommerceMutation(() => {
        const changed = commerceCore.transitionOrderInMemory({
          state: readCommerceState(),
          orderId: decodeURIComponent(statusChange[1]),
          toStatus: payload.status,
          reason: payload.reason,
        });
        writeCommerceState(changed.state);
        return changed.order;
      });
      void sendMyStoreInfo(`<b>📦 Статус заказа изменён</b>\n${escapeTelegramHtml(order.displayId)} · ${escapeTelegramHtml(order.status)}`);
      sendJson(res, 200, { order });
      return;
    }

    const cancel = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/cancel$/);
    if (cancel && req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const payload = await readJsonBody(req);
      const order = await withCommerceMutation(() => {
        const changed = commerceCore.cancelOrderInMemory({
          state: readCommerceState(),
          orderId: decodeURIComponent(cancel[1]),
          actorType: "admin",
          reason: payload.reason,
        });
        writeCommerceState(changed.state);
        return changed.order;
      });
      void sendMyStoreInfo(`<b>❌ Заказ отменён</b>\n${escapeTelegramHtml(order.displayId)}`);
      sendJson(res, 200, { order });
      return;
    }

    const publicOrder = pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (publicOrder && req.method === "GET") {
      const state = commerceCore.expireReservationsInMemory(readCommerceState());
      writeCommerceState(state);
      sendJson(res, 200, { order: commerceCore.publicOrderFromState(state, decodeURIComponent(publicOrder[1])) });
      return;
    }

    sendJson(res, 404, { error: { code: "ORDER_NOT_FOUND", message: "Маршрут не найден.", recoverable: false } });
  } catch (error) {
    sendCommerceError(res, error);
  }
}

function calculatePrice(pricing) {
  if (!pricing) return 0;
  if (pricing.pricingMode === "manual" && pricing.manualPriceKzt) {
    return Math.round(pricing.manualPriceKzt);
  }
  const rate = pricing.purchaseCurrency === "CNY" ? (pricing.currencyRate || 70) : pricing.purchaseCurrency === "USD" ? (pricing.currencyRate || 500) : 1;
  const purchaseKzt = (pricing.purchasePrice || 0) * rate;
  const fixedCost = purchaseKzt +
    (pricing.chinaDeliveryKzt || 0) +
    (pricing.cargoKzt || 0) +
    (pricing.customsKzt || 0) +
    (pricing.packagingKzt || 0) +
    (pricing.setupKzt || 0) +
    (pricing.marketingKzt || 0) +
    (pricing.otherCostsKzt || 0);

  const desiredProfit = fixedCost * ((pricing.targetProfitPercent || 35) / 100);
  const percentDeductions = ((pricing.taxPercent || 3) + (pricing.bankInstallmentPercent || 11) + (pricing.sellerPercent || 5)) / 100;

  if (percentDeductions >= 1) return Math.round(fixedCost * 1.5);
  const autoPrice = (fixedCost + desiredProfit) / (1 - percentDeductions);
  return Math.round(autoPrice);
}

function normalizeVariantPayload(variants, basePhoto) {
  if (!Array.isArray(variants)) return [];
  return variants.map((variant, index) => {
    const attributes = Array.isArray(variant?.attributes)
      ? variant.attributes.flatMap((attribute) => {
          const name = typeof attribute?.name === "string" ? attribute.name.trim() : "";
          const value = typeof attribute?.value === "string" ? attribute.value.trim() : "";
          return name && value ? [{ name, value }] : [];
        })
      : [];
    const ownPrice = variant?.priceMode === "override" && Number(variant?.price) > 0;
    return {
      ...variant,
      id: variant?.id || `variant-${Date.now()}-${index + 1}`,
      name: String(variant?.name || `Вариант ${index + 1}`).trim(),
      sku: String(variant?.sku || `SKU-${index + 1}`).trim().toUpperCase(),
      stock: Math.max(0, Math.floor(Number(variant?.stock) || 0)),
      image: variant?.image || basePhoto || "/placeholder.png",
      attributes,
      priceMode: ownPrice ? "override" : "inherit",
      price: ownPrice ? Math.round(Number(variant.price)) : undefined,
    };
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  applySecurityHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": req.headers.origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-token, Authorization, x-request-id",
      "Access-Control-Allow-Credentials": "true",
    });
    res.end();
    return;
  }

  // =========================================================================
  // API ENDPOINTS
  // =========================================================================

  if (pathname === "/api/admin/session" && req.method === "GET") {
    if (!isAdminRequest(req)) {
      sendJson(res, 401, { authenticated: false });
      return;
    }
    sendJson(res, 200, { authenticated: true });
    return;
  }

  if (pathname === "/api/admin/login" && req.method === "POST") {
    if (!loginAllowed(req)) {
      sendJson(res, 429, { error: "Слишком много попыток. Повторите через 15 минут." });
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16_384) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        if (!verifyPassword(payload.password)) {
          recordFailedLogin(req);
          sendJson(res, 401, { error: "Неверный пароль администратора" });
          return;
        }
        clearFailedLogins(req);
        sendJson(res, 200, { success: true }, { "Set-Cookie": sessionCookie(req, createSessionToken()) });
      } catch {
        sendJson(res, 400, { error: "Некорректный запрос" });
      }
    });
    return;
  }

  if (pathname === "/api/admin/logout" && req.method === "POST") {
    sendJson(res, 200, { success: true }, { "Set-Cookie": sessionCookie(req, "", 0) });
    return;
  }

  if (
    COMMERCE_CORE_V2 &&
    (pathname === "/api/catalog" ||
      pathname === "/api/cart/validate" ||
      pathname === "/api/orders" ||
      pathname.startsWith("/api/orders/") ||
      pathname.startsWith("/api/admin/orders") ||
      pathname.startsWith("/api/products/"))
  ) {
    void handleCommerceRequest(req, res, pathname);
    return;
  }

  // =========================================================================
  // =========================================================================
  // FILE UPLOAD API
  // =========================================================================
  if (pathname === "/api/upload" && req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { filename, base64 } = payload;
        if (!base64) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "No base64 image data provided" }));
          return;
        }

        const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
        const requestedExtension = (path.extname(filename || "photo.jpg") || ".jpg").toLowerCase();
        const ext = allowedExtensions.has(requestedExtension) ? requestedExtension : ".jpg";
        const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
          sendJson(res, 400, { error: "Файл пустой или превышает 8 МБ" });
          return;
        }
        
        const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext.toLowerCase()}`;
        const filePath = path.join(UPLOADS_DIR, safeName);
        fs.writeFileSync(filePath, buffer);

        const url = `/uploads/${safeName}`;
        console.log(`📸 Image uploaded successfully: ${url} (${buffer.length} bytes)`);

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, url, filename: safeName }));
      } catch (err) {
        console.error("Upload error:", err);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: err.message || "Failed to save file" }));
      }
    });
    return;
  }
  
  // =========================================================================
  // COURSES API
  // =========================================================================
  if (pathname === "/api/courses") {
    if (req.method === "GET") {
      const courses = readCourses();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ courses, count: courses.length }));
      return;
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const courses = readCourses();
          const targetId = payload.id;

          let existingIndex = courses.findIndex((c) => c.id === targetId || c.slug === payload.slug);
          let updatedCourse;

          if (existingIndex >= 0) {
            updatedCourse = {
              ...courses[existingIndex],
              ...payload,
              updatedAt: new Date().toISOString(),
            };
            courses[existingIndex] = updatedCourse;
          } else {
            updatedCourse = {
              id: payload.id || `course-${Date.now()}`,
              slug: payload.slug || `course-${Date.now()}`,
              title: payload.title || "Новый курс",
              subtitle: payload.subtitle || "",
              badge: payload.badge || "НОВИНКА",
              instrument: payload.instrument || "acoustic",
              level: payload.level || "Начинающий",
              lessonsCount: payload.lessonsCount || (payload.lessons ? payload.lessons.length : 10),
              durationHours: payload.durationHours || 5,
              price: payload.price || 9900,
              originalPrice: payload.originalPrice || 19900,
              image: payload.image || "/products/04_41_acoustic.png",
              description: payload.description || "",
              highlights: payload.highlights || [],
              instructor: payload.instructor || {
                name: "Преподаватель Maestro",
                role: "Мастер Академии",
                experience: "Стаж 10 лет",
                avatar: "🎸"
              },
              lessons: payload.lessons || [],
              updatedAt: new Date().toISOString(),
            };
            courses.push(updatedCourse);
          }

          writeCourses(courses);
          console.log(`✅ Saved course: ${updatedCourse.title} (${updatedCourse.price} KZT)`);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: true, course: updatedCourse, courses }));
        } catch (err) {
          console.error("Course API POST error:", err);
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: err.message || "Failed to parse JSON" }));
        }
      });
      return;
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = parsedUrl.searchParams.get("id");
      if (!id) {
        sendJson(res, 400, { error: "Не указан ID курса" });
        return;
      }
      const courses = readCourses();
      const filtered = courses.filter((course) => String(course.id) !== id);
      if (filtered.length === courses.length) {
        sendJson(res, 404, { error: "Курс не найден" });
        return;
      }
      writeCourses(filtered);
      sendJson(res, 200, { success: true, count: filtered.length });
      return;
    }
  }

  
function saveBase64Image(dataUrl, defaultPrefix = "img") {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }
  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return dataUrl;
    const rawExt = matches[1].toLowerCase().replace("jpeg", "jpg");
    const ext = ["jpg", "png", "webp"].includes(rawExt) ? `.${rawExt}` : ".jpg";
    const cleanBase64 = matches[2];
    const buffer = Buffer.from(cleanBase64, "base64");
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) return dataUrl;
    const filename = `${defaultPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`📸 Auto-saved base64 image to file: /uploads/${filename} (${buffer.length} bytes)`);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Failed to extract and save base64 image:", err);
    return dataUrl;
  }
}

  if (pathname === "/api/products") {
    if (req.method === "GET") {
      const products = readProducts();
      const includeAdmin = parsedUrl.searchParams.get("scope") === "all";
      if (includeAdmin && !requireAdmin(req, res)) return;
      const visibleProducts = includeAdmin ? products : publicProducts(products);
      sendJson(res, 200, { products: visibleProducts, count: visibleProducts.length });
      return;
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body || "{}");
          const products = readProducts();

          const targetSku = (payload.sku || "").trim();
          const targetId = payload.productId ? String(payload.productId) : null;

          let existingIndex = products.findIndex(
            (p) => (targetId && (String(p.id) === targetId || String(p.databaseId) === targetId)) || (p.sku && p.sku.toLowerCase() === targetSku.toLowerCase())
          );

          const finalPrice = calculatePrice(payload.pricing);
          const hasDiscount = Boolean(payload.pricing?.hasDiscount && payload.pricing?.discountPercent > 0);
          const discountPercent = hasDiscount ? payload.pricing.discountPercent : undefined;
          const originalPrice = hasDiscount ? (payload.pricing.originalPriceKzt || Math.round(finalPrice / (1 - (discountPercent / 100)))) : undefined;
          const publicationStatus = payload.publish ? "published" : "draft";
          const cleanMainPhoto = saveBase64Image(payload.photoUrl);
          payload.photoUrl = cleanMainPhoto;
          if (Array.isArray(payload.variants)) {
            for (const v of payload.variants) {
              if (v.image) v.image = saveBase64Image(v.image);
            }
          }
          const normalizedVariants = normalizeVariantPayload(payload.variants, cleanMainPhoto);
          const totalStock = normalizedVariants.reduce((sum, variant) => sum + variant.stock, 0);

          let updatedProduct;

          if (existingIndex >= 0) {
            const existing = products[existingIndex];
            updatedProduct = {
              ...existing,
              name: payload.name || existing.name,
              sku: payload.sku || existing.sku,
              category: payload.category || existing.category,
              image: payload.photoUrl || existing.image,
              description: payload.description || existing.description,
              features: payload.features || existing.features || [],
              badge: payload.targetAudience !== undefined ? payload.targetAudience : existing.badge,
              price: finalPrice || existing.price,
              originalPrice,
              discountPercent,
              isDiscountActive: hasDiscount,
              attachedCourseId: payload.attachedCourseId !== undefined ? payload.attachedCourseId : existing.attachedCourseId,
              allowProPack: payload.allowProPack !== undefined ? payload.allowProPack : existing.allowProPack,
              proPackTitle: payload.proPackTitle !== undefined ? payload.proPackTitle : existing.proPackTitle,
              proPackPrice: payload.proPackPrice !== undefined ? payload.proPackPrice : existing.proPackPrice,
              allowStringsUpsell: payload.allowStringsUpsell !== undefined ? payload.allowStringsUpsell : existing.allowStringsUpsell,
              audioUrl: payload.audioUrl !== undefined ? payload.audioUrl : existing.audioUrl,
              variantItems: normalizedVariants.length ? normalizedVariants : existing.variantItems || [],
              variants: normalizedVariants.length || existing.variants || 1,
              adminPricing: payload.pricing || existing.adminPricing,
              publicationStatus,
              updatedAt: new Date().toISOString(),
            };

            if (normalizedVariants.length) updatedProduct.quantity = totalStock;
            else if (payload.variant) updatedProduct.quantity = payload.variant.stockQuantity || existing.quantity;

            products[existingIndex] = updatedProduct;
          } else {
            const newId = `prod-${Date.now()}`;
            updatedProduct = {
              id: newId,
              databaseId: newId,
              name: payload.name || "Новый инструмент",
              sku: payload.sku || `SKU-${Date.now()}`,
              category: payload.category || "Электрогитары",
              image: payload.photoUrl || "/products/01_st20_electric.png",
              description: payload.description || "",
              features: payload.features || [],
              badge: payload.targetAudience || "В наличии",
              price: finalPrice || 45000,
              quantity: normalizedVariants.length ? totalStock : payload.variant?.stockQuantity || 1,
              variants: normalizedVariants.length || 1,
              variantItems: normalizedVariants,
              attachedCourseId: payload.attachedCourseId !== undefined ? payload.attachedCourseId : "none",
              allowProPack: payload.allowProPack !== undefined ? payload.allowProPack : false,
              proPackTitle: payload.proPackTitle || "Чехол + Ремень + VIP Доступ",
              proPackPrice: payload.proPackPrice || 8900,
              allowStringsUpsell: payload.allowStringsUpsell !== undefined ? payload.allowStringsUpsell : false,
              audioUrl: payload.audioUrl || undefined,
              adminPricing: payload.pricing || null,
              publicationStatus,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            products.push(updatedProduct);
          }

          writeProducts(products);

          console.log(`✅ Saved product: ${updatedProduct.sku} - ${updatedProduct.name} (${finalPrice} KZT)`);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: true, product: updatedProduct }));
        } catch (err) {
          console.error("API POST error:", err);
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: err.message || "Failed to parse JSON" }));
        }
      });
      return;
    }
  }

  // =========================================================================
  // STATIC FILES & SPA FALLBACK
  // =========================================================================
  if (pathname === "/" || pathname === "/admin" || pathname.startsWith("/admin/")) {
    const indexPath = path.join(PUBLIC_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      serveStaticFile(req, res, indexPath, "text/html; charset=utf-8", true);
      return;
    }
  }

  if (pathname.startsWith("/uploads/")) {
    const uploadName = path.basename(pathname);
    const uploadPath = path.join(UPLOADS_DIR, uploadName);
    if (fs.existsSync(uploadPath) && fs.statSync(uploadPath).isFile()) {
      const ext = path.extname(uploadPath).toLowerCase();
      serveStaticFile(req, res, uploadPath, MIME_TYPES[ext] || "application/octet-stream", false);
      return;
    }
  }

  let filePath = path.join(PUBLIC_DIR, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    serveStaticFile(req, res, filePath, contentType, false);
    return;
  }

  // Serve the SPA shell only for known public store routes. Unknown product and
  // category URLs must remain real 404 responses instead of rendering home.
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const categoryMatch = normalizedPath.match(/^\/catalog\/([^/]+)$/);
  const productMatch = normalizedPath.match(/^\/product\/([^/]+)$/);
  const orderPageMatch = normalizedPath.match(/^\/order\/([a-f0-9]{48})$/);
  const knownStaticRoute = normalizedPath === "/catalog" || normalizedPath === "/picker" || normalizedPath === "/cart" || normalizedPath === "/checkout" || Boolean(orderPageMatch);
  const knownCategoryRoute = Boolean(categoryMatch && commerceCore.isCanonicalCategorySlug(categoryMatch[1]));
  const knownProductRoute = Boolean(productMatch && commerceCore.productByIdentifier(baseCommerceCatalog(), {
    slug: decodeURIComponent(productMatch[1]),
  }));
  if (knownStaticRoute || knownCategoryRoute || knownProductRoute) {
    const fallbackIndex = path.join(PUBLIC_DIR, "index.html");
    if (fs.existsSync(fallbackIndex)) {
      serveStaticFile(req, res, fallbackIndex, "text/html; charset=utf-8", true);
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`🎸 Maestro Store Server is active at http://localhost:${PORT}/`);
});
