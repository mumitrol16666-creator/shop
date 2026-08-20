const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = 3000;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data/products.json");
const COURSES_FILE = path.join(__dirname, "data/courses.json");

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
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), "utf-8");
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
    fs.mkdirSync(path.dirname(COURSES_FILE), { recursive: true });
    fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2), "utf-8");
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

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // =========================================================================
  // API ENDPOINTS
  // =========================================================================

  // =========================================================================
  // =========================================================================
  // FILE UPLOAD API
  // =========================================================================
  if (pathname === "/api/upload" && req.method === "POST") {
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

        const uploadsDir = path.join(PUBLIC_DIR, "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = path.extname(filename || "photo.jpg") || ".jpg";
        const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        
        const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext.toLowerCase()}`;
        const filePath = path.join(uploadsDir, safeName);
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
  }

  if (pathname === "/api/products") {
    if (req.method === "GET") {
      const products = readProducts();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ products, count: products.length }));
      return;
    }

    if (req.method === "POST") {
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
