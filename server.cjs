const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, ".runtime-data");
const DATA_FILE = path.join(DATA_DIR, "products.json");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const SEED_PRODUCTS_FILE = path.join(__dirname, "data/products.json");
const SEED_COURSES_FILE = path.join(__dirname, "data/courses.json");
const SESSION_COOKIE = "maestro_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || "6ec46d8955935973cd4e4089f7ebf149";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "914d0810c4fd1aa5e6c6b401bec3a3449645ea9a46e8f5061813be7cc5be1ba097ee32648fa9644bbb20af2e4346f08bcda2d9c385f080eb28cf72cf48fcbc2d";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const loginAttempts = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
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
  const token = parseCookies(req)[SESSION_COOKIE] || "";
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
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
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
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function serveStaticFile(req, res, filePath, contentType, isHtml = false) {
  try {
    const stat = fs.statSync(filePath);
    const acceptEncoding = req.headers["accept-encoding"] || "";

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": isHtml ? "no-cache, must-revalidate" : "public, max-age=86400",
    };

    const rawStream = fs.createReadStream(filePath);

    if (/\bbr\b/.test(acceptEncoding) && isCompressible(contentType)) {
      headers["Content-Encoding"] = "br";
      res.writeHead(200, headers);
      rawStream.pipe(zlib.createBrotliCompress()).pipe(res);
    } else if (/\bgzip\b/.test(acceptEncoding) && isCompressible(contentType)) {
      headers["Content-Encoding"] = "gzip";
      res.writeHead(200, headers);
      rawStream.pipe(zlib.createGzip()).pipe(res);
    } else {
      headers["Content-Length"] = stat.size;
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

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  applySecurityHeaders(req, res);

  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    const expectedOrigin = `${String(req.headers["x-forwarded-proto"] || "http").split(",")[0]}://${req.headers.host}`;
    if (origin && origin !== expectedOrigin) {
      sendJson(res, 403, { error: "Cross-origin request denied" });
      return;
    }
    res.writeHead(204, {
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
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
              variantItems: payload.variants || existing.variantItems || [],
              variants: Array.isArray(payload.variants) ? payload.variants.length : (existing.variants || 1),
              adminPricing: payload.pricing || existing.adminPricing,
              publicationStatus,
              updatedAt: new Date().toISOString(),
            };

            if (payload.variant) {
              updatedProduct.quantity = payload.variant.stockQuantity || existing.quantity;
            }

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
              quantity: payload.variant?.stockQuantity || 1,
              variants: Array.isArray(payload.variants) ? payload.variants.length : 1,
              variantItems: payload.variants || [],
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

  // Fallback to index.html for client SPA routes
  const fallbackIndex = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(fallbackIndex)) {
    serveStaticFile(req, res, fallbackIndex, "text/html; charset=utf-8", true);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`🎸 Maestro Store Server is active at http://localhost:${PORT}/`);
});
