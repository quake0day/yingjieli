import { isAuthed, json, unauthorized } from "../_lib/auth.js";
import { readData, writeData, DEFAULT_DATA } from "../_lib/data.js";

// GET  /api/data → returns full site data (public)
// PUT  /api/data → updates full site data (auth required, body = full data object)
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === "GET") {
    const data = await readData(env);
    return json(data, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=300"
      }
    });
  }

  if (method === "PUT") {
    if (!await isAuthed(request, env)) return unauthorized();
    let body;
    try { body = await request.json(); } catch {
      return json({ error: "Invalid JSON" }, { status: 400 });
    }
    // Validate shape lightly
    const required = ["hero", "bio", "exhibitions", "contact", "works"];
    for (const k of required) {
      if (!(k in body)) return json({ error: `Missing field: ${k}` }, { status: 400 });
    }
    if (!Array.isArray(body.works)) return json({ error: "works must be an array" }, { status: 400 });
    if (!Array.isArray(body.exhibitions)) return json({ error: "exhibitions must be an array" }, { status: 400 });

    await writeData(env, body);
    return json({ ok: true, count: { works: body.works.length, exhibitions: body.exhibitions.length } });
  }

  if (method === "POST" && new URL(request.url).searchParams.get("seed") === "1") {
    // One-time seed (auth required)
    if (!await isAuthed(request, env)) return unauthorized();
    await writeData(env, DEFAULT_DATA);
    return json({ ok: true, seeded: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
