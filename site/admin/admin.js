// ============================================================
// Yingjie Li — Admin
// ============================================================

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  data: null,
  dirty: false,
  saving: false,
  editingIndex: -1
};

// ============================================================
// API helpers
// ============================================================
async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    }
  });
  let body;
  try { body = await res.json(); } catch { body = {}; }
  if (!res.ok) {
    const msg = body.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function uploadFile(blob, name, w, h) {
  const fd = new FormData();
  fd.append("file", blob, name);
  fd.append("name", name);
  if (w) fd.append("w", String(w));
  if (h) fd.append("h", String(h));
  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "same-origin",
    body: fd
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
  return body;
}

// ============================================================
// Toast
// ============================================================
let toastTimer = null;
function toast(msg, type = "ok") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `toast is-${type}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

// ============================================================
// Auth flow
// ============================================================
async function checkAuth() {
  try {
    const r = await api("/api/auth", { method: "GET" });
    return r.authenticated === true;
  } catch { return false; }
}

async function tryLogin(password) {
  await api("/api/auth", {
    method: "POST",
    body: JSON.stringify({ password })
  });
}

async function logout() {
  try { await api("/api/auth", { method: "DELETE" }); } catch {}
  location.reload();
}

function showLogin() {
  $("#view-login").hidden = false;
  $("#view-dash").hidden = true;
}

function showDash() {
  $("#view-login").hidden = true;
  $("#view-dash").hidden = false;
}

// ============================================================
// Image preview helpers (resolve work file → URL)
// ============================================================
function imgUrl(file) {
  if (!file) return "";
  if (file.startsWith("http") || file.startsWith("/")) return file;
  return `/images/${file}`;
}

// ============================================================
// Image processing — Canvas resize (max 1500px wide/tall)
// ============================================================
const MAX_DIM = 1500;
const JPEG_QUALITY = 0.86;

async function processImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, MAX_DIM / Math.max(w, h));
        const tw = Math.round(w * scale);
        const th = Math.round(h * scale);
        const c = document.createElement("canvas");
        c.width = tw; c.height = th;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, tw, th);
        c.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("Encode failed"));
          resolve({ blob, w: tw, h: th, originalSize: file.size });
        }, "image/jpeg", JPEG_QUALITY);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Cannot read image")); };
    img.src = url;
  });
}

function fileBaseName(filename) {
  return filename.replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "upload";
}

function nextNum(works) {
  let max = 0;
  for (const w of works) {
    const n = parseInt(w.num, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return String(max + 1).padStart(3, "0");
}

// ============================================================
// Render: Hero
// ============================================================
function renderHero() {
  const data = state.data;
  const url = imgUrl(data.hero.image);
  $("#hero-preview").src = url;
  $("#hero-num").textContent = data.hero.num || "—";
  $("#hero-title").textContent = data.hero.title || "—";
  $("#hero-year").textContent = data.hero.year || "—";

  const list = $("#hero-list");
  list.innerHTML = "";
  for (const w of data.works) {
    const a = document.createElement("button");
    a.type = "button";
    a.className = "hero-thumb" + (w.file === data.hero.image ? " is-active" : "");
    a.innerHTML = `
      <img src="${imgUrl(w.file)}" alt="${escapeAttr(w.title)}" loading="lazy" />
      <span class="ht-label">${escapeHtml(w.title)}</span>
    `;
    a.addEventListener("click", () => {
      data.hero = { image: w.file, title: w.title, year: w.year, num: w.num };
      renderHero();
      markDirty();
    });
    list.appendChild(a);
  }
}

// ============================================================
// Render: Bio
// ============================================================
function renderBio() {
  const bio = state.data.bio || (state.data.bio = { quote: "", paragraphs: [] });
  $("#bio-quote").value = bio.quote || "";
  const wrap = $("#bio-paragraphs");
  wrap.innerHTML = "";
  bio.paragraphs.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "bp-row";
    row.innerHTML = `
      <textarea data-bp="${i}" placeholder="段落正文…">${escapeHtml(p)}</textarea>
      <div class="bp-actions">
        <button class="btn btn-ghost btn-sm" data-up="${i}" title="上移">↑</button>
        <button class="btn btn-ghost btn-sm" data-dn="${i}" title="下移">↓</button>
        <button class="btn btn-danger btn-sm" data-rm="${i}" title="删除">✕</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  // Bind text + actions (delegated)
  wrap.oninput = (e) => {
    const i = parseInt(e.target.dataset.bp, 10);
    if (!isNaN(i)) {
      bio.paragraphs[i] = e.target.value;
      markDirty();
    }
  };
  wrap.onclick = (e) => {
    const t = e.target;
    const swap = (i, j) => {
      if (i < 0 || j < 0 || i >= bio.paragraphs.length || j >= bio.paragraphs.length) return;
      [bio.paragraphs[i], bio.paragraphs[j]] = [bio.paragraphs[j], bio.paragraphs[i]];
      renderBio(); markDirty();
    };
    if (t.dataset.up != null) swap(+t.dataset.up, +t.dataset.up - 1);
    if (t.dataset.dn != null) swap(+t.dataset.dn, +t.dataset.dn + 1);
    if (t.dataset.rm != null) {
      bio.paragraphs.splice(+t.dataset.rm, 1);
      renderBio(); markDirty();
    }
  };
}

