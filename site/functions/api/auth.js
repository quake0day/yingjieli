import {
  createSession, setSessionCookie, clearSessionCookie,
  isAuthed, json, checkPasswordRateLimit
} from "../_lib/auth.js";

// POST /api/auth → login with { password }
// DELETE /api/auth → logout
// GET /api/auth → check status
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === "GET") {
    const ok = await isAuthed(request, env);
    return json({ authenticated: ok });
  }

  if (method === "POST") {
    if (!env.ADMIN_PASSWORD) {
      return json({ error: "ADMIN_PASSWORD env var is not set on the server" }, { status: 500 });
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rl = await checkPasswordRateLimit(env, ip);
    if (!rl.ok) {
      return json({ error: `Too many attempts. Try again in ${rl.retryAfter}s.` }, { status: 429 });
    }
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const password = (body.password || "").toString();
    if (!password) return json({ error: "Missing password" }, { status: 400 });

    // Constant-time-ish compare
    const a = password;
    const b = env.ADMIN_PASSWORD;
    let match = a.length === b.length;
    const len = Math.max(a.length, b.length);
    let mismatch = a.length ^ b.length;
    for (let i = 0; i < len; i++) {
      mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    match = mismatch === 0;

    if (!match) return json({ error: "Wrong password" }, { status: 401 });

    const token = await createSession(env);
    return json({ ok: true }, {
      headers: { "Set-Cookie": setSessionCookie(token) }
    });
  }

  if (method === "DELETE") {
    return json({ ok: true }, {
      headers: { "Set-Cookie": clearSessionCookie() }
    });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
