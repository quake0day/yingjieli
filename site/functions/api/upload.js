import { isAuthed, json, unauthorized } from "../_lib/auth.js";

// POST /api/upload (multipart/form-data)
//   field "file": image blob (already resized client-side)
//   field "name": optional desired filename (will be sanitized + uniquified)
// → returns { ok, key, url, w, h }
//
// The client is expected to have already resized the image to a sensible
// max dimension (we accept anything up to 8MB to be safe).

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeBaseName(name) {
  let base = (name || "upload").replace(/\.[a-z0-9]+$/i, "");
  base = base.toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "upload";
}

function pickExt(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method.toUpperCase() !== "POST")
    return json({ error: "Method not allowed" }, { status: 405 });
  if (!await isAuthed(request, env)) return unauthorized();
  if (!env.YL_IMAGES) return json({ error: "R2 bucket YL_IMAGES is not bound" }, { status: 500 });

  const ct = request.headers.get("Content-Type") || "";
  if (!ct.startsWith("multipart/form-data"))
    return json({ error: "Expected multipart/form-data" }, { status: 400 });

  let form;
  try { form = await request.formData(); } catch {
    return json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string")
    return json({ error: "Missing file field" }, { status: 400 });

  const type = file.type || "image/jpeg";
  if (!ALLOWED_TYPES.has(type))
    return json({ error: `Unsupported type: ${type}. Use JPEG/PNG/WebP.` }, { status: 400 });

  const ab = await file.arrayBuffer();
  if (ab.byteLength > MAX_BYTES)
    return json({ error: `File too large (${ab.byteLength} bytes, max ${MAX_BYTES})` }, { status: 413 });

  const desired = (form.get("name") || file.name || "upload").toString();
  const base = sanitizeBaseName(desired);
  const ext = pickExt(type);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  const key = `${base}_${stamp}${rand}.${ext}`;

  await env.YL_IMAGES.put(key, ab, {
    httpMetadata: {
      contentType: type,
      cacheControl: "public, max-age=31536000, immutable"
    }
  });

  // Width/height passed by client (post-resize)
  const w = parseInt(form.get("w") || "0", 10) || null;
  const h = parseInt(form.get("h") || "0", 10) || null;

  return json({
    ok: true,
    key,
    url: `/api/img/${key}`,
    w, h,
    bytes: ab.byteLength,
    type
  });
}
