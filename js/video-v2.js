/* CardHound video-v2 screens. SAMPLE BUILD ONLY. Three add-on routes, registered through CH_APP_PLUGINS (app.js is not edited):
 *   #/graded  What it pays graded: PSA 8 / 9 / 10 value minus PSA's published grading fee and return shipping. No grade odds.
 *   #/alerts  Subscriber alert cards: sold way above its 30-day average, new record high, new 30-day high, new 30-day low.
 *             One-off sales (CardHound's outlier rule, same as cardhound/core.py flag_outliers) never trigger an alert.
 *   #/hounds  The Hound's List: curated movers we're watching. Pro-locked, blurred preview, unlock CTA.
 * Off wherever window.CH_LIVE_CFG exists (the private live app, the friends beta) unless CH_LIVE_CFG.features.video_v2 is true.
 * Every price here is invented sample data (window.CARDHOUND_SAMPLE + the sample histories below). */
(function () {
  "use strict";
  var V2 = window.CH_V2 = {};

  /* ---------- PSA published fees (cards, US). Checked Oct 4, 2026. Value tiers are paused at PSA, so they are not used. ---------- */
  V2.PSA = {
    checked: "Oct 4, 2026",
    feeSource: "psacard.com/services/fees", feeUrl: "https://www.psacard.com/services/fees",
    shipSource: "psacard.com/info/postage", shipUrl: "https://www.psacard.com/info/postage",
    levels: [{ fee: 59.99, max: 1000, name: "Standard" }, { fee: 79.99, max: 1500 }, { fee: 199, max: 2500 }, { fee: 349, max: 5000 }, { fee: 599, max: 10000 }],
    ship: [{ fee: 19.99, max: 2000 }, { fee: 34.99, max: 12500 }, { fee: 49.99, max: 25000 }]   /* return shipping, 1 to 4 cards, by max insured value */
  };
  /* PSA picks the level from the card's value AFTER grading (max insured value), so each grade can land on a different level. */
  V2.psaLevel = function (value) { for (var i = 0; i < V2.PSA.levels.length; i++) if (value <= V2.PSA.levels[i].max) return V2.PSA.levels[i]; return null; };
  V2.psaShip = function (value) { for (var i = 0; i < V2.PSA.ship.length; i++) if (value <= V2.PSA.ship[i].max) return V2.PSA.ship[i]; return null; };
  V2.gradedNet = function (value, cost) {
    var lv = V2.psaLevel(value), sh = V2.psaShip(value);
    if (!lv || !sh) return { value: value, level: null, ship: null, net: null, profit: null, good: null };   /* over $10,000: PSA's Premium price, not computed */
    var net = Math.round((value - lv.fee - sh.fee) * 100) / 100, profit = Math.round((net - cost) * 100) / 100;
    return { value: value, level: lv, ship: sh, net: net, profit: profit, good: profit > 0 };
  };

  /* Selling fee for the "what you keep" math: the standard US trading-card final value fee, 13.25% of the sale up to $7,500,
     2.35% above, plus $0.40 per order over $10 ($0.30 at $10 or less). Source: the marketplace's published selling-fees page,
     https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822 (checked Oct 4, 2026). The screen shows
     the rate, not the marketplace name. Buyer pays shipping on the sale, so no outbound shipping is taken out. */
  V2.SELL = { pct: 0.1325, cap: 7500, pctOver: 0.0235, perOrder: 0.40, perOrderSmall: 0.30, checked: "Oct 4, 2026" };
  V2.sellFee = function (v) { var S = V2.SELL; return Math.round((S.pct * Math.min(v, S.cap) + S.pctOver * Math.max(0, v - S.cap) + (v > 10 ? S.perOrder : S.perOrderSmall)) * 100) / 100; };
  /* Every way to cash it: SELL RAW vs PSA 8 / 9 / 10. keep = value - grading - PSA return shipping - selling fee.
     The call never uses grade odds (CardHound has none): GRADE IT only if grading still keeps more than selling raw at a PSA 9. */
  V2.cashIt = function (vals, cost) {
    function r2(x) { return Math.round(x * 100) / 100; }
    var rows = [{ id: "raw", label: "Sell raw", value: vals.raw, grading: 0, ship: 0, sell: V2.sellFee(vals.raw) }];
    ["PSA 8", "PSA 9", "PSA 10"].forEach(function (g) {
      var v = vals[g], lv = V2.psaLevel(v), sh = V2.psaShip(v);
      rows.push({ id: g, label: g, value: v, grading: lv ? lv.fee : null, ship: sh ? sh.fee : null, sell: V2.sellFee(v), level: lv });
    });
    rows.forEach(function (x) {
      x.keep = x.grading == null || x.ship == null ? null : r2(x.value - x.grading - x.ship - x.sell);
      x.profit = x.keep == null ? null : r2(x.keep - cost); x.good = x.profit != null && x.profit > 0;
    });
    var ok = rows.filter(function (x) { return x.keep != null; }), best = ok.reduce(function (a, b) { return b.keep > a.keep ? b : a; }, ok[0]);
    best.best = true;
    var raw = rows[0], p8 = rows[1], p9 = rows[2], call, why;
    if (p9.keep != null && p9.keep > raw.keep) {
      call = "GRADE IT";
      why = "Keeps " + "$" + Math.round(p9.keep - raw.keep).toLocaleString() + " more than selling raw if it comes back a 9" +
        (p8.keep != null && p8.keep < raw.keep ? ", but $" + Math.round(raw.keep - p8.keep).toLocaleString() + " less at an 8." : ", and still more at an 8.");
    } else if (raw.keep >= cost) {
      call = "SELL RAW"; why = "Selling raw keeps $" + Math.round(raw.keep).toLocaleString() + ". Grading only beats that at a 10.";
    } else {
      call = "HOLD"; why = "Selling now keeps less than you paid, and grading doesn't win unless it's a 10.";
    }
    return { rows: rows, best: best, call: call, why: why, cost: cost };
  };

  /* % change for the report chart: median of the newest 30 days of sales vs the median of the 30 days before that,
     measured back from the newest sale. Needs 2+ sales in each window, otherwise no number is shown. */
  V2.pctChange = function (sales) {
    function med(a) { a = a.slice().sort(function (x, y) { return x - y; }); var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
    var pts = (sales || []).map(function (x) { return { t: Date.parse(String(x.date || x.sold_at || "").slice(0, 10) + "T12:00:00Z"), p: +x.price }; })
      .filter(function (x) { return x.t && x.p > 0; });
    if (!pts.length) return null;
    var end = Math.max.apply(null, pts.map(function (x) { return x.t; })), D = 864e5;
    var a = pts.filter(function (x) { return x.t > end - 30 * D; }).map(function (x) { return x.p; });
    var b = pts.filter(function (x) { return x.t <= end - 30 * D && x.t > end - 60 * D; }).map(function (x) { return x.p; });
    if (a.length < 2 || b.length < 2) return null;
    var now = med(a), before = med(b);
    return { pct: Math.round((now - before) / before * 1000) / 10, now: now, before: before, nNow: a.length, nBefore: b.length };
  };

  /* ---------- outlier rule (port of cardhound/core.py flag_outliers) + alert rules ---------- */
  var MIN_NB = 5, HI = 1.6, LO = 0.55, DAY = 864e5;
  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; }
  V2.flagOutliers = function (sales) {
    var order = sales.map(function (s, i) { return i; }).sort(function (a, b) { return sales[a].date < sales[b].date ? 1 : sales[a].date > sales[b].date ? -1 : 0; });
    var ps = order.map(function (i) { return +sales[i].price; });
    order.forEach(function (i, j) {
      var newer = ps.slice(Math.max(0, j - 5), j), nb = newer.concat(ps.slice(j + 1, j + 6));
      if (nb.length < MIN_NB) return;
      var m = median(nb); if (!m) return;
      var mad = median(nb.map(function (x) { return Math.abs(x - m); })) * 1.4826, p = ps[j], r = p / m;
      var near = r > 1 ? newer : nb, backed = near.filter(function (x) { return Math.abs(x - p) <= 0.25 * p; }).length;
      if ((r >= HI || r <= LO) && (!mad || Math.abs(p - m) > 3 * mad) && backed < 2) sales[i].outlier = "one-off: " + r.toFixed(1) + "x the median of the " + nb.length + " sales nearest in time";
    });
    return sales;
  };
  V2.RULES = { aboveAvgPct: 0.35, confirmN: 2, confirmPct: 0.25 };
  function t(d) { return Date.parse(d + "T12:00:00Z"); }
  /* -> { type, label, tone, price, ref, refLabel, pct, backed, newest, heldOneOff } for the newest sale of one card + grade */
  V2.evaluateAlert = function (sales) {
    var all = V2.flagOutliers(sales.map(function (s) { return { date: s.date, price: +s.price }; })).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var top = all[all.length - 1];
    if (top && top.outlier) return { type: "held", heldOneOff: true, newest: top, why: top.outlier };   /* a one-off never alerts */
    var s = all.filter(function (x) { return !x.outlier; }); if (s.length < 4) return null;
    var nw = s[s.length - 1], prior = s.slice(0, -1), last5 = prior.slice(-5), C = V2.RULES;
    var up = last5.filter(function (x) { return x.price >= nw.price * (1 - C.confirmPct); }).length;
    var down = last5.filter(function (x) { return x.price <= nw.price * (1 + C.confirmPct); }).length;
    var in30 = prior.filter(function (x) { return t(nw.date) - t(x.date) <= 30 * DAY; });
    var base30 = in30.slice(0, Math.max(0, in30.length - 2));   /* the 30-day average before the run: leaves out the 2 sales right before the newest */
    var maxAll = Math.max.apply(null, prior.map(function (x) { return x.price; }));
    var r = { newest: nw, backed: up };
    if (up < C.confirmN && down < C.confirmN) return null;
    if (nw.price > maxAll && up >= C.confirmN) return Object.assign(r, { type: "record", label: "New record high", tone: "gold", ref: maxAll, refLabel: "old high", pct: nw.price / maxAll - 1 });
    if (base30.length >= 3) {
      var avg = base30.reduce(function (a, x) { return a + x.price; }, 0) / base30.length;
      if (nw.price >= avg * (1 + C.aboveAvgPct) && up >= C.confirmN) return Object.assign(r, { type: "above_avg", label: "Sold way above its 30-day average", tone: "up", ref: Math.round(avg * 100) / 100, refLabel: "30-day avg", pct: nw.price / avg - 1 });
    }
    if (in30.length >= 3) {
      var hi = Math.max.apply(null, in30.map(function (x) { return x.price; })), lo = Math.min.apply(null, in30.map(function (x) { return x.price; }));
      if (nw.price > hi && up >= C.confirmN) return Object.assign(r, { type: "high30", label: "New 30-day high", tone: "up", ref: hi, refLabel: "30-day high was", pct: nw.price / hi - 1 });
      if (nw.price < lo && down >= C.confirmN) return Object.assign(r, { type: "low30", label: "New 30-day low", tone: "down", ref: lo, refLabel: "30-day low was", pct: nw.price / lo - 1, backed: down });
    }
    return null;
  };

  /* ---------- sample sale histories for the alert cards (invented; cards and grades match sample movers / new highs) ---------- */
  function hist(rows) { return rows.map(function (r) { return { date: r[0], price: r[1] }; }); }
  V2.ALERT_SAMPLES = [
    { card: "2018 Panini Prizm #280 Luka Doncic RC", grade: "PSA 9", when: "Oct 3", sales: hist([["2026-01-14", 288], ["2026-03-02", 251], ["2026-05-19", 247], ["2026-07-08", 259], ["2026-08-30", 264], ["2026-09-12", 266], ["2026-09-20", 268], ["2026-09-24", 275], ["2026-09-28", 281], ["2026-10-01", 279], ["2026-10-03", 312]]) },
    { card: "2003 Topps Chrome #111 LeBron James RC", grade: "PSA 9", when: "Oct 4", sales: hist([["2025-10-18", 136], ["2025-10-25", 133], ["2025-11-02", 140], ["2025-11-09", 131], ["2026-08-29", 79], ["2026-09-06", 82], ["2026-09-11", 78], ["2026-09-17", 80], ["2026-09-23", 81], ["2026-09-27", 79], ["2026-10-01", 108], ["2026-10-03", 112], ["2026-10-04", 115]]) },
    { card: "2022 Panini Prizm #353 Brock Purdy RC", grade: "PSA 10", when: "Oct 4", sales: hist([["2023-02-11", 1150], ["2026-08-31", 772], ["2026-09-08", 781], ["2026-09-15", 760], ["2026-09-21", 795], ["2026-09-26", 788], ["2026-09-30", 801], ["2026-10-04", 845]]) },
    { card: "2020 Panini Prizm #307 Joe Burrow RC", grade: "PSA 10", when: "Oct 3", sales: hist([["2026-08-28", 281], ["2026-09-05", 276], ["2026-09-12", 270], ["2026-09-18", 263], ["2026-09-24", 259], ["2026-09-29", 252], ["2026-10-01", 255], ["2026-10-03", 238]]) },
    { card: "2017 Panini Prizm #269 Patrick Mahomes RC", grade: "PSA 10", when: "Oct 4", sales: hist([["2026-08-20", 421], ["2026-08-27", 430], ["2026-09-03", 418], ["2026-09-10", 427], ["2026-09-17", 433], ["2026-09-22", 425], ["2026-09-27", 429], ["2026-10-01", 431], ["2026-10-04", 1050]]) }
  ];

  /* ---------- plugin ---------- */
  /* Flags. Off by default.
       ask / ask_hound -> Ask your Hound (#/dig) only. Friends beta turns this on by default.
       v2              -> full video extras (graded, alerts, Hound's List, report cash-it).
       capture         -> hide marketplace / auction / bid UI for filming.
     ?flags=ask|v2|v2,capture persists until ?flags=off. CH_LIVE_CFG.features.ask_hound / .video_v2 / .capture also work. */
  V2.flags = function () {
    var f = {};
    try {
      var q = new URLSearchParams(location.search).get("flags");
      if (q != null) { if (/^(off|none|0)$/i.test(q)) localStorage.removeItem("ch_flags"); else localStorage.setItem("ch_flags", q); }
      String(localStorage.getItem("ch_flags") || "").split(/[,\s]+/).forEach(function (k) { if (k) f[k.toLowerCase()] = true; });
    } catch (e) {}
    var L = window.CH_LIVE_CFG, F = (L && L.features) || {};
    if (F.ask_hound || F.ask) f.ask = true;
    if (F.video_v2) f.v2 = true; if (F.capture) f.capture = true;
    if (f.v2 || f.ask || f.ask_hound) f.ask = true;
    return f;
  };
  function enabled() { return !!(V2.flags().ask || V2.flags().v2); }
  V2.enabled = enabled;
  (window.CH_APP_PLUGINS = window.CH_APP_PLUGINS || []).push(function (U) {
    if (!enabled()) return;
    var F = V2.flags(), askOn = !!F.ask, v2On = !!F.v2;
    if (askOn || v2On) document.documentElement.classList.add("ch-v2");
    /* Report add-ons are video-v2 only (not on the friends-beta Ask). */
    var decorate = function () {
      if (!v2On) return;
      var view = document.getElementById("view"); if (!view || !/^#\/report/.test(location.hash)) return;
      var cc = view.querySelector(".lv-cc");
      if (cc && !view.querySelector(".v2-cashbtn")) cc.insertAdjacentHTML("afterend", '<a class="btn btn-gold v2-cashbtn" href="#/graded">' + U.I("spark") + 'Every way to cash it</a>');
      var hd = view.querySelector(".lv-chhead");
      if (hd && !hd.querySelector(".v2-chg")) {
        var cur = null; try { cur = (JSON.parse(sessionStorage.getItem("ch_live_last") || "null") || {}).cur; } catch (e) {}
        var tab = view.querySelector(".lv-gt.on"), g = tab ? tab.dataset.g : "RAW", ch = cur && V2.pctChange((cur.sales_by_grade || {})[g]);
        if (ch) hd.insertAdjacentHTML("beforeend", '<span class="v2-chg ' + (ch.pct >= 0 ? "up" : "down") + '" title="Median of the newest 30 days of sales vs the 30 days before">' + (ch.pct >= 0 ? "\u25B2 +" : "\u25BC ") + ch.pct + '% vs prior 30 days</span>');
      }
    };
    if (v2On) new MutationObserver(function () { clearTimeout(decorate.t); decorate.t = setTimeout(decorate, 40); }).observe(document.body, { childList: true, subtree: true });
    if (v2On && F.capture) {   /* capture mode: hide anything that names a marketplace, auction, bid or sniper */
      document.documentElement.classList.add("ch-capture");
      var BAN = /\b(e-?bay|auctions?|bids?|bidding|snip(e|er|es|ing)|auction watch|for sale now)\b/i;
      var SENT = /[^.!?]*\b(e-?bay|auctions?|bids?|bidding|snip(e|er|es|ing))\b[^.!?]*[.!?]?\s*/gi;
      var sweep = function () {
        var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, hits = [];
        while ((n = w.nextNode())) if (BAN.test(n.nodeValue || "")) hits.push(n);
        hits.forEach(function (t) {
          var el = t.parentElement; if (!el || el.closest("script,style")) return;
          if ((t.nodeValue || "").length > 60) { t.nodeValue = t.nodeValue.replace(SENT, ""); return; }   /* long disclaimer: drop just that sentence */
          (el.closest("button, a, li .lv-smeta, .lv-smeta, .chip, .seg button, small, span, p, li, tr") || el).classList.add("v2-capture-hide");
        });
      };
      new MutationObserver(function () { clearTimeout(sweep.t); sweep.t = setTimeout(sweep, 30); }).observe(document.body, { childList: true, subtree: true });
      sweep();
    }
    var esc = U.esc, I = U.I, LS = U.LS, money = function (v) { return "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
    function badge() { return '<span class="v2-sample"><i></i>SAMPLE</span>'; }
    function shell(eyebrow, title, body) {
      U.view.innerHTML = '<div class="v2"><div class="row between" style="align-items:center"><div class="eyebrow">' + eyebrow + '</div>' + badge() + '</div><h1 class="h1 v2-h1">' + title + '</h1>' + body + '</div>' + U.footer();
    }

    if (v2On) {
    /* #/graded : Every way to cash it */
    U.addRoute("graded", function () {
      Promise.all([U.D.getCardReport("PUJOLS-01TCT-T247"), U.D.getLedger ? U.D.getLedger().catch(function () { return []; }) : Promise.resolve([])]).then(function (res) {
        var r = res[0], led = (res[1] && res[1].rows) || res[1] || [], c = r.card, vals = { raw: r.raw.w30.median };
        r.graded.forEach(function (g) { vals[g.grade] = g.w30.median; });
        var title = c.year + " " + c.set + " #" + c.number + " " + c.player + (c.rookie ? " RC" : ""), sub = c.variant;
        /* In the beta, use the card you just opened (its sample comps), so the numbers match the report you came from. */
        var lv = null; try { lv = (JSON.parse(sessionStorage.getItem("ch_live_last") || "null") || {}).cur; } catch (e) {}
        var lc = lv && lv.comps, G = ["RAW", "PSA 8", "PSA 9", "PSA 10"];
        if (lc && G.every(function (k) { return lc[k] && lc[k].median > 0; })) {
          vals = { raw: lc.RAW.median, "PSA 8": lc["PSA 8"].median, "PSA 9": lc["PSA 9"].median, "PSA 10": lc["PSA 10"].median };
          title = lv.name || title; sub = ""; c = { number: lv.card_number || c.number, player: lv.player || "" };
        }
        var last = String(c.player || "").split(" ").pop().toLowerCase(), numRe = new RegExp("#" + String(c.number).replace(/[^\w-]/g, "") + "(?![\\w-])");
        var mine = (Array.isArray(led) ? led : []).filter(function (x) { var t = String(x.card || ""); return numRe.test(t) && (!last || t.toLowerCase().indexOf(last) > -1); })[0];

        var saved = LS.get("v2_cost", null), cost = saved > 0 ? saved : mine && mine.price > 0 ? mine.price : vals.raw;
        var costFrom = saved > 0 ? "you set it" : mine ? "from your Ledger" : "the raw value";
        function m0(v) { return money(Math.round(v)); }
        function board() {
          var k = V2.cashIt(vals, cost);
          var rows = k.rows.map(function (x) {
            if (x.keep == null) return '<div class="v2-row"><div class="v2-rl"><b>' + x.label + '</b></div><div class="v2-rk"><small>Over $10,000: check PSA\'s price</small></div></div>';
            var lines = '<span>' + m0(x.value) + (x.id === "raw" ? " value" : " \u2212 grading " + money(x.grading) + " \u2212 ship " + money(x.ship)) + ' \u2212 fees ' + money(x.sell) + '</span>';
            return '<div class="v2-row ' + (x.good ? "is-good" : "is-bad") + (x.best ? " is-best" : "") + '">' + (x.best ? '<span class="v2-stamp">' + I("spark", "mini") + 'BEST MOVE</span>' : "") +
              '<div class="v2-rl"><b>' + (x.id === "raw" ? "Sell raw" : x.label) + '</b><small>' + (x.id === "raw" ? "as is" : "if it grades " + x.label.replace("PSA ", "")) + '</small></div>' +
              '<div class="v2-rm">' + lines + '</div>' +
              '<div class="v2-rk"><small>You keep</small><b class="num">' + m0(x.keep) + '</b><span class="num">' + (x.good ? "+" : "\u2212") + m0(Math.abs(x.profit)) + '</span></div></div>';
          }).join("");
          return '<section class="v2-call c-' + k.call.replace(" ", "-") + '"><div class="v2-ce">' + I("spark", "mini") + 'The Hound\'s call</div><div class="v2-cw">' + k.call + '</div><p>' + esc(k.why) + '</p></section>' +
            '<div class="v2-board">' + rows + '</div>';
        }
        shell("What it pays graded", "Every way to <em>cash it</em>",
          '<div class="card v2-card v2-cashcard"><b>' + esc(title) + '</b><div class="small muted">' + (sub ? esc(sub) + " · " : "") + 'sample 30-day medians by grade</div>' +
          '<label class="v2-cost v2-cost-in"><span>Your cost <span class="small dim" id="v2-cf">(' + costFrom + ')</span></span><span class="v2-cin">$<input id="v2-cost" class="input num" inputmode="decimal" value="' + cost + '"></span></label></div>' +
          '<div id="v2-board">' + board() + '</div>' +
          '<p class="v2-legend"><span class="v2-dot good"></span>Green = you keep more than you paid <span class="v2-dot bad"></span>Gray = you lose money</p>' +
          '<a class="btn btn-ghost v2-askbtn" href="#/dig">' + I("spark") + 'Ask your Hound what else to hunt</a>' +
          '<div class="note v2-note">' + I("shield") + '<div><b style="color:var(--text)">No grade odds.</b> CardHound has no pop or grading-odds data, so it never guesses which grade you\'ll get. Each row shows what you keep if the card comes back at that grade. Not included: your postage to PSA.</div></div>' +
          '<p class="small dim v2-src">Grading: PSA\'s published per-card prices, ' + V2.PSA.levels.map(function (l) { return money(l.fee) + " up to " + money(l.max); }).join(" · ") + ' (' + V2.PSA.feeSource + '). Shipping: PSA return shipping for 1 to 4 cards, ' + V2.PSA.ship.map(function (x) { return money(x.fee) + " up to " + money(x.max); }).join(" · ") + ' (' + V2.PSA.shipSource + '). Selling fee: the standard US trading-card selling fee, 13.25% up to $7,500 plus $0.40 per order. Checked ' + V2.PSA.checked + '. Card values are sample data.</p>');
        var inp = document.getElementById("v2-cost");
        inp.oninput = function () { var v = parseFloat(String(inp.value).replace(/[^0-9.]/g, "")); if (v > 0) { cost = v; LS.set("v2_cost", v); document.getElementById("v2-cf").textContent = "(you set it)"; document.getElementById("v2-board").innerHTML = board(); } };
      });
    });

    }

    /* #/dig : Ask your Hound. Taste profile -> free-text ask -> "Digging..." -> 3 picks from the catalog.
       Every reason is computed from that card's sample sales in the beta API (never canned):
         trend = median of the newest 30 days vs the 30 days before (V2.pctChange), shown when it's +5% or more
         below average = last raw sale 5%+ under the raw 30-day average
         pays to grade = a PSA 9 keeps more than selling raw after PSA fees, return shipping and selling fee (V2.cashIt). No odds. */
    var RC = { "PUJOLS-01TCT-T247": 1, "PUJOLS-01TCT-T247-REF": 1, "PUJOLS-01TT-T247": 1, "KOBE-96TC-138": 1, "KOBE-96TC-138-REF": 1, "PURDY-22PRIZM-353": 1, "MOSS-98TC-35": 1,
      "DIRK-98TC-154": 1, "PIERCE-98TC-135": 1, "RJOHNSON-89UD-25": 1, "FTHOMAS-90LEAF-300": 1, "GWYNN-83T-482": 1, "CARTER-98TC-199": 1, "IVERSON-96TC-171": 1, "LEBRON-03TC-111": 1,
      "MANNING-98TC-165": 1, "DUNCAN-97TC-115": 1 };
    var TEAM = { "MJ-96TC-139": "Bulls", "MJ-93FIN-1": "Bulls", "MJ-96TC-139-REF": "Bulls", "MJ-93FIN-1-REF": "Bulls", "PIPPEN-96EX-10-CRED": "Bulls", "RODMAN-97SBP-119-SR": "Bulls" };
    function bapi(path, opt) {
      var B = window.CH_BETA; if (!B || !B.api) return Promise.reject(new Error("beta only"));
      opt = opt || {}; var h = { Authorization: "Bearer " + B.token() }; if (opt.body) h["Content-Type"] = "application/json";
      return fetch(B.api + path, { method: opt.method || "GET", headers: h, body: opt.body, credentials: "omit", cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    }
    function yr(c) { return parseInt(String(c.year), 10) || 0; }
    function famOf(set) { set = String(set || "").toLowerCase(); return /chrome/.test(set) ? "Topps Chrome" : /finest/.test(set) ? "Finest" : /prizm/.test(set) ? "Prizm" : set.replace(/^\d{4}(-\d\d)?\s*/, ""); }
    function tasteFrom(cards, cur) {
      var t = { cats: {}, sets: {}, eras: {}, players: {}, rookies: 0, n: 0, prices: [] };
      cards.forEach(function (c) { if (!c) return; t.n++; t.cats[c.category] = (t.cats[c.category] || 0) + 1; t.sets[famOf(c.set)] = (t.sets[famOf(c.set)] || 0) + 1;
        var e = Math.floor(yr(c) / 10) * 10; if (e) t.eras[e + "s"] = (t.eras[e + "s"] || 0) + 1; t.players[c.player] = 1; if (RC[c.card_id]) t.rookies++; });
      if (cur && cur.comps && cur.comps.RAW) t.prices.push(cur.comps.RAW.median);
      return t;
    }
    function tasteChips(t) {
      function top(o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }); }
      var chips = top(t.sets).slice(0, 2).concat(t.rookies ? ["Rookie cards"] : []).concat(top(t.cats).slice(0, 2)).concat(top(t.eras).slice(0, 2));
      if (t.prices.length) { var p = t.prices[0]; chips.push("$" + Math.round(p * 0.5 / 10) * 10 + "\u2013$" + Math.round(p * 2 / 10) * 10 + " raw"); }
      return chips;
    }
    function parseAsk(q) {
      q = String(q || "").toLowerCase(); var f = { words: [] };
      var m = /\b(19|20)?([0-9])0'?s\b/.exec(q); if (m) f.era = (m[1] ? +(m[1] + m[2] + "0") : (+m[2] >= 5 ? 1900 : 2000) + +m[2] * 10);
      ["bulls", "jordan", "pippen", "rodman", "kukoc", "kobe", "lebron", "chrome", "finest", "prizm", "refractor", "rookie", "basketball", "baseball", "football"].forEach(function (w) { if (q.indexOf(w) > -1) f.words.push(w); });
      f.inserts = /\binserts?\b|\bparallels?\b|refractor/.test(q); f.like = /like (this|that|it)|similar|else/.test(q);
      return f;
    }
    function scoreCard(c, f, t, ctx) {
      var sc = 0, fit = [], hay = (c.player + " " + c.set + " " + c.variant + " " + c.category + " " + (TEAM[c.card_id] || "")).toLowerCase();
      f.words.forEach(function (w) { if (w === "rookie" ? RC[c.card_id] : hay.indexOf(w) > -1) { sc += 3; fit.push(w === "rookie" ? "rookie card" : w); } });
      if (f.era && yr(c) >= f.era && yr(c) < f.era + 10) { sc += 3; fit.push(f.era + "s"); }
      if (f.inserts && !/^base/i.test(c.variant)) { sc += 2; fit.push(c.variant.toLowerCase()); }
      if (ctx && (f.like || !f.words.length)) {
        if (famOf(c.set) === famOf(ctx.set)) { sc += 3; fit.push(famOf(c.set)); }
        if (RC[c.card_id] && RC[ctx.card_id]) { sc += 3; fit.push("rookie card"); }
        if (c.category === ctx.category) { sc += 1; }
        if (Math.abs(yr(c) - yr(ctx)) <= 5) { sc += 1; fit.push("same era"); }
      }
      if (t.sets[famOf(c.set)]) sc += 1;
      if (t.cats[c.category]) sc += 1;
      return { score: sc, fit: fit.filter(function (x, i, a) { return a.indexOf(x) === i; }) };
    }
    function reasonsFor(rep) {
      var b = rep.blocks || {}, comps = rep.comps || {}, out = [], raw = (b.RAW || {}).kept || [];
      var ch = V2.pctChange(raw); if (ch && ch.pct >= 5) out.push({ k: "up", t: "Trending up: +" + ch.pct + "% vs the 30 days before", v: ch.pct });
      var end = raw.reduce(function (m, x) { var d = String(x.date || x.sold_at || ""); return d > m ? d : m; }, "");
      if (raw.length && end) {
        var e = Date.parse(end + "T12:00:00Z"), w = raw.filter(function (x) { return Date.parse(String(x.date || x.sold_at).slice(0, 10) + "T12:00:00Z") > e - 30 * 864e5; });
        var last = raw.filter(function (x) { return String(x.date || x.sold_at || "") === end; })[0];
        if (w.length >= 3 && last) { var avg = w.reduce(function (a, x) { return a + +x.price; }, 0) / w.length, d = (last.price - avg) / avg;
          if (d <= -0.05) out.push({ k: "below", t: "Last sale " + Math.round(-d * 100) + "% under its 30-day average ($" + Math.round(last.price) + " vs $" + Math.round(avg) + ")", v: -d * 100 }); }
      }
      if (comps.RAW && comps["PSA 8"] && comps["PSA 9"] && comps["PSA 10"]) {
        var k = V2.cashIt({ raw: comps.RAW, "PSA 8": comps["PSA 8"], "PSA 9": comps["PSA 9"], "PSA 10": comps["PSA 10"] }, comps.RAW), r0 = k.rows[0].keep, r9 = k.rows[2].keep;
        if (r9 > r0) out.push({ k: "grade", t: "Pays to grade: a PSA 9 keeps $" + Math.round(r9 - r0) + " more than selling raw, after PSA fees", v: (r9 - r0) / Math.max(1, r0) * 20 });
      }
      return out;
    }
    if (askOn) U.addRoute("dig", function () {
      var cur = null; try { cur = (JSON.parse(sessionStorage.getItem("ch_live_last") || "null") || {}).cur; } catch (e) {}
      var hasBeta = !!(window.CH_BETA && window.CH_BETA.api);
      var SUG = ["I collect 90s Bulls inserts. What should I be looking at?", "What else like this should I look for?", "Show me Topps Chrome rookies that pay to grade"];
      shell("Your Hound", "What should I <em>hunt</em>?",
        '<div class="card v2-taste" id="v2-taste"><div class="v2-te">' + I("spark", "mini") + 'Your Hound knows you collect\u2026</div><div class="v2-chips" id="v2-chips"><span class="small dim">Reading your cards\u2026</span></div>' +
        '<p class="small dim" style="margin:8px 0 0">From your watchlist, Ledger and the card you just checked. Tap a chip to drop it.</p></div>' +
        '<div class="v2-sugs" id="v2-sugs">' + SUG.map(function (q) { return '<button type="button" class="v2-sug" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join("") + '</div>' +
        '<div id="v2-thread" class="v2-thread"></div>' +
        '<form class="v2-ask" id="v2-ask"><textarea id="v2-q" rows="2" enterkeyhint="send" placeholder="Ask your Hound what to hunt\u2026"></textarea><button class="btn btn-gold" id="v2-send" type="submit" aria-label="Ask">' + I("spark") + 'Ask</button></form>' +
        (hasBeta ? '<p class="small dim v2-footnote">Sample prices in the beta. Reasons are computed from each card\'s sample sales.</p>' : '<p class="small dim">Ask your Hound needs the friends beta API.</p>'));
      var catalog = [], taste = null, dropped = LS.get("v2_taste_drop", {}) || {};
      var ctxCard = null;
      function paintChips() {
        var el = document.getElementById("v2-chips"); if (!el || !taste) return;
        var ch = tasteChips(taste).filter(function (c) { return !dropped[c]; });
        el.innerHTML = ch.length ? ch.map(function (c) { return '<button type="button" class="v2-chip" data-c="' + esc(c) + '">' + esc(c) + ' <span aria-hidden="true">\u00d7</span></button>'; }).join("") : '<span class="small dim">Nothing yet. Check a card or add to your watchlist.</span>';
        el.querySelectorAll("[data-c]").forEach(function (b) { b.onclick = function () { dropped[b.dataset.c] = 1; LS.set("v2_taste_drop", dropped); paintChips(); }; });
      }
      var ready = !hasBeta ? Promise.resolve() : bapi("/v1/catalog").then(function (j) {
        catalog = j.cards || []; var by = {}; catalog.forEach(function (c) { by[c.card_id] = c; });
        ctxCard = cur && by[cur.card_id] || null;
        return Promise.all([bapi("/v1/watchlist").catch(function () { return {}; }), bapi("/v1/ledger").catch(function () { return {}; })]).then(function (r) {
          var ids = []; JSON.stringify(r).replace(/"card_id":"([^"]+)"/g, function (_, id) { ids.push(id); });
          if (ctxCard) ids.push(ctxCard.card_id);
          taste = tasteFrom(ids.filter(function (x, i, a) { return a.indexOf(x) === i; }).map(function (id) { return by[id]; }).filter(Boolean), cur); paintChips();
        });
      }).catch(function (e) { var el = document.getElementById("v2-chips"); if (el) el.innerHTML = '<span class="small dim">Could not read your cards (' + esc(e.message) + ').</span>'; });
      var form = document.getElementById("v2-ask"), qEl = document.getElementById("v2-q"), thread = document.getElementById("v2-thread");
      var dig = {};
      function runAsk(q) {
        q = String(q || "").trim(); if (!q) return;
        var sug = document.getElementById("v2-sugs"); if (sug) sug.style.display = "none";
        qEl.value = "";
        thread.insertAdjacentHTML("beforeend", '<div class="v2-me">' + esc(q) + '</div><div class="v2-dig" id="v2-dig"><div class="v2-digh">' + I("search") + '<b>Digging<span class="dots"></span></b></div><ol class="v2-digs"><li>Reading your taste</li><li>Going through the catalog</li><li>Running each card\'s numbers</li></ol></div>');
        var lis = thread.querySelectorAll("#v2-dig li"), k = 0, tick = setInterval(function () { if (k < lis.length) lis[k++].classList.add("done"); }, 700), t0 = Date.now();
        ready.then(function () {
          var f = parseAsk(q), t = taste || tasteFrom([], cur);
          var own = {}; if (ctxCard) catalog.forEach(function (c) { if (c.player === ctxCard.player) own[c.card_id] = 1; });
          var cand = catalog.filter(function (c) { return !own[c.card_id]; }).map(function (c) { var s = scoreCard(c, f, t, ctxCard); return { c: c, score: s.score, fit: s.fit }; })
            .filter(function (x) { return x.score > 0; });
          /* a named team or player is a must-have: if any card matches it, only those cards count */
          var ent = f.words.filter(function (w) { return /^(bulls|jordan|pippen|rodman|kukoc|kobe|lebron)$/.test(w); });
          if (ent.length) { var only = cand.filter(function (x) { return x.fit.some(function (k) { return ent.indexOf(k) > -1; }); }); if (only.length) cand = only; }
          f.noInserts = f.inserts && !cand.some(function (x) { return !/^base/i.test(x.c.variant); });
          dig.f = f;
          cand = cand.sort(function (a, b) { return b.score - a.score; }).slice(0, 7);
          return Promise.all(cand.map(function (x) { return bapi("/v1/cards/" + encodeURIComponent(x.c.card_id) + "/report").then(function (j) { x.rep = j.report || {}; x.why = reasonsFor(x.rep); return x; }, function () { return null; }); }));
        }).then(function (xs) {
          xs = (xs || []).filter(function (x) { return x && x.why.length; });
          xs.forEach(function (x) { x.rank = x.score + x.why.reduce(function (a, r) { return a + Math.min(4, r.v / 5); }, 0); });
          xs.sort(function (a, b) { return b.rank - a.rank; }); var pick = xs.slice(0, 3);
          setTimeout(function () {
            clearInterval(tick); var d = document.getElementById("v2-dig"); if (d) d.remove();
            var like = ctxCard && parseAsk(q).like ? " like your " + ctxCard.player.split(" ").pop() : "";
            thread.insertAdjacentHTML("beforeend", '<div class="v2-bot">' + (pick.length ? '<p>' + (dig.f && dig.f.noInserts ? "No inserts or parallels like that in the catalog yet, so here are the closest. " : "") + pick.length + ' card' + (pick.length > 1 ? "s" : "") + esc(like) + ' you haven\'t checked yet. Here\'s why each one, from its sample sales:</p>' : '<p>No match with enough sample sales yet. Try a player, set, decade, or one of the suggestions above. Thin data is never forced into a pick.</p>') +
              pick.map(function (x, i) {
                var c = x.c, raw = (x.rep.comps || {}).RAW;
                return '<div class="v2-opt" style="animation-delay:' + (i * 0.18) + 's"><div class="v2-oh"><span class="v2-on">' + (i + 1) + '</span><div><b>' + esc(c.year + " " + c.set + " #" + c.number + " " + c.player) + (RC[c.card_id] ? " RC" : "") + '</b>' +
                  '<small>' + esc(c.variant) + (raw ? ' \u00b7 raw ' + money(Math.round(raw)) + ' (sample)' : "") + (x.fit.length ? ' \u00b7 fits: ' + esc(x.fit.slice(0, 3).join(", ")) : "") + '</small></div></div>' +
                  '<ul class="v2-why">' + x.why.map(function (r) { return '<li class="w-' + r.k + '">' + esc(r.t) + '</li>'; }).join("") + '</ul></div>';
              }).join("") + '<p class="small dim">Sample prices. No grade odds: "pays to grade" only means a 9 beats selling raw after fees.</p></div>');
            var last = thread.lastElementChild; if (last && last.scrollIntoView) last.scrollIntoView({ behavior: "smooth", block: "start" });
          }, Math.max(0, 2200 - (Date.now() - t0)));
        }).catch(function (e) {
          clearInterval(tick); var d = document.getElementById("v2-dig"); if (d) d.remove();
          thread.insertAdjacentHTML("beforeend", '<div class="v2-bot"><p>Couldn\'t dig right now (' + esc(e.message || "error") + '). Try again in a minute.</p></div>');
        });
      }
      form.onsubmit = function (ev) { ev.preventDefault(); runAsk(qEl.value); };
      document.querySelectorAll("#v2-sugs [data-q]").forEach(function (b) { b.onclick = function () { runAsk(b.dataset.q); }; });
      qEl.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAsk(qEl.value); } });
    });

    if (v2On) {
    /* In-app alert banner: runs the alert rule on a sample sale history and, if it fires, slides a banner in from the top.
       CH_V2.pushAlert("high30") picks the first sample whose newest sale fires that alert type. Tap -> #/alerts. */
    V2.pushAlert = function (type) {
      var hit = null; V2.ALERT_SAMPLES.some(function (x) { var a = V2.evaluateAlert(x.sales); if (a && a.type === (type || "high30")) { hit = { x: x, a: a }; return true; } return false; });
      if (!hit) return null;
      var old = document.getElementById("v2-banner"); if (old) old.remove();
      var a = hit.a, x = hit.x, pct = a.pct != null ? " (" + (a.pct >= 0 ? "+" : "") + (Math.round(a.pct * 1000) / 10) + "%)" : "";
      document.body.insertAdjacentHTML("beforeend", '<a id="v2-banner" class="v2-banner t-' + a.tone + '" href="#/alerts"><span class="v2-bi">' + I("bell") + '</span><span class="v2-bt">' +
        '<small>CardHound \u00b7 now <em class="v2-bs">SAMPLE</em></small><b>' + esc(a.label.toUpperCase()) + '</b><span>' + esc(x.card) + ' \u00b7 ' + esc(x.grade) + '</span>' +
        '<span class="num"><strong>' + money(a.newest.price) + '</strong> \u00b7 ' + esc(a.refLabel) + ' ' + money(a.ref) + pct + '</span><small class="v2-bsub">Alerts for subscribers</small></span></a>');
      try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (e) {}
      var bn = document.getElementById("v2-banner"); bn.onclick = function () { bn.remove(); };
      var off = function () { window.removeEventListener("hashchange", off); if (bn.parentNode) bn.remove(); };
      setTimeout(function () { window.addEventListener("hashchange", off); }, 50);
      requestAnimationFrame(function () { bn.classList.add("on"); });
      return { card: x.card, grade: x.grade, alert: a };
    };

    /* #/alerts */
    U.addRoute("alerts", function () {
      var rows = V2.ALERT_SAMPLES.map(function (x) { return { x: x, a: V2.evaluateAlert(x.sales) }; });
      var fired = rows.filter(function (r) { return r.a && r.a.type !== "held"; }), held = rows.filter(function (r) { return r.a && r.a.type === "held"; });
      var ico = { record: "spark", above_avg: "up", high30: "up", low30: "down" };
      shell("Alerts · for subscribers", "When it moves, <em>you hear about it</em>",
        '<div id="v2-alerts" class="v2-alerts">' + fired.map(function (r, i) {
          var a = r.a, pc = Math.round(a.pct * 1000) / 10;
          return '<article class="v2-alert t-' + a.tone + '" style="animation-delay:' + (0.15 + i * 0.6) + 's"><div class="v2-at">' + I(ico[a.type] || "bell", "mini") + '<span>' + esc(a.label) + '</span></div>' +
            '<div class="v2-ap num">' + money(a.newest.price) + '</div><div class="v2-ac"><b>' + esc(r.x.card) + '</b> · ' + esc(r.x.grade) + '</div>' +
            '<div class="v2-am"><span class="num ' + (pc >= 0 ? "pill-up" : "pill-down") + '">' + (pc >= 0 ? "+" : "") + pc + '%</span> vs ' + a.refLabel + ' ' + money(a.ref) + ' · backed by ' + a.backed + ' recent sales · ' + esc(r.x.when) + '</div></article>';
        }).join("") + '</div>' +
        (held.length ? '<div class="group-h"><h3 class="h3">Held back · not alerted</h3></div>' + held.map(function (r) {
          return '<div class="card v2-held"><b>' + esc(r.x.card) + '</b> · ' + esc(r.x.grade) + '<div class="v2-hp num">' + money(r.a.newest.price) + ' <span class="v2-excl">One-off</span></div><p class="small muted" style="margin:4px 0 0">A single sale far above the normal price. It stays out of alerts until at least 2 more sales back it up.</p></div>';
        }).join("") : "") +
        '<div class="cta-stack"><button class="btn btn-ghost" id="v2-replay">' + I("bell") + 'Replay alerts</button></div>' +
        '<p class="small dim" style="margin-top:12px">Alerts for subscribers. Each alert needs 2+ recent sales near the new price, and one-off sales never count. Sample sales, not real prices.</p>');
      document.getElementById("v2-replay").onclick = function () { var el = document.getElementById("v2-alerts"); el.classList.remove("v2-go"); void el.offsetWidth; el.classList.add("v2-go"); };
      document.getElementById("v2-alerts").classList.add("v2-go");
    });

    /* #/hounds */
    U.addRoute("hounds", function () {
      U.D.getMovers({ view: "overall" }).then(function (rows) {
        var list = rows.filter(function (r) { return !r.thin; }).sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct); }).slice(0, 8);
        var unlocked = !!LS.get("v2_hounds_preview", false);
        function spark(p, up) { var mn = Math.min.apply(null, p), mx = Math.max.apply(null, p), w = 64, h = 24; return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"><path d="' + p.map(function (v, i) { return (i ? "L" : "M") + (i * w / (p.length - 1)).toFixed(1) + " " + (h - 2 - (v - mn) / ((mx - mn) || 1) * (h - 4)).toFixed(1); }).join(" ") + '" fill="none" stroke="' + (up ? "var(--up)" : "var(--down)") + '" stroke-width="2"/></svg>'; }
        var why = function (r) { return (r.pct >= 0 ? "Up " : "Down ") + Math.abs(r.pct) + "% today vs its 30-day median, on " + r.sales + " sales"; };
        var body = '<div class="card v2-hl">' + list.map(function (r, i) {
          return '<div class="lrow"><span class="rk" style="color:var(--gold2)">' + (i + 1) + '</span><div class="nm"><b>' + esc(r.card) + '</b><span>' + esc(r.grade) + ' · ' + esc(why(r)) + '</span></div><div class="rt">' + spark(r.spark, r.pct >= 0) + '<span class="pct num ' + (r.pct >= 0 ? "pill-up" : "pill-down") + '">' + (r.pct >= 0 ? "+" : "") + r.pct + '%</span></div></div>';
        }).join("") + '</div>';
        var gate = '<button class="v2-gate" id="v2-unlock" type="button"><span class="v2-gi">' + I("lock") + '</span><span class="v2-ge">CardHound Pro</span><b class="v2-gt">The Hound\'s List</b><span class="v2-gs">The movers our hound is watching, picked fresh every morning.</span><span class="btn btn-gold v2-gb">Unlock with Pro</span></button>';
        shell("For subscribers", "The Hound's <em>List</em>", '<p class="lead" style="margin-top:2px">Movers we\'re watching.</p>' +
          (unlocked ? body + '<button class="link-btn" id="v2-relock" style="margin-top:10px">Show the locked preview again</button>' : '<div class="v2-lock"><div class="v2-blur" aria-hidden="true" inert>' + body + '</div>' + gate + '</div>') +
          '<p class="small dim" style="margin-top:12px">Picked from sample Movers (3+ sales today, 10+ in the prior 30 days). Moves describe past sample sales, not a forecast.</p>');
        var ul = document.getElementById("v2-unlock");
        if (ul) ul.onclick = function () {
          U.openSheet('<div class="eyebrow">CardHound Pro · sample build</div><h2>Unlock the Hound\'s List</h2><p class="muted">Subscribers get the Hound\'s List every morning. This sample build doesn\'t sell Pro, so nothing is charged.</p><div class="cta-stack"><button class="btn btn-gold" id="v2-pv">Preview it unlocked (sample)</button></div>', function () {
            document.getElementById("v2-pv").onclick = function () { LS.set("v2_hounds_preview", true); U.closeSheet(); U.go(); };
          });
        };
        var rl = document.getElementById("v2-relock"); if (rl) rl.onclick = function () { LS.set("v2_hounds_preview", false); U.go(); };
      });
    });

    }

    /* entry points on More (add-only hook) */
    if (U.moreItemsTop) {
      if (askOn) U.moreItemsTop.push(["dig", "spark", "Ask your Hound", "Type a question · ranked picks with reasons"]);
      if (v2On) U.moreItemsTop.push(["graded", "spark", "What it pays graded", "PSA 8 / 9 / 10 after PSA fees (sample)"], ["alerts", "bell", "Subscriber alerts", "Record highs, 30-day highs and lows (sample)"], ["hounds", "list", "Hound's List", "Movers we're watching (Pro · sample)"]);
    }
    /* Home: one tap into Ask your Hound. Add-only; doesn't edit live.js. */
    if (askOn) {
      var putAsk = function () {
        var home = document.querySelector(".lv-home"); if (!home || home.querySelector(".v2-homeask")) return;
        var snap = home.querySelector(".lv-snap"); if (!snap) return;
        snap.insertAdjacentHTML("afterend", '<a class="btn btn-ghost v2-homeask" href="#/dig">' + I("spark") + 'Ask your Hound what to hunt</a>');
      };
      new MutationObserver(function () { clearTimeout(putAsk.t); putAsk.t = setTimeout(putAsk, 40); }).observe(document.body, { childList: true, subtree: true });
      putAsk();
    }
  });
})();
