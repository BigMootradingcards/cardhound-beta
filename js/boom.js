/* PARKED follow-up (not this PR): a celebration — motion and sound — when someone cops
 * or searches a big card or a new high. Do not build that into calm.css. No sound assets here.
 *
 * CardHound "BOOM! New High Comp" alerts (in-app, sample data).
 * Fires when a card's newest sold price is its ALL-TIME HIGH (tier 1) or 90-DAY HIGH (tier 2) for that exact variant + grade.
 * Data via the adapter: D.getNewHighs(scope), D.getNewHighRejects(scope), D.getAlertSettings(), D.setAlertSettings().
 * Optional haptics (navigator.vibrate) and an opt-in Notification API demo. In-app BOOM is the main path. */
window.CH_BOOM = function (U) {
  "use strict";
  var D = U.D, I = U.I, esc = U.esc, money = U.money;
  var root = document.getElementById("boom-root");
  var ui = { tier: "all", previewIx: 0 }, timers = [];
  var TIER = { ath: "All-time high", "90d": "90-day high" }, TIER_S = { ath: "All-time", "90d": "90-day" };
  var GATE_NOTE = "Only sales that pass the exact-variant check and the quality gate count. No outliers, no mis-variants.";
  function fmtDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); if (!m) return esc(s || ""); return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1] + " " + (+m[3]) + ", " + m[1]; }
  function pctTxt(h) { return "+" + (h.pct != null ? h.pct : Math.round((h.newHigh / h.oldHigh - 1) * 1000) / 10).toFixed(1) + "%"; }
  function eligible(list, s) {
    var t = s.newHighs.tiers;
    return list.filter(function (h) { return (h.tier === "ath" ? t.ath : t.d90) && (s.newHighs.scope === "all" || h.watch || h.portfolio); })
      .sort(function (a, b) { return (a.tier === b.tier ? 0 : a.tier === "ath" ? -1 : 1) || (a.date < b.date ? 1 : -1); });
  }
  function openReport(h) {
    close();
    if (!h.reportId) U.toast("Demo: only the Pujols Base sample report is built, so it opens that one.");
    location.hash = "#/report";
  }

  /* ---------- the BOOM graphic ---------- */
  function burstSVG() {
    var rays = "", n = 40, cx = 200, cy = 200, R = 260;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / n) * (i % 2 ? 0.16 : 0.34);
      rays += '<path d="M' + cx + ' ' + cy + 'L' + (cx + R * Math.cos(a0)).toFixed(1) + ' ' + (cy + R * Math.sin(a0)).toFixed(1) + 'L' + (cx + R * Math.cos(a1)).toFixed(1) + ' ' + (cy + R * Math.sin(a1)).toFixed(1) + 'Z"/>';
    }
    return '<svg class="bm-burst" viewBox="0 0 400 400" aria-hidden="true"><defs><radialGradient id="bmr" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6d8" stop-opacity=".9"/><stop offset=".22" stop-color="#f1d48a" stop-opacity=".55"/><stop offset=".5" stop-color="#c9972b" stop-opacity=".14"/><stop offset=".8" stop-color="#c9972b" stop-opacity="0"/></radialGradient></defs><g fill="url(#bmr)">' + rays + '</g></svg>';
  }
  function sparks() { var s = ""; for (var i = 0; i < 14; i++) { var a = (i / 14) * 360 + (i % 2 ? 9 : -6), d = 90 + (i * 37) % 70; s += '<i style="--a:' + a + 'deg;--d:' + d + 'px;--t:' + (0.55 + (i % 4) * 0.08) + 's"></i>'; } return '<div class="bm-sparks" aria-hidden="true">' + s + '</div>'; }
  function show(h, opts) {
    opts = opts || {};
    close(true);
    var word = "BOOM!".split("").map(function (c, i) { return '<span style="--i:' + i + '">' + c + '</span>'; }).join("");
    root.innerHTML = '<div class="bm-dim" id="bm-dim"></div><section class="bm" role="alertdialog" aria-labelledby="bm-t" aria-describedby="bm-d">' +
      '<div class="bm-band"><div class="bm-bg"></div>' + burstSVG() + '<div class="bm-ring"></div><div class="bm-ring r2"></div><div class="bm-flash"></div>' + sparks() +
        '<div class="bm-top"><span class="bm-kick">NEW HIGH COMP</span><span class="bm-tier ' + (h.tier === "ath" ? "ath" : "d90") + '">' + TIER[h.tier].toUpperCase() + '</span></div>' +
        '<h2 class="bm-word" id="bm-t" aria-label="BOOM! New high comp">' + word + '</h2><div class="bm-shine"></div>' +
        '<div class="bm-sample">SAMPLE DATA' + (opts.preview ? " · PREVIEW" : "") + '</div></div>' +
      '<div class="bm-panel" id="bm-d"><div class="bm-card"><b>' + esc(h.card) + '</b><span>' + esc(h.grade) + ' · exact variant · ' + fmtDate(h.date) + '</span></div>' +
        '<div class="bm-stats"><div class="bm-s"><span>Old high</span><b class="num">' + money(h.oldHigh) + '</b><small>' + fmtDate(h.oldHighDate) + '</small></div>' +
        '<div class="bm-arrow" aria-hidden="true"><svg viewBox="0 0 40 16"><path d="M1 8h34M29 2l7 6-7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="bm-s new"><span>New high</span><b class="num" id="bm-count">' + money(h.oldHigh) + '</b><small>' + fmtDate(h.date) + '</small></div>' +
        '<div class="bm-jump num">' + pctTxt(h) + '</div></div>' +
        '<div class="bm-acts"><button class="btn btn-gold btn-sm" id="bm-rep">' + I("report") + 'Open report</button><button class="btn btn-ghost btn-sm" id="bm-sale">' + I("list") + 'Record sale</button></div>' +
        '<div class="bm-foot">' + I("shield") + '<span>Exact-variant check and quality gate passed. Demo alert on sample data.</span></div><div class="bm-timer"><i></i></div></div>' +
      '<button class="bm-x" id="bm-x" aria-label="Dismiss">' + I("close") + '</button></section>';
    requestAnimationFrame(function () { root.classList.add("on"); });
    document.getElementById("bm-x").onclick = function () { close(); };
    document.getElementById("bm-dim").onclick = function () { close(); };
    document.getElementById("bm-rep").onclick = function () { openReport(h); };
    document.getElementById("bm-sale").onclick = function () { close(); saleSheet(h); };
    // count-up from the old high to the new high
    timers.push(setTimeout(function () {
      var el = document.getElementById("bm-count"), t0 = performance.now(), dur = 850;
      (function step(t) { if (!el || !el.isConnected) return; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = money(h.oldHigh + (h.newHigh - h.oldHigh) * e); if (p < 1) requestAnimationFrame(step); else el.classList.add("done"); })(t0);
    }, 760));
    // haptics at impact
    D.getAlertSettings().then(function (s) {
      if (s.haptics && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) timers.push(setTimeout(function () { try { navigator.vibrate([18, 40, 70]); } catch (e) {} }, 330));
      if (s.push && "Notification" in window && Notification.permission === "granted" && !opts.noPush) {
        try { new Notification("BOOM! New high comp (demo)", { body: h.card + " " + h.grade + ": " + money(h.newHigh) + " (" + pctTxt(h) + ", " + TIER[h.tier] + "). Sample data.", tag: "ch-boom-" + h.id }); } catch (e) {}
      }
    });
    timers.push(setTimeout(function () { close(); }, 14000));
  }
  function close(instant) {
    timers.forEach(clearTimeout); timers = [];
    if (!root.innerHTML) return;
    if (instant) { root.classList.remove("on", "off"); root.innerHTML = ""; return; }
    root.classList.add("off");
    setTimeout(function () { root.classList.remove("on", "off"); root.innerHTML = ""; }, 280);
  }

  /* ---------- record sale sheet ---------- */
  function saleSheet(h) {
    var s = h.sale || {};
    U.openSheet('<div class="eyebrow">Record sale · sample</div><h2>' + esc(h.card) + '</h2><p class="muted small" style="margin:0">' + esc(h.grade) + ' · set a new ' + TIER[h.tier].toLowerCase() + '</p>' +
      '<div class="card gold" style="margin-top:14px;text-align:center"><div class="small muted">Sold for</div><div class="callword num" style="font-size:48px;margin:6px 0 2px">' + money(h.newHigh) + '</div><div class="small muted">' + fmtDate(h.date) + ' · ' + esc(s.type || "Sale") + (s.bids ? " · " + s.bids + " bids" : "") + '</div></div>' +
      '<div class="card" style="margin-top:12px"><dl class="kv small"><dt>Listing title</dt><dd style="font-weight:500">' + esc(s.title || h.card) + '</dd><dt>Where</dt><dd>' + esc(s.venue || "Sample") + '</dd><dt>Sale ID</dt><dd>' + esc(s.id || "") + ' <span class="dim">(sample, no link)</span></dd>' +
        '<dt>Previous high</dt><dd class="num">' + money(h.oldHigh) + ' <span class="dim">· ' + fmtDate(h.oldHighDate) + '</span></dd><dt>Jump</dt><dd class="num pill-up">' + pctTxt(h) + '</dd></dl></div>' +
      '<div class="card" style="margin-top:12px"><div class="h3" style="margin-bottom:8px">Why it counts</div>' +
        ['Exact variant: year, set, card #, parallel and grade all match', 'Quality gate: completed and paid sale, not an outlier vs recent comps', 'Not a Best Offer estimate, lot, reprint or mis-listed parallel'].map(function (t) { return '<div class="row" style="gap:10px;padding:6px 0;font-size:13px;align-items:flex-start"><span class="bm-ok">' + I("check") + '</span><span>' + t + '</span></div>'; }).join("") + '</div>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="rs-rep">' + I("report") + 'Open the card report</button></div><p class="small dim" style="margin-top:10px;text-align:center">Sample sale. In the app this links to the sold listing.</p>', function () {
        document.getElementById("rs-rep").onclick = function () { U.closeSheet(); openReport(h); };
      });
  }

  /* ---------- settings ---------- */
  function settingsSheet() {
    D.getAlertSettings().then(function (s) {
      var nh = s.newHighs, perm = "Notification" in window ? Notification.permission : "unsupported";
      var tog = function (id, on, t, sub) { return '<label class="row between card tight" style="margin-top:10px"><span><b>' + t + '</b><br><span class="small muted">' + sub + '</span></span><input type="checkbox" id="' + id + '" ' + (on ? "checked" : "") + ' style="width:22px;height:22px;accent-color:#e3bd6a;flex:none"></label>'; };
      U.openSheet('<div class="eyebrow">New-high alerts · demo</div><h2>BOOM! when a card sets a new high</h2><p class="muted small" style="margin:0">Fires when the newest sale is the all-time or 90-day high for that exact variant and grade.</p>' +
        tog("nh-on", nh.on, "New-high alerts", "In-app BOOM alert") +
        '<div class="field"><label>Scope</label><div class="seg" id="nh-scope"><button data-v="watch" class="' + (nh.scope === "watch" ? "on" : "") + '">Watchlist &amp; Portfolio</button><button data-v="all" class="' + (nh.scope === "all" ? "on" : "") + '">Everything</button></div></div>' +
        '<div class="field"><label>Tiers</label></div>' +
        tog("nh-ath", nh.tiers.ath, "All-time high", "Tier 1: highest sale ever for this variant + grade") +
        tog("nh-90", nh.tiers.d90, "90-day high", "Tier 2: highest sale in the last 90 days") +
        tog("nh-hap", s.haptics, "Haptics", "Vibrate on supported phones") +
        '<div class="card tight" style="margin-top:10px"><div class="row between"><span><b>Phone notifications</b> <span class="chip demo">DEMO</span><br><span class="small muted" id="nh-pst">' + ({ granted: "Allowed on this browser", denied: "Blocked in browser settings", "default": "Off. Asks permission first", unsupported: "Not supported in this browser" }[perm]) + '</span></span>' +
          '<button class="btn btn-ghost btn-xs" id="nh-push"' + (perm === "unsupported" || perm === "denied" ? " disabled" : "") + '>' + I("bell") + (perm === "granted" ? "Test" : "Allow") + '</button></div></div>' +
        '<div class="note" style="margin-top:10px">' + I("shield") + '<div>' + GATE_NOTE + '</div></div>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="nh-save">Save alert settings</button><div class="grid2"><button class="btn btn-ghost btn-sm" id="nh-pv1" style="width:100%">Preview all-time</button><button class="btn btn-ghost btn-sm" id="nh-pv2" style="width:100%">Preview 90-day</button></div></div>' +
        '<p class="small dim" style="margin-top:10px;text-align:center">Saved on this phone only. Demo alerts use sample data.</p>', function () {
          var scope = nh.scope;
          document.querySelectorAll("#nh-scope button").forEach(function (b) { b.onclick = function () { scope = b.dataset.v; document.querySelectorAll("#nh-scope button").forEach(function (o) { o.classList.toggle("on", o === b); }); }; });
          var collect = function () { return { newHighs: { on: document.getElementById("nh-on").checked, scope: scope, tiers: { ath: document.getElementById("nh-ath").checked, d90: document.getElementById("nh-90").checked } }, haptics: document.getElementById("nh-hap").checked }; };
          document.getElementById("nh-save").onclick = function () { D.setAlertSettings(collect()).then(function () { U.closeSheet(); U.toast("New-high alerts saved on this phone (demo)."); }); };
          document.getElementById("nh-pv1").onclick = function () { U.closeSheet(); preview("ath"); };
          document.getElementById("nh-pv2").onclick = function () { U.closeSheet(); preview("90d"); };
          document.getElementById("nh-push").onclick = function () {
            if (!("Notification" in window)) return;
            var fire = function () { D.setAlertSettings({ push: true }); try { new Notification("BOOM! New high comp (demo)", { body: "This is how a new-high alert looks as a phone notification. Sample data.", tag: "ch-boom-test" }); } catch (e) {} U.toast("Demo notification sent to this browser."); };
            if (Notification.permission === "granted") fire();
            else Notification.requestPermission().then(function (p) { document.getElementById("nh-pst").textContent = p === "granted" ? "Allowed on this browser" : "Not allowed"; if (p === "granted") fire(); else U.toast("Notifications not allowed. In-app BOOM still works."); });
          };
        });
    });
  }

  /* ---------- preview + auto trigger ---------- */
  function preview(tier) {
    D.getNewHighs({ view: "overall" }).then(function (list) {
      var pool = tier ? list.filter(function (h) { return h.tier === tier; }) : list.slice().sort(function (a, b) { return (a.tier === b.tier ? 0 : a.tier === "ath" ? -1 : 1); });
      if (!pool.length) return;
      var h = tier === "90d" ? (pool.filter(function (x) { return x.reportId; })[0] || pool[0]) : pool[ui.previewIx++ % pool.length];
      show(h, { preview: true });
    });
  }
  function maybeAuto() {
    var KEY = "ch_boom_auto";
    try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }
    Promise.all([D.getAlertSettings(), D.getNewHighs({ view: "overall" })]).then(function (r) {
      var s = r[0]; if (!s.newHighs.on) return;
      var el = eligible(r[1], s); if (!el.length) return;
      setTimeout(function () {
        if (U.parseHash().route !== "markets") return;
        try { localStorage.setItem(KEY, "1"); } catch (e) {}
        show(el[0]);
      }, 900);
    });
  }

  /* ---------- New Highs list (Markets tab) ---------- */
  function listHTML(rows) {
    var list = ui.tier === "all" ? rows : rows.filter(function (h) { return h.tier === ui.tier; });
    list = list.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.tier === "ath" ? -1 : 1); });
    var cnt = { all: rows.length, ath: rows.filter(function (h) { return h.tier === "ath"; }).length, "90d": rows.filter(function (h) { return h.tier === "90d"; }).length };
    return '<div class="row between" style="margin-top:12px;gap:8px"><div class="seg seg-sm" id="nh-tier" style="max-width:none;flex:1">' + [["all", "All"], ["ath", "All-time"], ["90d", "90-day"]].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (ui.tier === t[0] ? "on" : "") + '">' + t[1] + ' · ' + cnt[t[0]] + '</button>'; }).join("") + '</div></div>' +
      '<div class="note" style="margin-top:12px">' + I("shield") + '<div>' + GATE_NOTE + '</div></div>' +
      '<div class="row" style="gap:8px;margin-top:12px"><button class="btn btn-gold btn-sm nowrap" id="nh-preview" style="flex:1.45">' + I("spark") + 'Preview BOOM alert</button><button class="btn btn-ghost btn-sm nowrap" id="nh-settings" style="flex:1">' + I("bell") + 'Settings</button></div>' +
      '<div style="height:12px"></div>' +
      (list.length ? list.map(itemHTML).join("") : '<div class="card"><div class="empty">No new highs in this view (sample).</div></div>') +
      '<div id="nh-rejects"></div>' +
      '<p class="small dim" style="margin-top:12px">Tier 1: newest sale is the all-time high for that exact variant and grade. Tier 2: the 90-day high. Sample sales; past prices, not a forecast.</p>';
  }
  function itemHTML(h) {
    return '<div class="nh"><div class="nh-top"><span class="bm-tier ' + (h.tier === "ath" ? "ath" : "d90") + ' sm">' + TIER_S[h.tier].toUpperCase() + '</span><span class="small dim">' + fmtDate(h.date) + (h.watch || h.portfolio ? ' · ' + (h.portfolio ? "In portfolio" : "Watchlist") : "") + '</span></div>' +
      '<b class="nh-card">' + esc(h.card) + '</b><div class="small dim">' + esc(h.grade) + ' · ' + esc(h.set) + '</div>' +
      '<div class="nh-nums"><div><span>Old high</span><b class="num">' + money(h.oldHigh) + '</b></div><svg class="nh-ar" viewBox="0 0 40 16" aria-hidden="true"><path d="M1 8h34M29 2l7 6-7 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><div><span>New high</span><b class="num gold">' + money(h.newHigh) + '</b></div><span class="nh-jump num">' + pctTxt(h) + '</span></div>' +
      '<div class="nh-sale">' + I("list") + '<span>Set by ' + esc((h.sale && h.sale.type) || "sale") + (h.sale && h.sale.bids ? " · " + h.sale.bids + " bids" : "") + ' · ' + esc((h.sale && h.sale.id) || "") + '</span></div>' +
      '<div class="acts"><button class="btn btn-ghost btn-xs" data-nhrep="' + h.id + '">' + I("report") + 'Report</button><button class="btn btn-ghost btn-xs" data-nhsale="' + h.id + '">' + I("list") + 'Record sale</button><button class="btn btn-ghost btn-xs" data-nhboom="' + h.id + '">' + I("spark") + 'BOOM</button></div></div>';
  }
  function bindList(rows, scope, rerender) {
    var byId = {}; rows.forEach(function (h) { byId[h.id] = h; });
    var v = document.getElementById("view");
    v.querySelectorAll("#nh-tier button").forEach(function (b) { b.onclick = function () { ui.tier = b.dataset.t; rerender(); }; });
    v.querySelectorAll("[data-nhrep]").forEach(function (b) { b.onclick = function () { openReport(byId[b.dataset.nhrep]); }; });
    v.querySelectorAll("[data-nhsale]").forEach(function (b) { b.onclick = function () { saleSheet(byId[b.dataset.nhsale]); }; });
    v.querySelectorAll("[data-nhboom]").forEach(function (b) { b.onclick = function () { show(byId[b.dataset.nhboom], { preview: true }); }; });
    var pv = document.getElementById("nh-preview"); if (pv) pv.onclick = function () { preview(); };
    var st = document.getElementById("nh-settings"); if (st) st.onclick = settingsSheet;
    D.getNewHighRejects(scope).then(function (rj) {
      var el = document.getElementById("nh-rejects"); if (!el || !rj.length) return;
      el.innerHTML = '<div class="sec" style="margin-top:18px"><div class="sec-head"><h3 class="h3">Not counted</h3><span class="chip">' + rj.length + ' sample sale' + (rj.length === 1 ? "" : "s") + '</span></div><div class="card">' +
        rj.map(function (r) { return '<div class="lrow" style="grid-template-columns:1fr auto"><div class="nm"><b>' + esc(r.card) + ' · ' + esc(r.grade) + '</b><span>' + esc(r.why) + ' · ' + fmtDate(r.date) + '</span></div><span class="num dim" style="font-weight:700;text-decoration:line-through">' + money(r.price) + '</span></div>'; }).join("") + '</div></div>';
    });
  }
  return { show: show, close: close, preview: preview, maybeAuto: maybeAuto, settingsSheet: settingsSheet, saleSheet: saleSheet, listHTML: listHTML, bindList: bindList };
};