// ============================================================
// Render: Works
// ============================================================
function renderWorks() {
  const grid = $("#works-grid");
  grid.innerHTML = "";
  // Newest first
  const works = [...state.data.works].sort((a, b) => parseInt(b.num) - parseInt(a.num));
  for (const w of works) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "work-card";
    card.innerHTML = `
      <img class="wc-thumb" src="${imgUrl(w.file)}" alt="${escapeAttr(w.title)}" loading="lazy" />
      <div class="wc-info">
        <span class="wc-num">N° ${escapeHtml(w.num)} ${w.gallery ? '<span class="wc-on">On view</span>' : ''}</span>
        <span class="wc-title"><em>${escapeHtml(w.title)}</em></span>
        <span class="wc-year">${escapeHtml(w.year)}</span>
      </div>
    `;
    card.addEventListener("click", () => openModal(w));
    grid.appendChild(card);
  }
}

// ============================================================
// Render: Exhibitions
// ============================================================
function renderExhib() {
  const list = $("#ex-list");
  list.innerHTML = "";
  state.data.exhibitions.forEach((ex, i) => {
    const row = document.createElement("div");
    row.className = "ex-row";
    row.innerHTML = `
      <input type="text" placeholder="展览名" data-k="name"     value="${escapeAttr(ex.name || '')}">
      <input type="text" placeholder="地点"   data-k="location" value="${escapeAttr(ex.location || '')}">
      <input type="url"  placeholder="链接(可选)" data-k="url" value="${escapeAttr(ex.url || '')}">
      <button class="btn btn-danger btn-sm" data-rm="${i}">删除</button>
    `;
    row.oninput = (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      ex[k] = e.target.value;
      markDirty();
    };
    row.onclick = (e) => {
      if (e.target.dataset.rm != null) {
        state.data.exhibitions.splice(+e.target.dataset.rm, 1);
        renderExhib(); markDirty();
      }
    };
    list.appendChild(row);
  });
}

// ============================================================
// Render: Contact
// ============================================================
function renderContact() {
  const c = state.data.contact || (state.data.contact = {});
  $("#contact-email").value = c.email || "";
  $("#contact-etsy").value = c.etsy || "";
  $("#contact-gallery").value = c.gallery || "";
}

// ============================================================
// Modal — edit single work
// ============================================================
function openModal(w) {
  state.editingIndex = state.data.works.findIndex(x => x.num === w.num);
  $("#modal-img").src = imgUrl(w.file);
  $("#m-num").value = w.num;
  $("#m-title").value = w.title;
  $("#m-year").value = w.year;
  $("#m-gallery").checked = !!w.gallery;
  $("#modal").hidden = false;
}
function closeModal() { $("#modal").hidden = true; state.editingIndex = -1; }

