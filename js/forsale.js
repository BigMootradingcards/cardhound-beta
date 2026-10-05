/* CardHound "For sale now": active eBay listings for the exact card, under the sold comps. Shared by every build:
 * - live app (cardhound/live_ui/live.js): real rows from POST /api/live/listings (eBay Browse API on the server, EPN links)
 * - friends beta + sample builds: never real listings; a clearly labeled Sample preview at most.
 * Rules: look only (no bid / buy / offer), exact variant only (the server filters with the comps' own title rules),
 * eBay's own order (never re-sorted by price), eBay rows kept in their own box apart from our comps (API License),
 * and the "may earn a commission" line right above the links whenever a link can pay us (FTC + EPN).
 * The optional Below / Above comp tag compares to OUR sold-comp median only (never eBay data), and only when the server turns it on. */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(v) { if (v == null || isNaN(v)) return "—"; var a = Math.abs(v), s = a >= 1000 ? Math.round(a).toLocaleString("en-US") : a.toFixed(a % 1 ? 2 : 0); return "$" + s; }
  function left(iso, now) {
    var t = Date.parse(iso || ""); if (isNaN(t)) return ""; var s = Math.floor((t - (now || Date.now())) / 1000);
    if (s <= 0) return "Ended"; var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return (d ? d + "d " + h + "h" : h ? h + "h " + m + "m" : m ? m + "m" : "<1m") + " left";
  }
  var EBAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-7.1 7.1a1.4 1.4 0 0 1-2 0l-8-8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.2" cy="8.2" r="1.6" fill="currentColor"/></svg>';   /* price tag */
  var EXT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function head(gl, d) {
    return '<div class="fs-h"><h2 class="fs-ht">For sale now</h2><span class="fs-g">' + esc(gl) + '</span>' + (d && d.sample ? '<span class="fs-sample">Sample</span>' : '') + '</div>';
  }
  function tag(price, median, on) {
    if (!on || median == null || price == null || price === median) return "";
    return price < median ? '<span class="fs-tag good">Below comp</span>' : '<span class="fs-tag bad">Above comp</span>';
  }
  function row(x, o) {
    var auc = x.format === "AUCTION", sample = !!x.sample;
    var fmt = auc ? '<span class="fs-fmt auc">Auction</span><span class="fs-left">' + esc(left(x.end_time, o.now)) + '</span>' + (x.bids != null ? '<span class="fs-bids">' + esc(x.bids) + (x.bids === 1 ? " bid" : " bids") + '</span>' : "")
      : '<span class="fs-fmt bin">Buy It Now</span>';
    var ship = x.shipping == null ? "" : x.shipping === 0 ? "Free ship" : "+" + money(x.shipping) + " ship";
    var ph = x.image ? '<img src="' + esc(x.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="fs-noimg">' + (sample ? "SAMPLE" : EBAY_SVG) + '</span>';
    var btn = sample ? '<span class="fs-btn off" aria-disabled="true">Sample · no link</span>'
      : '<a class="fs-btn" href="' + esc(x.url) + '" target="_blank" rel="sponsored noopener noreferrer" data-fs-open="1">See it on eBay' + EXT_SVG + '</a>';
    /* FEATURE_EBAY_PLACE_MAX: real auction rows get "Place my max" (the user types + confirms; eBay opens; no suggested max) */
    if (auc && !sample && o.placeMax && x.url) btn = '<div class="fs-btns">' + btn + '<button class="fs-pm" type="button" data-fs-pm="' + esc(o.i) + '">Place my max</button></div>';
    return '<li class="fs-row' + (sample ? " is-sample" : "") + '"><div class="fs-top"><span class="fs-ph">' + ph + '</span><div class="fs-mid"><p class="fs-t" title="' + esc(x.title) + '">' +
      (sample ? '<span class="fs-sample sm">Sample</span>' : "") + esc(x.title) + '</p><div class="fs-meta">' + fmt + '</div></div>' +
      '<div class="fs-right"><b class="fs-p num">' + money(x.price) + '</b>' + (auc ? '<small>current bid</small>' : '') + (ship ? '<small>' + esc(ship) + '</small>' : "") + tag(x.price, o.median, o.compare) + '</div></div>' + btn + '</li>';
  }
  /* d = the server payload (or CHForSale.sample(...)); o = { gradeLabel, median (our sold comps), now, preview: bool (show the Preview button) } */
  function html(d, o) {
    o = o || {}; var gl = o.gradeLabel || "", h = '<section class="fs" id="fs" aria-label="For sale now on eBay">' + head(gl, d);
    if (!d) return h + '<div class="fs-load"><span class="fs-spin"></span><b>Checking eBay…</b></div></section>';
    if (d.mode === "not_connected") return h + '<div class="fs-empty"><span class="fs-ei">' + EBAY_SVG + '</span><b>' + esc(d.say || "Connect eBay to see live listings") + '</b>' +
      '<small>Live eBay listings for this exact card will show here.</small>' + (o.preview ? '<button class="fs-prev" type="button" data-fs-preview="1">Preview with sample listings</button>' : "") + '</div></section>';
    if (d.mode === "error") return h + '<div class="fs-empty bad"><b>' + esc(d.say || "eBay didn't answer.") + '</b><button class="fs-prev" type="button" data-fs-retry="1">Try again</button></div></section>';
    var rows = d.rows || [], compare = !!d.compare && o.median != null;
    if (d.sample) h += '<p class="fs-disc sample">Sample listings · not real · no links</p>';
    else if (d.disclosure) h += '<p class="fs-disc" data-fs-disclosure="1">' + esc(d.disclosure) + '</p>';
    if (!rows.length) h += '<div class="fs-empty"><b>' + esc(d.say || "No exact listings for sale right now.") + '</b>' + (d.hidden ? '<small>' + esc(d.hidden) + ' loose match' + (d.hidden > 1 ? "es" : "") + ' hidden (wrong grade, parallel or card).</small>' : "") + '</div>';
    else h += '<ol class="fs-list">' + rows.map(function (x, i) { return row(x, { median: o.median, compare: compare, now: o.now, placeMax: !!o.placeMax, i: i }); }).join("") + '</ol>';
    var notes = [];
    if (rows.length) notes.push("Exact card and grade only" + (d.hidden ? " · " + d.hidden + " loose match" + (d.hidden > 1 ? "es" : "") + " hidden" : ""));
    if (compare && rows.length) notes.push("Comp = our sold median (" + money(o.median) + "), not eBay asks");
    notes.push(d.sample ? "Preview of the look · real listings need eBay connected" : (d.source_line || "Listings from eBay · look only, CardHound never bids or buys") + (d.age_s > 60 ? " · updated " + Math.round(d.age_s / 60) + " min ago" : ""));
    return h + '<p class="fs-foot">' + notes.map(esc).join("<br>") + '</p></section>';
  }
  /* Clearly-fake preview rows (titles say Sample, no photo, no link). Never used as data anywhere. */
  function sample(card, grade, median) {
    var base = median != null && median > 0 ? median : 100, gl = grade === "RAW" ? "Raw" : grade, nm = (card && (card.name || card.player)) || "This card";
    var now = Date.now(), mk = function (k, f, fmt, hrs, bids, ship) {
      return { title: "Sample listing " + k + " · " + nm + " · " + gl, image: null, price: Math.round(base * f), format: fmt, bids: fmt === "AUCTION" ? bids : null,
        end_time: fmt === "AUCTION" ? new Date(now + hrs * 3600e3).toISOString() : null, shipping: ship, url: "", affiliate: false, sample: true }; };
    return { mode: "sample", sample: true, connected: false, compare: true, grade: grade, hidden: 0, look_only: true,
      rows: [mk(1, 0.9, "BIN", 0, 0, 0), mk(2, 0.84, "AUCTION", 5.3, 7, 4.5), mk(3, 1.12, "BIN", 0, 0, 5)] };
  }
  window.CHForSale = { html: html, sample: sample, left: left, money: money };
})();
