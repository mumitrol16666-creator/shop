import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../lib/admin-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Требуется авторизация администратора" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename, base64 } = body || {};

    if (!base64) {
      return NextResponse.json({ error: "Отсутствуют данные изображения" }, { status: 400 });
    }

    const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
    const requestedExtension = (path.extname(filename || "photo.jpg") || ".jpg").toLowerCase();
    const ext = allowedExtensions.has(requestedExtension) ? requestedExtension : ".jpg";
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл пустой или превышает 8 МБ" }, { status: 400 });
    }

    const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext.toLowerCase()}`;

    // Save to runtime-data/uploads and public/uploads if accessible
    const runtimeUploads = path.join(process.cwd(), ".runtime-data", "uploads");
    const publicUploads = path.join(process.cwd(), "public", "uploads");

    fs.mkdirSync(runtimeUploads, { recursive: true });
    fs.mkdirSync(publicUploads, { recursive: true });

    try {
      fs.writeFileSync(path.join(runtimeUploads, safeName), buffer);
    } catch {}
    try {
      fs.writeFileSync(path.join(publicUploads, safeName), buffer);
    } catch {}

    const url = `/uploads/${safeName}`;
    return NextResponse.json({ success: true, url, filename: safeName });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Ошибка при сохранении фотографии" }, { status: 500 });
  }
}