function bindModal() {
  $("#modal-close").onclick = closeModal;
  $("#modal").onclick = (e) => { if (e.target.id === "modal") closeModal(); };
  $("#m-save").onclick = () => {
    const i = state.editingIndex;
    if (i < 0) return;
    const w = state.data.works[i];
    w.title = $("#m-title").value.trim() || w.title;
    w.year  = parseInt($("#m-year").value, 10) || w.year;
    w.gallery = $("#m-gallery").checked;
    renderWorks();
    renderHero();
    markDirty();
    closeModal();
    toast("已更新(记得点右上角保存)");
  };
  $("#m-delete").onclick = async () => {
    const i = state.editingIndex;
    if (i < 0) return;
    const w = state.data.works[i];
    if (!confirm(`确认删除"${w.title}"?\n(图片文件不会被删,只从作品列表移除)`)) return;
    state.data.works.splice(i, 1);
    // If hero pointed to it, fall back to first remaining
    if (state.data.hero.image === w.file && state.data.works[0]) {
      const h = state.data.works[0];
      state.data.hero = { image: h.file, title: h.title, year: h.year, num: h.num };
    }
    renderWorks(); renderHero(); markDirty();
    closeModal();
    toast("已删除");
  };
}

// ============================================================
// Upload flow
// ============================================================
function bindUploader() {
  const drop = $("#uploader");
  const input = $("#file-input");
  drop.onclick = () => input.click();
  input.onchange = () => handleFiles([...input.files]);
  ["dragenter", "dragover"].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("is-drag"); }));
  ["dragleave", "drop"].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("is-drag"); }));
  drop.addEventListener("drop", e => {
    const files = [...(e.dataTransfer.files || [])];
    handleFiles(files);
  });
}

async function handleFiles(files) {
  const queue = $("#upload-queue");
  for (const f of files) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      toast(`跳过非图片:${f.name}`, "error");
      continue;
    }
    const item = document.createElement("div");
    item.className = "up-item";
    item.innerHTML = `
      <img class="uq-thumb" alt="" />
      <div class="uq-info">
        <span class="uq-name">${escapeHtml(f.name)}</span>
        <span class="uq-meta">缩放中…</span>
      </div>
      <div class="uq-bar"><span></span></div>
    `;
    queue.appendChild(item);
    const thumb = item.querySelector(".uq-thumb");
    const meta  = item.querySelector(".uq-meta");
    const bar   = item.querySelector(".uq-bar > span");
    thumb.src = URL.createObjectURL(f);
    bar.style.width = "20%";

    try {
      const { blob, w, h, originalSize } = await processImage(f);
      meta.textContent = `${w}×${h} · ${formatBytes(blob.size)} (原 ${formatBytes(originalSize)})`;
      bar.style.width = "55%";

      // Use sanitized filename
      const base = fileBaseName(f.name);
      const target = `${base}.jpg`;
      const result = await uploadFile(blob, target, w, h);
      bar.style.width = "100%";
      item.classList.add("is-done");

      // Append to works at the end with next num
      const work = {
        num: nextNum(state.data.works),
        file: result.url,                  // full path like /api/img/<key>
        title: titleCaseFromBase(base),
        year: new Date().getFullYear(),
        w, h,
        gallery: true                       // default to "On view" for new uploads
      };
      state.data.works.push(work);
      renderWorks(); renderHero(); markDirty();

      meta.textContent = `已上传 · 编号 N° ${work.num} · 点下方卡片可改标题/年份`;
      // Open modal automatically so user can edit metadata
      setTimeout(() => openModal(work), 250);
    } catch (e) {
      item.classList.add("is-error");
      meta.textContent = `失败:${e.message || e}`;
      bar.style.width = "0%";
    }
  }
}

