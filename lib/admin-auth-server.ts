const SESSION_COOKIE = "maestro_admin_session";
const SESSION_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days (~6 months)
const PASSWORD_SALT = "6ec46d8955935973cd4e4089f7ebf149";
const FALLBACK_PASSWORD_HASH = "ce6a08e002764e7fa220f174610b552a141675d65b4dd71649fba125c11fb2e8";
const FALLBACK_SESSION_SECRET = "880a5dcaa082dff12c0636a5356cf659b56706ddb1323aec3582239eb003e184";

const encoder = new TextEncoder();

function runtimeSecret(name: "ADMIN_PASSWORD_HASH" | "ADMIN_SESSION_SECRET") {
  const runtime = globalThis as unknown as {
    env?: Record<string, string | undefined>;
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.env?.[name] || runtime.process?.env?.[name] || "";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string) {
  const secret = runtimeSecret("ADMIN_SESSION_SECRET") || FALLBACK_SESSION_SECRET;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

export async function verifyAdminPassword(password: string) {
  const expected = runtimeSecret("ADMIN_PASSWORD_HASH") || FALLBACK_PASSWORD_HASH;
  const actual = await sha256(`${PASSWORD_SALT}:${password}`);
  return constantTimeEqual(actual, expected);
}

export async function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${expiresAt}.${await hmac(String(expiresAt))}`;
}

export async function isAdminRequest(request: Request) {
  let token = cookieValue(request, SESSION_COOKIE);
  if (!token) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      token = request.headers.get("x-admin-token") || "";
    }
  }
  if (!token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) return false;
  const expected = await hmac(expiresRaw);
  return constantTimeEqual(signature, expected);
}

export function adminSessionCookie(request: Request, token: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearAdminSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
