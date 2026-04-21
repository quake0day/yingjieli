// Shared auth helpers for Cloudflare Pages Functions

const COOKIE = "yl_admin";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign", "verify"]
  );
}

async function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createSession(env) {
  const secret = env.SESSION_SECRET || env.ADMIN_PASSWORD || "fallback";
  const key = await hmacKey(secret);
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `admin.${exp}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${payload}.${b64urlEncode(sig)}`;
}

export async function verifySession(token, env) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [scope, expStr, sigB64] = parts;
  if (scope !== "admin") return false;
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const secret = env.SESSION_SECRET || env.ADMIN_PASSWORD || "fallback";
  const key = await hmacKey(secret);
  try {
    const sig = b64urlDecode(sigB64);
    const ok = await crypto.subtle.verify("HMAC", key, sig, enc.encode(`${scope}.${expStr}`));
    return ok;
  } catch {
    return false;
  }
}

export function readCookie(request, name = COOKIE) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookie(token) {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Strict`,
    `Max-Age=${TTL_SECONDS}`
  ];
  return parts.join("; ");
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function isAuthed(request, env) {
  const token = readCookie(request);
  return await verifySession(token, env);
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers || {})
    }
  });
}

export function unauthorized() {
  return json({ error: "Unauthorized" }, { status: 401 });
}

export async function checkPasswordRateLimit(env, ip) {
  // Simple per-IP rate limit using KV (5 attempts per 5 min)
  if (!env.YL_DATA) return { ok: true };
  const key = `rl:auth:${ip}`;
  const raw = await env.YL_DATA.get(key);
  const now = Date.now();
  let entry = raw ? JSON.parse(raw) : { count: 0, until: now + 300000 };
  if (entry.until < now) entry = { count: 0, until: now + 300000 };
  if (entry.count >= 5) return { ok: false, retryAfter: Math.ceil((entry.until - now) / 1000) };
  entry.count++;
  await env.YL_DATA.put(key, JSON.stringify(entry), { expirationTtl: 600 });
  return { ok: true };
}