// ============================================================
// Save / dirty state
// ============================================================
function markDirty() {
  state.dirty = true;
  $("#save-state").className = "save-state is-dirty";
  $("#save-state").textContent = "● 有未保存的更改";
  $("#save-btn").disabled = false;
}
function markSaved() {
  state.dirty = false;
  $("#save-state").className = "save-state is-saved";
  $("#save-state").textContent = "✓ 已保存";
  $("#save-btn").disabled = true;
  setTimeout(() => {
    if (!state.dirty) {
      $("#save-state").textContent = "";
      $("#save-state").className = "save-state";
    }
  }, 3000);
}

async function saveAll() {
  if (state.saving) return;
  state.saving = true;
  $("#save-state").className = "save-state is-saving";
  $("#save-state").textContent = "保存中…";
  $("#save-btn").disabled = true;

  // Pull values from inputs that aren't auto-bound
  state.data.bio.quote = $("#bio-quote").value;
  state.data.contact.email = $("#contact-email").value;
  state.data.contact.etsy = $("#contact-etsy").value;
  state.data.contact.gallery = $("#contact-gallery").value;

  try {
    await api("/api/data", { method: "PUT", body: JSON.stringify(state.data) });
    markSaved();
    toast("已保存");
  } catch (e) {
    toast("保存失败:" + e.message, "error");
    $("#save-btn").disabled = false;
    $("#save-state").className = "save-state is-dirty";
    $("#save-state").textContent = "保存失败";
  } finally {
    state.saving = false;
  }
}

// ============================================================
// Sidebar nav
// ============================================================
function bindNav() {
  $$(".nav-item").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const sec = a.dataset.section;
      $$(".nav-item").forEach(n => n.classList.toggle("is-active", n === a));
      $$(".panel").forEach(p => p.hidden = (p.id !== `panel-${sec}`));
      location.hash = sec;
    });
  });
  // Restore from hash
  const sec = (location.hash || "#hero").slice(1);
  const a = $(`.nav-item[data-section="${sec}"]`);
  if (a) a.click();
}

// ============================================================
// Helpers
// ============================================================
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}
function escapeAttr(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function formatBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}
function titleCaseFromBase(base) {
  return base.split("_")
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// ============================================================
// Boot
// ============================================================
async function loadData() {
  state.data = await api("/api/data");
  // Render everything
  renderHero();
  renderBio();
  renderWorks();
  renderExhib();
  renderContact();
}

async function init() {
  // Login form
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = $("#login-password").value;
    const err = $("#login-error");
    err.hidden = true;
    $("#login-btn").disabled = true;
    try {
      await tryLogin(pw);
      $("#login-password").value = "";
      await boot();
    } catch (e) {
      err.textContent = e.message || "登录失败";
      err.hidden = false;
    } finally {
      $("#login-btn").disabled = false;
    }
  });

  // Dashboard buttons
  $("#save-btn").addEventListener("click", saveAll);
  $("#logout-btn").addEventListener("click", logout);
  $("#bio-add").addEventListener("click", () => {
    state.data.bio.paragraphs.push("");
    renderBio(); markDirty();
  });
  $("#ex-add").addEventListener("click", () => {
    state.data.exhibitions.push({ name: "", location: "" });
    renderExhib(); markDirty();
  });
  $("#bio-quote").addEventListener("input", markDirty);
  ["#contact-email", "#contact-etsy", "#contact-gallery"].forEach(s => {
    $(s).addEventListener("input", markDirty);
  });

  bindModal();
  bindUploader();
  bindNav();

  // Save with Cmd/Ctrl+S
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (!state.saving && state.dirty) saveAll();
    }
  });

  // Warn on unload if dirty
  window.addEventListener("beforeunload", (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  await boot();
}

async function boot() {
  if (await checkAuth()) {
    showDash();
    await loadData();
  } else {
    showLogin();
  }
}

init();
