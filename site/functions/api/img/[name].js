// GET /api/img/<key> → serves image from R2
export async function onRequest(context) {
  const { params, env, request } = context;
  if (!env.YL_IMAGES) return new Response("R2 not bound", { status: 500 });

  const key = decodeURIComponent(params.name || "");
  if (!key || key.includes("/") || key.includes("..")) {
    return new Response("Bad key", { status: 400 });
  }

  // Use Workers Cache API
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const obj = await env.YL_IMAGES.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", obj.httpEtag);

  // ETag conditional
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === obj.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  const res = new Response(obj.body, { headers });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

// DELETE /api/img/<key> → delete (auth required)
export async function onRequestDelete(context) {
  const { params, env, request } = context;
  const { isAuthed, json, unauthorized } = await import("../../_lib/auth.js");
  if (!await isAuthed(request, env)) return unauthorized();
  if (!env.YL_IMAGES) return json({ error: "R2 not bound" }, { status: 500 });
  const key = decodeURIComponent(params.name || "");
  if (!key || key.includes("/") || key.includes("..")) return json({ error: "Bad key" }, { status: 400 });
  await env.YL_IMAGES.delete(key);
  return json({ ok: true, deleted: key });
}
