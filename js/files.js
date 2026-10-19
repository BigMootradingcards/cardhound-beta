/* My files: on-device storage for hunts, comps, lists and notes (localStorage, this phone only; nothing uploaded).
   Text is stored as text and always rendered escaped. Caps keep storage small. */
(function (root) {
  "use strict";
  var KEY = "ch_files", MAX_FILES = 300, MAX_BODY = 20000, MAX_ROWS = 200;
  var TYPES = { hunt: "Hunt", comp: "Comp", list: "List", note: "Note" };
  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  function clean(s, n) { return String(s == null ? "" : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, n); }
  function safeUrl(u) { u = clean(u, 500).trim(); return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }
  function cleanRow(r) {
    r = r && typeof r === "object" ? r : { title: r };
    var o = { title: clean(r.title, 200).trim() };
    if (r.url) o.url = safeUrl(r.url);
    ["price", "shipping", "bid"].forEach(function (k) { var n = Number(r[k]); if (r[k] != null && isFinite(n) && n >= 0) o[k] = Math.round(n * 100) / 100; });
    ["source", "grade", "note", "endTime", "window", "detail"].forEach(function (k) { if (r[k] != null && r[k] !== "") o[k] = clean(r[k], 200); });
    if (r.auction) o.auction = true;
    return o;
  }
  function norm(f) {
    if (!f || typeof f !== "object") return null;
    var type = TYPES[f.type] ? f.type : "note";
    return { id: clean(f.id, 40) || ("f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)), type: type, name: clean(f.name, 80).trim() || TYPES[type],
      body: clean(f.body, MAX_BODY), rows: (Array.isArray(f.rows) ? f.rows : []).slice(0, MAX_ROWS).map(cleanRow).filter(function (r) { return r.title; }),
      meta: f.meta && typeof f.meta === "object" ? { query: clean(f.meta.query, 300), window: clean(f.meta.window, 40), card: clean(f.meta.card, 200) } : {},
      created: Number(f.created) || Date.now(), updated: Number(f.updated) || Date.now() };
  }
  function list() { var s = store(); try { var a = JSON.parse((s && s.getItem(KEY)) || "[]"); return Array.isArray(a) ? a.map(norm).filter(Boolean) : []; } catch (e) { return []; } }
  function write(a) { var s = store(); if (!s) return false; try { s.setItem(KEY, JSON.stringify(a.slice(0, MAX_FILES))); return true; } catch (e) { return false; } }
  function get(id) { return list().filter(function (f) { return f.id === id; })[0] || null; }
  function save(f) {
    var n = norm(f); if (!n) return null; n.updated = Date.now();
    var a = list().filter(function (x) { return x.id !== n.id; }); a.unshift(n);
    return write(a) ? n : null;
  }
  function create(type, name, data) { data = data || {}; return save({ type: type, name: name, body: data.body, rows: data.rows, meta: data.meta, created: Date.now() }); }
  function rename(id, name) { var f = get(id); if (!f) return null; f.name = name; return save(f); }
  function remove(id) { return write(list().filter(function (f) { return f.id !== id; })); }
  /* Add one row to a named list (creates it). */
  function addToList(name, row) {
    var f = list().filter(function (x) { return x.type === "list" && x.name === name; })[0] || norm({ type: "list", name: name, rows: [] });
    var r = cleanRow(row); if (!r.title) return null;
    if (f.rows.some(function (x) { return (r.url && x.url === r.url) || (!r.url && x.title === r.title); })) return f;
    f.rows.unshift(r); return save(f);
  }
  function csvCell(v) { v = v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  var COLS = ["title", "price", "shipping", "bid", "auction", "endTime", "grade", "source", "url", "note"];
  function toCSV(f) {
    if (!f.rows.length) return "text\n" + f.body.split(/\n/).map(csvCell).join("\n");
    return COLS.join(",") + "\n" + f.rows.map(function (r) { return COLS.map(function (c) { return csvCell(r[c]); }).join(","); }).join("\n");
  }
  function toText(f) {
    var head = f.name + " (" + TYPES[f.type] + ")" + (f.meta.query ? "\nSearch: " + f.meta.query : "") + (f.meta.window ? "\nComp window: " + f.meta.window : "");
    var rows = f.rows.map(function (r) { return "- " + r.title + (r.price != null ? " · $" + r.price : "") + (r.auction ? " · auction" + (r.endTime ? " ends " + r.endTime : "") : "") + (r.grade ? " · " + r.grade : "") + (r.detail ? " · " + r.detail : "") + (r.url ? "\n  " + r.url : ""); }).join("\n");
    return head + "\n\n" + (f.body ? f.body + "\n\n" : "") + rows + "\n";
  }
  function parseCSV(text) {
    var rows = [], row = [], cell = "", q = false, i, c;
    for (i = 0; i < text.length; i++) { c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }
  /* Import a .csv / .txt / .json the user picked. Returns the saved file or null. */
  function importText(name, text) {
    text = clean(text, 200000); name = clean(name, 80).replace(/\.(csv|txt|json|md)$/i, "") || "Imported";
    try { var j = JSON.parse(text); if (j && typeof j === "object" && !Array.isArray(j) && (j.rows || j.body)) return save(Object.assign({}, j, { id: "", name: j.name || name, created: Date.now() })); } catch (e) {}
    if (/\.csv$/i.test(arguments[0] || "") || /^[^\n]*,[^\n]*\n/.test(text)) {
      var g = parseCSV(text), hdr = (g[0] || []).map(function (h) { return h.trim().toLowerCase(); });
      var ti = hdr.indexOf("title") > -1 ? hdr.indexOf("title") : hdr.indexOf("card") > -1 ? hdr.indexOf("card") : hdr.indexOf("name");
      if (ti > -1) return create("list", name, { rows: g.slice(1).map(function (r) { var o = {}; hdr.forEach(function (h, k) { o[h] = r[k]; }); o.title = r[ti]; o.auction = /^(true|yes|1)$/i.test(o.auction || ""); return o; }) });
    }
    return create("note", name, { body: text.slice(0, MAX_BODY) });
  }
  var api = { TYPES: TYPES, list: list, get: get, save: save, create: create, rename: rename, remove: remove, addToList: addToList, toCSV: toCSV, toText: toText, importText: importText, parseCSV: parseCSV };
  root.CH_FILES = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
