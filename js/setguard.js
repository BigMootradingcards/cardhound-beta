/* Exact-set guard for the Check flow.
   Topps ≠ Topps Chrome ≠ Finest ≠ Update. Base ≠ refractor / parallel.
   Mismatch, missing set, or ambiguity → UNPRICED. Never borrow another card's price.
   If window.CH_SETMATCH.evaluate rejects a card, that rejection sticks.
   A setmatch approval does not override a local mismatch. */
(function (root) {
  "use strict";
  var LINES = [
    ["topps chrome update", "topps chrome update"],
    ["chrome update", "topps chrome update"],
    ["topps chrome traded", "topps chrome traded"],
    ["chrome traded", "topps chrome traded"],
    ["bowman chrome", "bowman chrome"],
    ["topps chrome", "topps chrome"],
    ["topps update", "topps update"],
    ["topps finest", "finest"],
    ["finest", "finest"],
    ["topps traded", "topps traded"],
    ["topps", "topps"]
  ];
  var PARALLEL_WORDS = ["refractor", "xfractor", "x fractor", "parallel", "prizm", "prism", "silver", "gold", "mojo", "shimmer", "wave", "atomic", "numbered"];

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9#/ ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function normNum(s) { return String(s || "").replace(/^#/, "").trim().toUpperCase(); }
  function productLine(setName) {
    var s = norm(setName);
    if (!s) return "";
    for (var i = 0; i < LINES.length; i++) if (s.indexOf(LINES[i][0]) > -1) return LINES[i][1];
    return s;
  }
  function variantHead(v) {
    var s = String(v || "").split("·")[0].split("|")[0].trim();
    return s;
  }
  function variantKey(v) {
    var s = norm(variantHead(v)).replace(/non refractor/g, " ").replace(/\s+/g, " ").trim();
    if (!s) return "";
    /* Seller slang: Green Cracked Ice ≡ Green Ice. Bare "Cracked Ice" → "ice" (no invented color). */
    s = s.replace(/\bcracked\s+ice\b/g, "ice").replace(/\s+/g, " ").trim();
    var serial = (s.match(/\/\d+/) || [""])[0];
    var found = PARALLEL_WORDS.filter(function (w) { return s.indexOf(w) > -1; });
    if (found.length) return found.join("+") + serial;
    var body = s.replace(/\/\d+/g, " ").replace(/\s+/g, " ").trim();
    if (/^base\b/.test(body) || body === "raw") return "base";
    /* Keep named finish/color (teal ice /225) — never collapse to bare parallel/NNN. */
    if (body) return "other:" + body + serial;
    if (serial) return "parallel" + serial;
    return "";
  }
  function parseCardLine(name, variant) {
    var s = String(name || "").trim();
    var ym = s.match(/\b((?:19|20)\d{2}(?:-\d{2})?)\b/);
    var year = ym ? ym[1] : "";
    var nm = s.match(/#\s*([A-Za-z]?\d+[A-Za-z0-9]*)/);
    var number = nm ? nm[1] : "";
    var set = "", player = "";
    if (year && nm) {
      var i = s.indexOf(year) + year.length;
      var j = s.indexOf(nm[0]);
      set = s.slice(i, j).replace(/^[\s\-–—]+|[\s\-–—]+$/g, "").trim();
      player = s.slice(j + nm[0].length).trim();
    }
    return { year: year, set: set, number: number, player: player, variant: variantHead(variant), name: s };
  }
  function structureCandidate(c) {
    c = c || {};
    var parsed = parseCardLine(c.name, c.variant);
    parsed.id = c.id || "";
    parsed.score = c.score || 0;
    parsed.priceable = !!c.hasReport || !!c.priceable;
    parsed.rawVariant = c.variant || "";
    if (!parsed.variant) parsed.variant = variantHead(c.variant);
    return parsed;
  }
  function structureAll(list) { return (list || []).map(structureCandidate); }
  function photoRead(candidates) {
    var list = (candidates || []).slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    return list[0] || null;
  }
  function lineOf(card) {
    if (!card) return "";
    var set = card.set || "";
    var num = card.number ? "#" + normNum(card.number) : "";
    var variant = variantHead(card.variant || "");
    return [card.year, set, num, variant].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  function copyFor(code, picked, read) {
    var headline = "We won't guess the set.";
    var detail = "Wrong set → wrong price.";
    if (code === "missing_set") detail = "Name the set. Example: 1998 Topps Chrome — not just \"Moss 35\".";
    else if (code === "missing_number") detail = "Add the card number before any price.";
    else if (code === "missing_variant") detail = "Base and Refractor don't share a price. Name the variant.";
    else if (code === "chrome_vs_paper" || code === "set_mismatch") detail = "Topps and Topps Chrome are different cards.";
    else if (code === "finest_mismatch") detail = "Finest is its own set. We won't use another set's price.";
    else if (code === "update_mismatch") detail = "Update is a different set. We won't guess.";
    else if (code === "variant_mismatch") detail = "Base and Refractor don't share a price.";
    else if (code === "number_mismatch" || code === "year_mismatch") detail = "Wrong number or year → wrong price.";
    else if (code === "ambiguous") detail = "Photo matches more than one card. Pick the set and number.";
    else if (code === "no_exact_comp") detail = "No exact-card comps for that set and variant. We won't borrow another card's price.";
    return {
      priced: false,
      showPrices: false,
      code: code,
      title: "UNPRICED",
      headline: headline,
      detail: detail,
      pickedLine: lineOf(picked),
      readLine: lineOf(read),
      picked: picked || null
    };
  }
  function mismatchCode(a, b) {
    var ac = a.indexOf("chrome") > -1, bc = b.indexOf("chrome") > -1;
    if (ac !== bc) return "chrome_vs_paper";
    if (a === "finest" || b === "finest") return "finest_mismatch";
    if (a.indexOf("update") > -1 || b.indexOf("update") > -1) return "update_mismatch";
    return "set_mismatch";
  }
  function catalogHit(picked, catalog) {
    var line = productLine(picked.set), num = normNum(picked.number), vk = variantKey(picked.variant);
    var hits = (catalog || []).filter(function (c) {
      return productLine(c.set) === line && normNum(c.number) === num && variantKey(c.variant) === vk && vk;
    });
    return hits[0] || null;
  }
  function evaluate(picked, ctx) {
    picked = picked || {};
    ctx = ctx || {};
    var ext = null;
    var SM = root.CH_SETMATCH;
    if (SM && typeof SM.evaluate === "function") {
      try { ext = SM.evaluate(picked, ctx); }
      catch (e) { return copyFor("setmatch_error", picked, ctx.read); }
      if (ext && (ext.priced === false || ext.unpriced === true)) {
        var code = ext.code || "setmatch";
        var model = copyFor(code, picked, ctx.read);
        if (ext.headline) model.headline = ext.headline;
        if (ext.detail) model.detail = ext.detail;
        if (ext.title) model.title = ext.title;
        model.showPrices = false;
        model.priced = false;
        return model;
      }
    }
    if (!norm(picked.set)) return copyFor("missing_set", picked, ctx.read);
    if (!normNum(picked.number)) return copyFor("missing_number", picked, ctx.read);
    if (!variantKey(picked.variant)) return copyFor("missing_variant", picked, ctx.read);
    var read = ctx.read || null;
    if (read && norm(read.set)) {
      if (read.year && picked.year && String(read.year).slice(0, 4) !== String(picked.year).slice(0, 4)) return copyFor("year_mismatch", picked, read);
      var a = productLine(read.set), b = productLine(picked.set);
      if (a && b && a !== b) return copyFor(mismatchCode(a, b), picked, read);
      if (normNum(read.number) && normNum(picked.number) && normNum(read.number) !== normNum(picked.number)) return copyFor("number_mismatch", picked, read);
      var ra = variantKey(read.variant), rb = variantKey(picked.variant);
      if (ra && rb && ra !== rb) return copyFor("variant_mismatch", picked, read);
    }
    if (ctx.ambiguous && !ctx.explicitPick) return copyFor("ambiguous", picked, read);
    var hit = catalogHit(picked, ctx.catalog);
    if (hit) picked.priceable = !!hit.priceable;
    if (picked.priceable === false || (!hit && picked.priceable !== true)) return copyFor("no_exact_comp", picked, read);
    return { priced: true, showPrices: true, code: "exact", picked: picked, pickedLine: lineOf(picked), readLine: lineOf(read) };
  }
  function huntCandidates(query, sampleCandidates, fields) {
    fields = fields || {};
    var all = structureAll(sampleCandidates);
    var qline = productLine(fields.set || query || "");
    var qnum = normNum(fields.card_number || "");
    var qvar = fields.parallel_color ? variantKey(fields.parallel_color) : "";
    var player = String(fields.player || "").toLowerCase().trim();
    var last = player ? player.split(" ").pop() : "";
    return all.filter(function (c) {
      if (qnum && normNum(c.number) !== qnum) return false;
      if (last && (c.player || "").toLowerCase().indexOf(last) === -1 && (c.name || "").toLowerCase().indexOf(last) === -1) return false;
      if (qline && productLine(c.set) !== qline) return false;
      if (qvar && variantKey(c.variant) !== qvar) return false;
      return !!(qnum || last || qline);
    });
  }
  function confirmRequired() { return true; }
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function saleStamp(s) {
    var raw = String((s && s.date) || "");
    var iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return (+iso[1]) * 10000 + (+iso[2]) * 100 + (+iso[3]);
    var m = raw.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
    if (!m) return 0;
    var month = MONTHS[m[1].slice(0, 3).toLowerCase()] || 0;
    return (m[3] ? +m[3] : 2026) * 10000 + month * 100 + (+m[2]);
  }
  /* Newest exact-card sale first. A different set, number, or variant is not a comp. */
  function orderSales(sales, card) {
    card = card || {};
    return (sales || []).filter(function (s) {
      if (!s || s.excluded) return false;
      if (s.year && card.year && String(s.year).slice(0, 4) !== String(card.year).slice(0, 4)) return false;
      if (s.set && productLine(card.set) && productLine(s.set) !== productLine(card.set)) return false;
      if (s.number && card.number && normNum(s.number) !== normNum(card.number)) return false;
      if (s.variant && card.variant && variantKey(s.variant) && variantKey(card.variant) && variantKey(s.variant) !== variantKey(card.variant)) return false;
      return true;
    }).slice().sort(function (a, b) { return saleStamp(b) - saleStamp(a); });
  }
  var api = {
    norm: norm, productLine: productLine, variantKey: variantKey, variantHead: variantHead,
    parseCardLine: parseCardLine, structureCandidate: structureCandidate, structureAll: structureAll,
    photoRead: photoRead, evaluate: evaluate, huntCandidates: huntCandidates, lineOf: lineOf,
    confirmRequired: confirmRequired, orderSales: orderSales, saleStamp: saleStamp
  };
  root.CH_SETGUARD = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
