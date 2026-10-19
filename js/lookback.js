/* Comp lookback question: how far back to look on sold comps. Always asked when comps are requested
   (unless the user already said a window); last choice is the highlighted default. On-device only. */
(function (root) {
  "use strict";
  var CHOICES = [[30, "30 days"], [90, "90 days"], [365, "1 year"]];
  var KEY = "ch_compDays";
  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  function last() { var s = store(); var v = s ? Number(JSON.parse(s.getItem(KEY) || "90")) : 90; return v >= 1 && v <= 3650 ? Math.round(v) : 90; }
  function remember(d) { var s = store(); d = Math.round(Number(d)); if (s && d >= 1 && d <= 3650) s.setItem(KEY, JSON.stringify(d)); return d; }
  function label(d) { d = Number(d); return d === 365 ? "1 year" : d % 365 === 0 ? (d / 365) + " years" : d + " days"; }
  /* A window the user already said: "last 30 days", "past 2 weeks", "6 months", "1 year", "90d". */
  function parse(text) {
    var t = String(text || "").toLowerCase(), m = t.match(/\b(\d{1,4})\s*(d|days?|w|wks?|weeks?|mo|mos|months?|y|yrs?|years?)\b/);
    if (!m) { if (/\b(past|last)\s+(year|yr)\b/.test(t)) return 365; if (/\b(past|last)\s+month\b/.test(t)) return 30; if (/\b(past|last)\s+week\b/.test(t)) return 7; return null; }
    var n = +m[1], u = m[2];
    var d = /^d/.test(u) ? n : /^w/.test(u) ? n * 7 : /^mo/.test(u) ? n * 30 : n * 365;
    return d >= 1 && d <= 3650 ? d : null;
  }
  /* Is this a comp / value ask? */
  function isCompAsk(text) { return /\b(comps?|sold|worth|value|valued|price check|what.{0,12}(sell|go) for|going for|fair price|under comp|below comp|market price)\b/i.test(String(text || "")); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hasLast() { var s = store(); return !!(s && s.getItem(KEY)); }
  function html(id) {
    var d = last(), used = hasLast();
    return '<section class="card lookback" id="' + esc(id) + '" aria-label="How far back to look on sold comps">' +
      '<h2 class="h3" style="margin:0">How far back should we look on sold comps?</h2>' +
      '<p class="small muted" style="margin:4px 0 10px">e.g. 30 days for fast movers, 90 days for slower cards</p>' +
      '<div class="lb-chips" role="group" aria-label="Comp window">' + CHOICES.map(function (c) {
        return '<button type="button" class="ex-chip' + (c[0] === d ? " on" : "") + '" data-days="' + c[0] + '"' + (c[0] === d ? ' aria-pressed="true"' : "") + '>' + c[1] + (c[0] === d && used ? " · last used" : "") + '</button>';
      }).join("") + '<button type="button" class="ex-chip" data-days="custom">Custom</button></div>' +
      '<div class="lb-custom" hidden><input class="input" inputmode="numeric" maxlength="4" placeholder="Days, e.g. 60" aria-label="Custom days"><button type="button" class="btn btn-gold btn-sm">Use</button></div>' +
      (!used || CHOICES.some(function (c) { return c[0] === d; }) ? "" : '<p class="small muted" style="margin:8px 0 0">Last used: ' + esc(label(d)) + ' <button type="button" class="link-btn" data-days="' + d + '">Use it</button></p>') +
      '</section>';
  }
  function wire(el, cb) {
    if (!el) return;
    var box = el.querySelector(".lb-custom"), inp = box && box.querySelector("input");
    el.querySelectorAll("[data-days]").forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.days === "custom") { box.hidden = false; inp.focus(); return; }
        cb(remember(b.dataset.days));
      };
    });
    if (box) box.querySelector("button").onclick = function () { var n = parseInt(String(inp.value).replace(/[^0-9]/g, ""), 10); if (n >= 1 && n <= 3650) cb(remember(n)); else inp.focus(); };
  }
  var api = { CHOICES: CHOICES, last: last, remember: remember, label: label, parse: parse, isCompAsk: isCompAsk, html: html, wire: wire };
  root.CH_LOOKBACK = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
