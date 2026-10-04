/* CardHound web demo. Plain JS, no build. All data comes through window.CH_DATA (see js/data/adapter.js). */
(function () {
  "use strict";
  var CFG = window.CARDHOUND_CONFIG || { adapter: "sample" };
  var D = CH_ADAPTERS.get(CFG.adapter) || CH_ADAPTERS.get("sample");
  window.CH_DATA = D;
  var I = window.CH_ICON;
  var view = document.getElementById("view");
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("ch_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("ch_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  var state = {
    photo: null, fromFlow: false, pickedCandidate: 0,
    conn: LS.get("conn", {}),
    keys: LS.get("keys", {}),
    snipes: LS.get("snipes", []),
    alerts: LS.get("alerts", { threshold: 20, on: true }),
    scopes: { movers: { view: "overall", value: null }, picks: { view: "overall", value: null }, searched: { view: "overall", value: null }, highs: { view: "overall", value: null } },
    moversDir: "up", meta: null, timers: []
  };
  var saveConn = function () { LS.set("conn", state.conn); LS.set("keys", state.keys); state.connDirty = true; };
  var saveSnipes = function () { LS.set("snipes", state.snipes); };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(v, dec) {
    if (v == null || isNaN(v)) return "TBD";
    var neg = v < 0, a = Math.abs(v);
    var s = a.toLocaleString("en-US", { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
    return (neg ? "\u2212$" : "$") + s;
  }
  function pct(v, d) { return (v >= 0 ? "+" : "\u2212") + Math.abs(v).toFixed(d == null ? 1 : d) + "%"; }
  function clearTimers() { state.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); state.timers = []; }
  function toast(msg) {
    var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 3200);
  }
  function footer() { return '<div class="foot"><b>Demo with sample data. Not real prices.</b><br>Estimates and opinions only. Not financial advice.</div>'; }
  function isConnected(id) { return !!state.conn[id]; }
  function srcById(id) { return CH_SOURCES.filter(function (s) { return s.id === id; })[0]; }
  function sparkSVG(pts, up, w, h) {
    w = w || 56; h = h || 24;
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), r = (mx - mn) || 1;
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + (i * (w - 2) / (pts.length - 1) + 1).toFixed(1) + " " + (h - 2 - (p - mn) / r * (h - 4)).toFixed(1); }).join(" ");
    return '<svg class="sp" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + (up ? "var(--up)" : "var(--down)") + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function gate(featureId) {
    var f = CH_FEATURES[featureId]; if (!f) return "";
    var on = f.sources.filter(isConnected);
    if (on.length) return '<div class="gate">' + I("check") + '<div class="grow"><b>' + esc(srcById(on[0]).name) + ' connected (demo)</b>. ' + esc(f.label.charAt(0).toUpperCase() + f.label.slice(1)) + ' would load here. This shared demo still shows sample data.</div></div>';
    if (f.sources[0] === "feed") return '<div class="gate">' + I("spark") + '<div class="grow"><b>' + esc(f.label) + '</b> will come from CardHound\'s own licensed data (coming soon). Showing sample data.</div></div>';
    var names = f.sources.map(function (s) { return srcById(s).name; });
    var nm = names.length > 1 ? names.slice(0, -1).join(", ") + " or " + names[names.length - 1] : names[0];
    return '<button class="gate" data-connect="' + f.sources[0] + '">' + I("lock") + '<div class="grow"><b>Connect ' + esc(nm) + '</b> to unlock ' + esc(f.label) + '. Showing sample data.</div>' + I("right") + '</button>';
  }

  /* Sample card art: a generic studio render (img/, source in ../art-source). No real player, brand or seller photo. */
  var ART_ALT = "Sample card: generic chrome base render in a slab, marked SAMPLE (not the actual card)";
  function cardArt() { return '<img class="card-img" src="img/sample-card-sm.webp" width="350" height="550" alt="' + ART_ALT + '">'; }
  function studioArt() { return '<img class="studio" src="img/sample-card-studio.jpg" width="1200" height="1200" alt="' + ART_ALT + '">'; }
  (new Image()).src = "img/sample-card-studio.jpg";

  var TABS = [
    { id: "scan", label: "Scan", icon: "scan", match: ["scan", "analyze", "match"] },
    { id: "report", label: "Report", icon: "report", match: ["report"] },
    { id: "markets", label: "Markets", icon: "markets", match: ["markets"] },
    { id: "deals", label: "Deals", icon: "deals", match: ["deals"] },
    { id: "ledger", label: "Ledger", icon: "ledger", match: ["ledger"] },
    { id: "more", label: "More", icon: "more", match: ["more", "connections", "tool"] }
  ];
  function renderTabs(route) {
    document.getElementById("tabbar").innerHTML = TABS.map(function (t) {
      var on = t.match.indexOf(route) > -1;
      return '<a href="#/' + t.id + '" class="' + (on ? "on" : "") + '"' + (on ? ' aria-current="page"' : "") + '>' + I(t.icon) + '<span>' + t.label + '</span></a>';
    }).join("");
  }
  document.getElementById("btn-settings").innerHTML = I("sliders");
  document.getElementById("btn-settings").addEventListener("click", function () { location.hash = "#/connections"; });

  function parseHash() {
    var h = (location.hash || "#/scan").replace(/^#\/?/, "");
    var parts = h.split("/");
    return { route: parts[0] || "scan", sub: parts[1] || null };
  }
  function go() {
    clearTimers(); closeSheet(); state.connDirty = false; if (BOOM) BOOM.close(true);
    var p = parseHash();
    var fn = ROUTES[p.route] || ROUTES.scan;
    renderTabs(ROUTES[p.route] ? p.route : "scan");
    view.style.animation = "none"; void view.offsetWidth; view.style.animation = "";
    fn(p);
    if (VOICE) VOICE.onRoute(p.route);
    window.scrollTo(0, 0);
  }

  /* SCAN */
  function scanScreen() {
    var cl = isConnected("import");
    var frame = state.photo
      ? '<img class="photo" src="' + state.photo + '" alt="Your card photo preview"><div class="corners"><i></i><i></i><i></i><i></i></div>'
      : '<div class="grid-ov"></div><div class="corners"><i></i><i></i><i></i><i></i></div><div class="scan-empty"><div class="ring">' + I("camera") + '</div><b>Frame the whole card</b>Front side, flat, good light. Slab or raw.</div>';
    var ctas = state.photo
      ? '<button class="btn btn-gold" id="go-analyze">' + I("spark") + 'Analyze this card</button><label class="btn btn-ghost" for="file">' + I("camera") + 'Retake or choose another</label>'
      : '<label class="btn btn-gold" for="file">' + I("camera") + 'Take or upload a photo</label><button class="btn btn-ghost" id="try-sample">' + I("spark") + 'Try a sample card</button>';
    view.innerHTML =
      '<div class="eyebrow">AI card research</div>' +
      '<h1 class="h1">Snap a card.<br><em>Get the call.</em></h1>' +
      '<p class="lead">CardHound finds the exact version, pulls sold comps, reads the trend, and tells you: BUY, SELL, HOLD or GRADE.</p>' +
      '<div class="scan-frame">' + frame + '</div>' +
      '<input class="file-input" id="file" type="file" accept="image/*" capture="environment">' +
      '<div class="cta-stack">' + ctas + '</div>' +
      '<div class="note" style="margin-top:12px">' + I("shield") + '<div>Your photo stays on your phone. Nothing is uploaded. This demo can\'t read photos yet, so it shows a <b style="color:var(--gold2)">sample match</b>.</div></div>' +
      '<div class="sec"><div class="card ' + (cl ? "gold" : "") + ' connect-card"><div class="seal ' + (cl ? "on" : "") + '">' + I(cl ? "check" : "plug") + '</div>' +
        '<div class="t"><b>' + (cl ? "Collection imported" : "Import my collection") + '</b><span>' + (cl ? "Simulated in this demo. Prices shown stay sample data." : "CSV, screenshot or PSA/BGS/SGC/CGC cert numbers. No passwords.") + '</span></div>' +
        (cl ? '<span class="chip gold demo">DEMO</span>' : '<button class="btn btn-gold btn-sm" data-connect="import">Import</button>') + '</div></div>' +
      (VOICE ? VOICE.homeCard() : "") +
      '<div class="sec"><div class="sec-head"><h3 class="h3">How it works</h3></div><div class="steps4"><div>' + I("scan") + 'Identify</div><div>' + I("list") + 'Comps</div><div>' + I("markets") + 'Trend</div><div>' + I("target") + 'The call</div></div></div>' +
      footer();
    var f = document.getElementById("file");
    f.addEventListener("change", function () {
      var file = f.files && f.files[0]; if (!file) return;
      if (state.photo) URL.revokeObjectURL(state.photo);
      state.photo = URL.createObjectURL(file); scanScreen();
    });
    var a = document.getElementById("go-analyze"); if (a) a.onclick = function () { location.hash = "#/analyze"; };
    var s = document.getElementById("try-sample"); if (s) s.onclick = function () { state.photo = null; location.hash = "#/analyze"; };
  }

  /* ANALYZE */
  var STEPS = [["Reading the card", "Edges, text, card number"], ["Matching the exact version", "Set, year, parallel, refractor"], ["Pulling comps", "Sold prices, raw and graded"], ["Checking trends", "30, 90 and 365 days"], ["Building your call", "Fees, grading math, risk"]];
  function analyzeScreen() {
    var cl = isConnected("import");
    var steps = STEPS.map(function (s, i) {
      var sub = (i === 1 && cl) ? "Also checking your imported collection (demo)" : s[1];
      return '<li><span class="dot">' + I("check") + '</span><span><span class="lbl">' + s[0] + '</span><span class="sub">' + sub + '</span></span></li>';
    }).join("");
    var C = 2 * Math.PI * 32;
    var media = state.photo ? '<img src="' + state.photo + '" alt="Your card photo">' : studioArt();
    view.innerHTML = '<div class="an-wrap"><div class="an-photo">' + media + '<div class="shade"></div><div class="grid-ov"></div><div class="sweep"></div><div class="corners" style="position:absolute;inset:16px"><i></i><i></i><i></i><i></i></div>' +
      '<div class="ring-wrap"><svg viewBox="0 0 72 72"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbecc0"/><stop offset=".5" stop-color="#c9972b"/><stop offset="1" stop-color="#f1d48a"/></linearGradient></defs>' +
      '<circle cx="36" cy="36" r="32" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="4"/><circle id="ring" cx="36" cy="36" r="32" fill="none" stroke="url(#rg)" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/></svg><span class="pct num" id="pctv">0%</span></div></div>' +
      '<div><h1 class="an-title">CardHound is analyzing<span class="dots"></span></h1><p class="muted small" style="margin:4px 0 0">' + (state.photo ? "Using your photo for the preview. Results are a sample match." : "Sample card. Results are sample data.") + '</p></div>' +
      '<ol class="an-steps">' + steps + '</ol></div>' + footer();
    var ring = document.getElementById("ring"), pv = document.getElementById("pctv"), lis = view.querySelectorAll(".an-steps li");
    var total = 6000, per = total / STEPS.length, t0 = performance.now();
    var iv = setInterval(function () {
      var e = performance.now() - t0, p = Math.min(1, e / total);
      ring.style.strokeDashoffset = (C * (1 - p)).toFixed(1); pv.textContent = Math.round(p * 100) + "%";
      var k = Math.min(STEPS.length, Math.floor(e / per));
      for (var i = 0; i < lis.length; i++) { lis[i].classList.toggle("done", i < k); lis[i].classList.toggle("active", i === k); }
      if (p >= 1) { clearInterval(iv); state.timers.push(setTimeout(function () { state.fromFlow = true; location.hash = "#/match"; }, 550)); }
    }, 60);
    state.timers.push(iv);
  }

  /* MATCH */
  function matchScreen() {
    D.identifyCard(state.photo).then(function (res) {
      var c = res.candidates;
      var thumb = state.photo ? '<img src="' + state.photo + '" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:14px;border:1px solid var(--gold-line)">' : '<div style="width:46px;flex:none">' + cardArt() + '</div>';
      view.innerHTML = '<div class="row" style="gap:14px">' + thumb + '<div><div class="eyebrow">Almost there</div><h1 class="h2" style="margin-top:4px">Confirm the match</h1></div></div>' +
        '<div class="row wrap" style="margin:14px 0 16px;gap:8px"><span class="chip gold">' + I("spark") + 'Sample match</span><span class="chip">Not read from your photo</span></div>' +
        c.map(function (x, i) {
          return '<button class="cand' + (i === state.pickedCandidate ? " on" : "") + '" data-i="' + i + '"><span class="rad"></span><span class="ct"><b>' + esc(x.name) + '</b><span>' + esc(x.variant) + '</span><div class="bar"><i style="width:' + x.score + '%"></i></div></span><span class="score"><b class="num">' + x.score + '</b><span>Sample<br>score</span></span></button>';
        }).join("") +
        '<div class="card" style="margin-top:14px"><button class="row between" id="ovr" style="width:100%"><span class="row" style="gap:10px;color:var(--gold2)">' + I("search") + '<b style="font-size:14.5px;color:var(--text)">Not right? Enter it yourself</b></span><span class="dim">' + I("down") + '</span></button>' +
        '<div id="ovr-form" hidden><div class="grid2"><div class="field"><label for="o-year">Year</label><input class="input" id="o-year" placeholder="2001" inputmode="numeric"></div><div class="field"><label for="o-num">Card #</label><input class="input" id="o-num" placeholder="T247"></div></div>' +
        '<div class="field"><label for="o-set">Set</label><input class="input" id="o-set" placeholder="Topps Chrome Traded"></div><div class="field"><label for="o-player">Player or subject</label><input class="input" id="o-player" placeholder="Albert Pujols"></div>' +
        '<div class="field"><label for="o-var">Parallel or variant</label><input class="input" id="o-var" placeholder="Base, Refractor, Gold /50"></div><p class="muted small" style="margin:10px 0 0">Demo: manual entries open the same sample report.</p></div></div>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="confirm">' + I("check") + 'Confirm and see the report</button><a class="btn btn-ghost" href="#/scan">Start over</a></div>' + footer();
      view.querySelectorAll(".cand").forEach(function (b) { b.onclick = function () { state.pickedCandidate = +b.dataset.i; view.querySelectorAll(".cand").forEach(function (o) { o.classList.toggle("on", o === b); }); }; });
      document.getElementById("ovr").onclick = function () { var f = document.getElementById("ovr-form"); f.hidden = !f.hidden; };
      document.getElementById("confirm").onclick = function () {
        var manual = !document.getElementById("ovr-form").hidden && document.getElementById("o-player").value.trim();
        if (manual || !c[state.pickedCandidate].hasReport) toast("Demo: only the Base sample report is built, so it opens that one.");
        location.hash = "#/report";
      };
    });
  }

  /* REPORT */
  function reportCalc(r) {
    var f = r.fees, raw = r.raw.w30.median, rawNet = raw * (1 - f.ebayPct) - f.ebayFixed;
    var rows = r.graded.map(function (g) {
      var comp = g.w30.median, fee = f.tiers[g.grade] || 60, net = comp * (1 - f.ebayPct) - f.ebayFixed - fee - f.shipIns;
      return { grade: g.grade, comp: comp, cost: fee + f.shipIns, net: net, vsRaw: net - rawNet, odds: r.odds[g.grade] || 0 };
    });
    var ev = rows.reduce(function (s, x) { return s + x.net * x.odds; }, 0), byG = {};
    rows.forEach(function (x) { byG[x.grade] = x; });
    return { raw: raw, rawNet: rawNet, rows: rows, ev: ev, gain: ev - rawNet, byG: byG };
  }
  function chartSVG(pts, label) {
    var W = 350, H = 170, pt = 14, pb = 22;
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), pad = (mx - mn) * .12 || 1; mn -= pad; mx += pad;
    var X = function (i) { return 6 + i * (W - 12) / (pts.length - 1); }, Y = function (v) { return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); };
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p).toFixed(1); }).join(" ");
    var area = d + " L" + X(pts.length - 1).toFixed(1) + " " + (H - pb) + " L" + X(0).toFixed(1) + " " + (H - pb) + " Z";
    var grid = [0.25, 0.5, 0.75].map(function (g) { var y = pt + g * (H - pt - pb); return '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.06)" stroke-dasharray="3 5"/>'; }).join("");
    var lx = X(pts.length - 1), ly = Y(pts[pts.length - 1]);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '"><defs><linearGradient id="ca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3bd6a" stop-opacity=".35"/><stop offset="1" stop-color="#e3bd6a" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="cl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a87a24"/><stop offset=".6" stop-color="#e7c172"/><stop offset="1" stop-color="#fbecc0"/></linearGradient></defs>' + grid +
      '<path d="' + area + '" fill="url(#ca)"/><path d="' + d + '" fill="none" stroke="url(#cl)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lx + '" cy="' + ly + '" r="9" fill="#e3bd6a" fill-opacity=".18"/><circle cx="' + lx + '" cy="' + ly + '" r="4" fill="#fbecc0"/>' +
      '<text x="0" y="' + (H - 6) + '" fill="#6f6b63" font-size="10.5" font-family="Manrope,sans-serif">' + (pts.length > 20 ? "52 wks ago" : "13 wks ago") + '</text><text x="' + W + '" y="' + (H - 6) + '" fill="#6f6b63" font-size="10.5" text-anchor="end" font-family="Manrope,sans-serif">Now</text></svg>';
  }
  function secHead(n, t, chip) { return '<div class="sec-head"><h2 class="h2"><span class="sec-num">' + n + '</span>' + t + '</h2>' + (chip ? '<span class="chip">' + chip + '</span>' : "") + '</div>'; }
  function reportScreen() {
    D.getCardReport("PUJOLS-01TCT-T247").then(function (r) {
      var c = r.card, k = reportCalc(r), raw = r.raw, p9 = k.byG["PSA 9"];
      LS.set("lastCard", { id: c.id, title: c.year + " " + c.set + " #" + c.number + " " + c.player + (c.rookie ? " RC" : ""), variant: c.variant, raw: raw.w30.median, source: "report" });
      var tr = (raw.w30.median / raw.w90.median - 1) * 100, callWord = "GRADE";
      var because = 'Even a <b>PSA 9</b> nets about <b>' + money(p9.net) + '</b> after fees vs <b>' + money(k.rawNet) + '</b> selling raw, so grading beats selling as is.';
      var gradedRows = r.graded.map(function (g) { return '<tr><td class="gname">' + g.grade + (g.thin ? ' <span class="chip thin">THIN</span>' : "") + '</td><td class="num">' + g.w30.n + '</td><td class="num">' + money(g.w30.low) + '</td><td class="num"><b>' + money(g.w30.median) + '</b></td><td class="num">' + money(g.w30.high) + '</td></tr>'; }).join("");
      var roiRows = k.rows.map(function (x) { return '<tr class="' + (x.grade === "PSA 9" ? "hi" : "") + '"><td class="gname">' + x.grade + '</td><td class="num">' + money(x.comp) + '</td><td class="num">' + money(x.cost) + '</td><td class="num"><b>' + money(x.net) + '</b></td><td class="num ' + (x.vsRaw >= 0 ? "pill-up" : "pill-down") + '">' + (x.vsRaw >= 0 ? "+" : "\u2212") + money(Math.abs(x.vsRaw)) + '</td></tr>'; }).join("");
      var oc = { "PSA 10": "#fbecc0", "PSA 9": "#e3bd6a", "PSA 8": "#a87a24", "PSA 7": "#5b4a2a" };
      var odds = k.rows.map(function (x) { return '<i style="width:' + (x.odds * 100) + '%;background:' + oc[x.grade] + '"></i>'; }).join("");
      var oddsLeg = k.rows.map(function (x) { return '<span><i style="background:' + oc[x.grade] + '"></i>' + x.grade + ' ' + Math.round(x.odds * 100) + '%</span>'; }).join("");
      var sales = r.sales.map(function (s) { return '<tr><td>' + s.date + '</td><td>' + s.grade + '</td><td class="dim">' + s.type + '</td><td class="num"><b>' + money(s.price) + '</b></td></tr>'; }).join("");
      var pop = r.pop, kv = function (a, b) { return '<dt>' + a + '</dt><dd>' + b + '</dd>'; };
      var h = '<div class="row wrap" style="gap:8px;margin-bottom:12px">' + (state.fromFlow ? '<span class="chip gold">' + I("spark") + 'Sample match</span>' : "") + '<span class="chip">Sample report</span><span class="chip">' + esc(r.asOf) + '</span></div>';
      h += '<section class="hero"><div class="hero-top"><div class="hero-art">' + cardArt() + '</div><div style="min-width:0"><div class="eyebrow">' + c.category + ' · Rookie</div>' +
        '<h1>' + c.year + ' ' + esc(c.set) + ' #' + c.number + ' ' + esc(c.player) + '</h1><div class="meta">' + esc(c.variant) + ' · ' + esc(c.team) + '</div>' +
        '<div class="row" style="margin-top:10px;gap:8px"><span class="callpill cp-BUY" style="height:24px;font-size:13px">' + callWord + '</span><span class="small muted">Sample call, below</span></div></div></div>' +
        '<div class="kpis"><div class="kpi"><span>Raw comp</span><b class="num">' + money(raw.w30.median) + '</b><small>30d median</small></div><div class="kpi"><span>PSA 9</span><b class="num">' + money(p9.comp) + '</b><small>30d median</small></div>' +
        '<div class="kpi"><span>Trend</span><b class="num ' + (tr >= 0 ? "pill-up" : "pill-down") + '">' + pct(tr) + '</b><small>30d vs 90d</small></div></div></section>';
      h += '<div class="sec">' + secHead("01", "Exact card") + '<div class="card"><dl class="kv">' + kv("Year", c.year) + kv("Set", esc(c.set)) + kv("Card #", c.number) + kv("Player", esc(c.player)) + kv("Variant", esc(c.variant)) + kv("CardHound ID", '<span style="font-size:12px">' + c.id + '</span>') + '</dl>' +
        '<div class="note" style="margin-top:14px">' + I("list") + '<div><b style="color:var(--text)">Variant rules.</b> Must have: ' + c.mustHave.join(", ") + '. Must not have: ' + c.mustNot.join(", ") + '.</div></div></div></div>';
      h += '<div class="sec">' + secHead("02", "Raw comps", "Sample") + '<div class="card"><table class="tbl"><thead><tr><th>Window</th><th>Sales</th><th>Median</th></tr></thead><tbody>' +
        '<tr class="hi"><td class="gname">30 days</td><td class="num">' + raw.w30.n + '</td><td class="num"><b>' + money(raw.w30.median) + '</b></td></tr><tr><td class="gname">90 days</td><td class="num">' + raw.w90.n + '</td><td class="num">' + money(raw.w90.median) + '</td></tr>' +
        '<tr><td class="gname">365 days</td><td class="num">' + raw.w365.n + '</td><td class="num">' + money(raw.w365.median) + '</td></tr></tbody></table>' +
        '<div class="row between small muted" style="margin-top:10px"><span>30d range ' + money(raw.w30.low) + ' to ' + money(raw.w30.high) + '</span><span>Last ' + raw.last.date + ' · ' + money(raw.last.price) + '</span></div>' + gate("comps") + '</div></div>';
      h += '<div class="sec">' + secHead("03", "Graded comps", "Sample · 30d") + '<div class="card"><table class="tbl"><thead><tr><th>Grade</th><th>Sales</th><th>Low</th><th>Median</th><th>High</th></tr></thead><tbody>' + gradedRows + '</tbody></table><p class="small muted" style="margin:10px 0 0">THIN = fewer than 5 sales in 30 days. Treat as soft.</p></div>' +
        '<div class="card" style="margin-top:10px"><div class="sec-head" style="margin-bottom:6px"><h3 class="h3">Recent sold (sample)</h3></div><table class="tbl"><tbody>' + sales + '</tbody></table>' +
        '<p class="small dim" style="margin:10px 0 0">Excluded: ' + r.dropped.map(function (x) { return money(x.price) + " (" + esc(x.why) + ")"; }).join("; ") + '.</p></div></div>';
      h += '<div class="sec">' + secHead("04", "Price trend", "Sample") + '<div class="card"><div class="seg" id="cg" style="margin-bottom:10px"><button data-g="Raw" class="on">Raw</button><button data-g="PSA 9">PSA 9</button><button data-g="PSA 10">PSA 10</button></div>' +
        '<div class="chart-wrap" id="chart"></div><div class="chart-legend"><span id="ch-l"></span><span id="ch-r"></span></div><div class="seg" id="cr" style="margin-top:12px"><button data-r="90">90 days</button><button data-r="365" class="on">1 year</button></div>' + gate("trend") + '</div></div>';
      h += '<div class="sec">' + secHead("05", "Pop and gem rate", "Sample") + '<div class="card"><div class="kpis" style="margin-top:0"><div class="kpi"><span>PSA 10</span><b class="num">' + pop.psa10.toLocaleString() + '</b></div><div class="kpi"><span>PSA 9</span><b class="num">' + pop.psa9.toLocaleString() + '</b></div><div class="kpi"><span>Gem rate</span><b class="num">' + (pop.psa10 / pop.total * 100).toFixed(1) + '%</b></div></div>' +
        '<p class="small muted" style="margin:10px 0 0">Of ' + pop.total.toLocaleString() + ' graded (sample). Raw copies usually gem lower than the pop suggests.</p>' + gate("pop") + '</div></div>';
      h += '<div class="sec">' + secHead("06", "Grading ROI", "Sample") + '<div class="card"><p class="small muted" style="margin:0 0 10px">Net after eBay fees (' + (r.fees.ebayPct * 100).toFixed(2) + '% + ' + money(r.fees.ebayFixed, true) + '), grading, and ' + money(r.fees.shipIns) + ' ship and insurance. Selling raw now nets <b style="color:var(--text)">' + money(k.rawNet) + '</b>.</p>' +
        '<table class="tbl"><thead><tr><th>Grade</th><th>Comp</th><th>Costs</th><th>Net</th><th>vs raw</th></tr></thead><tbody>' + roiRows + '<tr><td class="gname">Raw</td><td class="num">' + money(k.raw) + '</td><td class="num dim">none</td><td class="num"><b>' + money(k.rawNet) + '</b></td><td class="num dim">base</td></tr></tbody></table>' +
        '<div style="margin-top:16px"><div class="row between"><b style="font-size:13.5px">Grade odds<span class="tag-est">ESTIMATE</span></b><span class="small muted">clean raw copy</span></div><div class="oddsbar">' + odds + '</div><div class="legend">' + oddsLeg + '</div></div>' +
        '<div class="kpis"><div class="kpi"><span>Expected</span><b class="num">' + money(k.ev) + '</b><small>net, estimate</small></div><div class="kpi"><span>vs raw</span><b class="num pill-up">+' + money(k.gain) + '</b><small>estimate</small></div><div class="kpi"><span>Max buy</span><b class="num">' + money(p9.net) + '</b><small>even at PSA 9</small></div></div></div></div>';
      h += '<div class="sec">' + secHead("07", "Outlook", "Labeled estimates") + '<div class="card"><dl class="kv">' + r.outlook.map(function (o) { return '<dt>' + esc(o.k) + '</dt><dd style="font-weight:500;font-size:13px">' + esc(o.v) + '</dd>'; }).join("") + '</dl></div></div>';
      h += '<div class="sec">' + secHead("08", "Options, ranked") + '<div class="card">' +
        '<div class="opt"><span class="n">1</span><div><b>Grade it (PSA)</b><p>Weighted by the grade-odds estimate. Wins at PSA 9 and up.</p></div><span class="v num pill-up">+' + money(k.gain) + '</span></div>' +
        '<div class="opt"><span class="n">2</span><div><b>Sell raw now</b><p>Near the ' + money(k.raw) + ' raw comp, after eBay fees.</p></div><span class="v num">' + money(k.rawNet) + '</span></div>' +
        '<div class="opt"><span class="n">3</span><div><b>Hold raw</b><p>Trend is up, but we don\'t forecast prices.</p></div><span class="v dim" style="font-weight:600;font-size:12px">opinion</span></div></div></div>';
      h += '<div class="sec">' + secHead("09", "Live auctions", "Sample") + '<div id="rp-auctions"></div></div>';
      h += '<div class="sec">' + secHead("10", "Risk notes") + '<div class="card">' + r.risks.map(function (x) { return '<div class="risk"><i></i><span>' + esc(x) + '</span></div>'; }).join("") + '</div></div>';
      h += '<section class="callbox" aria-label="CardHound call"><div class="eyebrow">The CardHound call · sample</div><div class="callword">' + callWord + '</div>' +
        '<p class="because"><span class="muted">Because</span> ' + because.replace("Even", "even") + '</p><div class="row" style="justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap"><span class="chip gold">Confidence: Medium</span><span class="chip">Our opinion, not advice</span></div></section>' +
        '<div class="cta-stack"><a class="btn btn-ghost" href="#/tool/variant">' + I("list") + 'Check it\'s the exact variant</a><a class="btn btn-ghost" href="#/scan">' + I("scan") + 'Scan another card</a></div>' + footer();
      view.innerHTML = h;
      Promise.all([D.getDeals(), D.getGems()]).then(function (res) {
        state._deals = res[0].concat(res[1]);
        var mine = state._deals.filter(function (d) { return d.card.indexOf("T247") > -1; });
        var el = document.getElementById("rp-auctions"); if (el) el.innerHTML = mine.map(function (d) { return dealCard(d, true); }).join("") + gate("listings");
      });
      var cur = { g: "Raw", r: 365 };
      function drawChart() {
        var s = r.series[cur.g], pts = cur.r === 90 ? s.slice(-13) : s;
        document.getElementById("chart").innerHTML = chartSVG(pts, cur.g + " sample price trend");
        var ch = (pts[pts.length - 1] / pts[0] - 1) * 100;
        document.getElementById("ch-l").innerHTML = '<b style="color:var(--text)">' + money(pts[pts.length - 1]) + '</b> ' + cur.g + ' now';
        document.getElementById("ch-r").innerHTML = '<span class="' + (ch >= 0 ? "pill-up" : "pill-down") + '" style="font-weight:800">' + pct(ch) + '</span> ' + (cur.r === 90 ? "90 days" : "1 year");
      }
      view.querySelectorAll("#cg button").forEach(function (b) { b.onclick = function () { cur.g = b.dataset.g; view.querySelectorAll("#cg button").forEach(function (o) { o.classList.toggle("on", o === b); }); drawChart(); }; });
      view.querySelectorAll("#cr button").forEach(function (b) { b.onclick = function () { cur.r = +b.dataset.r; view.querySelectorAll("#cr button").forEach(function (o) { o.classList.toggle("on", o === b); }); drawChart(); }; });
      drawChart();
    });
  }

  /* MARKETS */
  function scopeBar(list) {
    var sc = state.scopes[list], m = state.meta;
    var seg = '<div class="seg" data-scopeview="' + list + '">' + ["overall", "category", "set"].map(function (v) { return '<button data-v="' + v + '" class="' + (sc.view === v ? "on" : "") + '">' + v.charAt(0).toUpperCase() + v.slice(1) + '</button>'; }).join("") + '</div>';
    var chips = "";
    if (sc.view !== "overall") {
      var opts = sc.view === "category" ? m.categories : m.sets;
      chips = '<div class="scopes" data-scopeval="' + list + '">' + opts.map(function (o) { return '<button class="' + (sc.value === o ? "on" : "") + '" data-o="' + esc(o) + '">' + esc(o) + '</button>'; }).join("") + '</div>';
    }
    return seg + chips;
  }
  function bindScope(list, rerender) {
    view.querySelectorAll('[data-scopeview="' + list + '"] button').forEach(function (b) {
      b.onclick = function () { var sc = state.scopes[list]; sc.view = b.dataset.v; sc.value = sc.view === "overall" ? null : (sc.view === "category" ? state.meta.categories[0] : state.meta.sets[0]); rerender(); };
    });
    view.querySelectorAll('[data-scopeval="' + list + '"] button').forEach(function (b) { b.onclick = function () { state.scopes[list].value = b.dataset.o; rerender(); }; });
  }
  function marketsScreen(p) {
    var sub = ["movers", "highs", "picks", "searched"].indexOf(p.sub) > -1 ? p.sub : "movers";
    var head = '<div class="eyebrow">Markets</div><h1 class="h1" style="font-size:30px">' + ({ movers: "Daily <em>Movers</em>", highs: "New <em>Highs</em>", picks: "Buy, Hold, <em>Sell</em>", searched: "Most <em>Searched</em>" }[sub]) + '</h1>' +
      '<div class="subtabs sub4">' + [["movers", "Movers"], ["highs", "New Highs"], ["picks", "Buy / Hold / Sell"], ["searched", "Most Searched"]].map(function (t) { return '<button data-sub="' + t[0] + '" class="' + (sub === t[0] ? "on" : "") + '">' + t[1] + '</button>'; }).join("") + '</div>';
    var rer = function () { var y = window.scrollY; marketsScreen({ sub: sub }); setTimeout(function () { window.scrollTo(0, y); }, 0); };
    var fn = sub === "highs" ? D.getNewHighs : sub === "picks" ? D.getPicks : sub === "searched" ? D.getMostSearched : D.getMovers, sc = state.scopes[sub];
    fn(sc).then(function (rows) {
      var body = "";
      if (sub === "movers") {
        var dir = state.moversDir, side = function (r) { return dir === "up" ? r.pct > 0 : r.pct < 0; };
        var list = rows.filter(function (r) { return !r.thin && side(r); }).sort(function (a, b) { return dir === "up" ? b.pct - a.pct : a.pct - b.pct; });
        var thinL = rows.filter(function (r) { return r.thin && side(r); });
        var row = function (r, i) {
          return '<div class="lrow' + (r.thin ? " thin" : "") + '"><span class="rk">' + (r.thin ? "\u2013" : i + 1) + '</span><div class="nm"><b>' + esc(r.card) + '</b><span>' + esc(r.grade) + ' · ' + r.sales + ' today · ' + r.base + ' in 30d' + (r.thin ? ' <span class="chip thin" title="' + esc(r.thinWhy) + '">THIN</span>' : "") + '</span></div>' +
            '<div class="rt">' + sparkSVG(r.spark, r.pct >= 0) + '<span class="pct num ' + (r.pct >= 0 ? "pill-up" : "pill-down") + '">' + pct(r.pct) + '</span></div></div>';
        };
        body = '<div class="seg seg-sm" id="dir" style="margin-top:12px"><button data-d="up" class="' + (dir === "up" ? "on" : "") + '">Up</button><button data-d="down" class="' + (dir === "down" ? "on" : "") + '">Down</button></div>' +
          '<div class="card" style="margin-top:12px">' + (list.length ? list.map(row).join("") : '<div class="empty">No ranked ' + dir + ' moves in this view (sample).</div>') + '</div>' +
          (thinL.length ? '<div class="group-h"><h3 class="h3">Thin · shown, not ranked</h3></div><div class="card">' + thinL.map(row).join("") + '</div>' : "") +
          '<p class="small dim" style="margin-top:12px">Today\'s median vs the prior 30 days. Ranked only with 3+ sales today and 10+ in the prior 30 days. Moves describe past sample sales, not a forecast.</p>' + gate(sc.value === "Pokémon" || sc.value === "Magic" ? "tcg" : "movers");
      } else if (sub === "highs") {
        body = BOOM ? BOOM.listHTML(rows) : "";
      } else if (sub === "picks") {
        body = '<div style="height:8px"></div>' + ["BUY", "HOLD", "SELL"].map(function (g) {
          var rs = rows.filter(function (r) { return r.rating === g; });
          return '<div class="group-h"><span class="callpill cp-' + g + '">' + g + '</span><span class="small dim">' + rs.length + ' sample pick' + (rs.length === 1 ? "" : "s") + '</span></div><div class="card">' +
            (rs.length ? rs.map(function (r) { return '<div class="prow"><b>' + esc(r.card) + '</b><p>' + esc(r.why) + '</p><div class="tg"><span>' + esc(r.grade) + '</span><span>Buy under <em class="num">' + money(r.buyTarget) + '</em></span><span>Sell near <em class="num">' + money(r.sellTarget) + '</em></span><span>' + r.conf + ' conf.</span></div></div>'; }).join("") : '<div class="empty">No ' + g + ' picks in this view.</div>') + '</div>';
        }).join("") + '<p class="small dim" style="margin-top:12px">Our opinion from fixed rules, on sample data. Not financial advice; no outcome is guaranteed.</p>';
      } else {
        rows.sort(function (a, b) { return b.lookups - a.lookups; });
        body = '<div class="card" style="margin-top:12px">' + (rows.length ? rows.map(function (r, i) {
          var ch = r.change > 0 ? '<span class="pill-up small num row" style="font-weight:800;gap:2px">' + I("up", "mini") + r.change + '</span>' : r.change < 0 ? '<span class="pill-down small num row" style="font-weight:800;gap:2px">' + I("down", "mini") + Math.abs(r.change) + '</span>' : '<span class="dim small">steady</span>';
          return '<div class="lrow"><span class="rk" style="color:' + (i < 3 ? "var(--gold2)" : "var(--dim)") + '">' + (i + 1) + '</span><div class="nm"><b>' + esc(r.card) + '</b><span>' + r.lookups.toLocaleString() + ' lookups · ' + r.users.toLocaleString() + ' people</span></div><div class="rt">' + ch + '</div></div>';
        }).join("") : '<div class="empty">No sample lookups in this view.</div>') + '</div><p class="small dim" style="margin-top:12px">Sample lookup counts, last 7 days. In the real app these come only from CardHound\'s own lookup log.</p>';
      }
      view.innerHTML = head + '<div class="row between" style="margin-bottom:10px"><span class="small muted">' + esc(state.meta.asOf) + '</span><span class="chip">Sample</span></div>' + scopeBar(sub) + body + footer();
      view.querySelectorAll("[data-sub]").forEach(function (b) { b.onclick = function () { location.hash = "#/markets/" + b.dataset.sub; }; });
      view.querySelectorAll("#dir button").forEach(function (b) { b.onclick = function () { state.moversDir = b.dataset.d; rer(); }; });
      bindScope(sub, rer);
      if (sub === "highs" && BOOM) BOOM.bindList(rows, sc, rer);
      if (BOOM) BOOM.maybeAuto();
      var sc_ = view.querySelector(".scopes"), on_ = sc_ && sc_.querySelector("button.on");
      if (on_) sc_.scrollLeft = on_.offsetLeft - (sc_.clientWidth - on_.offsetWidth) / 2;
    });
  }

  /* DEALS */
  function fmtEnds(min) { if (min >= 1440) return Math.round(min / 1440) + "d left"; if (min >= 60) return Math.floor(min / 60) + "h " + (min % 60) + "m left"; return min + "m left"; }
  function dealCard(d, withNote) {
    var diff = (d.price / d.comp - 1) * 100, good = diff < 0;
    var act = d.type === "Auction" ? '<button class="btn btn-gold btn-xs" data-snipe="' + d.id + '">' + I("target") + 'Snipe</button>'
      : d.type === "Best Offer" ? '<button class="btn btn-gold btn-xs" data-offer="' + d.id + '">' + I("handshake") + 'Offer helper</button>'
      : '<button class="btn btn-ghost btn-xs" data-alert="1">' + I("bell") + 'Alert me</button>';
    return '<div class="deal"><div class="top"><b>' + esc(d.card) + '</b><span class="chip" style="height:22px;font-size:10.5px">' + d.type + '</span></div>' +
      '<div class="small dim" style="margin-top:4px">' + esc(d.grade) + ' · ' + (d.type === "Auction" ? d.bids + " bids · " : "") + fmtEnds(d.endsMin) + '</div>' +
      (withNote && d.note ? '<div class="note" style="margin-top:10px">' + I("gem") + '<div>' + esc(d.note) + '</div></div>' : "") +
      '<div class="vs"><div class="price num">' + money(d.price) + '<small>vs comp ' + money(d.comp) + '</small></div><span class="under ' + (good ? "good" : "bad") + ' num">' + (good ? Math.abs(diff).toFixed(0) + "% under" : diff.toFixed(0) + "% over") + '</span></div>' +
      '<div class="acts">' + act + '<button class="btn btn-ghost btn-xs" data-toast="Demo: sample listings have no eBay link.">' + I("eye") + 'View</button></div></div>';
  }
  function dealsScreen(p) {
    var sub = ["deals", "watch", "gems", "snipes"].indexOf(p.sub) > -1 ? p.sub : "deals";
    var head = '<div class="eyebrow">Buyer tools</div><h1 class="h1" style="font-size:30px">' + ({ deals: "Live <em>deals</em>", watch: "Your <em>watchlist</em>", gems: "Gem <em>Hunt</em>", snipes: "<em>Sniper</em>" }[sub]) + '</h1>' +
      '<div class="subtabs" style="gap:18px">' + [["deals", "Deals"], ["watch", "Watchlist"], ["gems", "Gem Hunt"], ["snipes", "Sniper"]].map(function (t) { return '<button data-dsub="' + t[0] + '" class="' + (sub === t[0] ? "on" : "") + '">' + t[1] + '</button>'; }).join("") + '</div>';
    Promise.all([D.getDeals(), D.getGems(), D.getSavedSearches()]).then(function (res) {
      var deals = res[0], gems = res[1], saved = res[2], body = "";
      state._deals = deals.concat(gems);
      if (sub === "deals") {
        body = gate("listings") + '<div class="row between" style="margin:14px 0 10px"><span class="small muted">Listings vs sample comps</span><button class="link-btn" id="alerts">' + I("bell") + 'Alerts ' + (state.alerts.on ? state.alerts.threshold + "% under" : "off") + '</button></div>' +
          deals.slice().sort(function (a, b) { return a.price / a.comp - b.price / b.comp; }).map(function (d) { return dealCard(d); }).join("") +
          '<div class="sec"><div class="sec-head"><h3 class="h3">Saved searches</h3><span class="chip">Sample</span></div><div class="card">' +
          saved.map(function (s) { return '<div class="lrow" style="grid-template-columns:22px 1fr auto"><span style="color:var(--gold)">' + I("search") + '</span><div class="nm"><b>' + esc(s.q) + '</b></div><span class="chip gold">' + s.new + ' new</span></div>'; }).join("") + gate("saved") + '</div></div>';
      } else if (sub === "watch") {
        body = gate("watchlist") + '<div id="vw-list"></div><div style="height:14px"></div>' + deals.filter(function (d) { return d.watch; }).map(function (d) { return dealCard(d); }).join("");
      } else if (sub === "gems") {
        body = '<p class="lead" style="margin-top:4px">Mislabeled or underdescribed listings priced under the sample comp. Look-only: CardHound never buys or bids for you.</p>' + gate("listings") + '<div id="vh-saved"></div><div style="height:14px"></div>' + gems.map(function (d) { return dealCard(d, true); }).join("");
      } else body = snipesList();
      view.innerHTML = head + body + footer();
      view.querySelectorAll("[data-dsub]").forEach(function (b) { b.onclick = function () { location.hash = "#/deals/" + b.dataset.dsub; }; });
      var al = document.getElementById("alerts"); if (al) al.onclick = alertSheet;
      if (sub === "snipes") bindSnipes();
      if (VOICE) VOICE.fillDeals(view, sub);
    });
  }
  function disclaimer() {
    return '<div class="note" style="margin-top:14px">' + I("shield") + '<div><b style="color:var(--text)">CardHound never bids or buys.</b> You set your max, open the listing on eBay and place your bid there yourself. CardHound reminds you before the auction ends. It never sees the result: check eBay to see if you won.</div></div>';
  }
  function cd(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" : "") + (m < 10 ? "0" : "") + m + ":" + (x < 10 ? "0" : "") + x; }
  var ST_LABEL = { Scheduled: "Reminder set", Ended: "Auction ended" };
  /* CardHound never bids, so there is no "placed" or "won". Older saved demo snipes are mapped to the honest states. */
  function normSnipe(s) { if (s.status === "Placed") { s.status = "Scheduled"; s.opened = true; } else if (s.status !== "Scheduled") s.status = "Ended"; return s; }
  function remindText(s) { return "Reminder (demo): " + s.card + " ends soon. Your max: " + money(s.max, true) + ". Open it on eBay and bid yourself. CardHound never bids."; }
  function snipesList() {
    var head = gate("sniper");
    if (!state.snipes.length) return head + '<div class="card" style="text-align:center;padding:28px 18px;margin-top:12px"><div style="width:60px;height:60px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;color:var(--gold2);border:1px solid var(--gold-line)">' + I("target") + '</div><b>No auctions tracked yet</b><p class="muted small" style="margin:6px 0 14px">Tap <b>Snipe</b> on any auction in Deals, Watchlist, Gem Hunt or a report.</p><a class="btn btn-gold btn-sm" href="#/deals">Browse auctions</a></div>' + disclaimer();
    return head + '<div style="height:12px"></div>' + state.snipes.map(function (s) {
      var st = normSnipe(s).status, live = st === "Scheduled", left = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
      return '<div class="deal"><div class="top"><b>' + esc(s.card) + '</b><span class="chip ' + (live ? "gold" : "") + '" style="height:22px;font-size:10.5px">' + ST_LABEL[st] + (live && s.opened ? " · eBay opened" : "") + ' · demo</span></div>' +
        '<div class="vs"><div><div class="small dim">Your max</div><div class="price num">' + money(s.max, true) + '</div></div><div style="text-align:right"><div class="small dim">' + (live ? "Auction ends in (demo)" : "Result") + '</div><div class="countdown num" data-cd="' + s.id + '">' + (live ? cd(left) : "Check eBay") + '</div></div></div>' +
        (live ? "" : '<p class="small muted" style="margin:6px 0 0">CardHound never bids, so only eBay knows if you won.</p>') +
        '<div class="acts acts-wrap">' + (live ? '<button class="btn btn-gold btn-xs" data-ebay="' + s.id + '">' + I("ext") + 'Open on eBay</button><button class="btn btn-ghost btn-xs" data-edit="' + s.id + '">Edit max</button><button class="btn btn-ghost btn-xs" data-cancel="' + s.id + '">Cancel reminder</button><button class="btn btn-ghost btn-xs" data-sim="' + s.id + '">Preview reminder</button>' : '<button class="btn btn-ghost btn-xs" data-remove="' + s.id + '">Remove</button>') + '</div></div>';
    }).join("") + disclaimer();
  }
  function findSnipe(id) { return state.snipes.filter(function (x) { return x.id === id; })[0]; }
  function ebayHandoff(s) {
    if (s) { s.opened = true; saveSnipes(); }
    toast("Demo: sample listings have no eBay link. In the app this opens the listing on eBay, where you enter your own max.");
  }
  function bindSnipes() {
    state.timers.push(setInterval(function () {
      state.snipes.forEach(function (s) {
        if (normSnipe(s).status !== "Scheduled") return;
        var left = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)), el = view.querySelector('[data-cd="' + s.id + '"]');
        if (el) el.textContent = cd(left);
        if (left <= 120 && !s.reminded) { s.reminded = true; saveSnipes(); toast(remindText(s)); }
        if (left === 0) {
          s.status = "Ended"; saveSnipes();
          toast("Demo: auction ended. CardHound never bids, so check eBay for the result.");
          dealsScreen({ sub: "snipes" });
        }
      });
    }, 1000));
    view.querySelectorAll("[data-ebay]").forEach(function (b) { b.onclick = function () { ebayHandoff(findSnipe(b.dataset.ebay)); dealsScreen({ sub: "snipes" }); }; });
    view.querySelectorAll("[data-cancel]").forEach(function (b) { b.onclick = function () { state.snipes = state.snipes.filter(function (s) { return s.id !== b.dataset.cancel; }); saveSnipes(); toast("Reminder cancelled (demo)."); dealsScreen({ sub: "snipes" }); }; });
    view.querySelectorAll("[data-remove]").forEach(function (b) { b.onclick = function () { state.snipes = state.snipes.filter(function (s) { return s.id !== b.dataset.remove; }); saveSnipes(); dealsScreen({ sub: "snipes" }); }; });
    view.querySelectorAll("[data-sim]").forEach(function (b) { b.onclick = function () { toast(remindText(findSnipe(b.dataset.sim))); }; });
    view.querySelectorAll("[data-edit]").forEach(function (b) { b.onclick = function () { var s = findSnipe(b.dataset.edit); snipeSheet(s.dealId, s); }; });
  }

  /* SHEETS */
  function openSheet(html, onMount) {
    var root = document.getElementById("sheet-root");
    root.innerHTML = '<div class="sheet-bg" id="sbg"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="icon-btn x" id="sx" aria-label="Close">' + I("close") + '</button>' + html + '</div>';
    /* Closing a sheet after a (demo) connect/import re-renders the screen underneath so status pills update. */
    var userClose = function () { closeSheet(); if (state.connDirty) { var y = window.scrollY; go(); window.scrollTo(0, y); } };
    document.getElementById("sbg").onclick = userClose; document.getElementById("sx").onclick = userClose;
    var sh = root.querySelector(".sheet"); bindGlobal(sh);
    if (onMount) onMount(sh);
  }
  function closeSheet() { var r = document.getElementById("sheet-root"); if (r) r.innerHTML = ""; }
  function snipeSheet(id, existing) {
    var d = (state._deals || []).filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var margin = 0.15, F = { pct: 0.1325, fixed: 0.40, ship: 5 };
    function step1(keep) {
      var net = d.comp * (1 - F.pct) - F.fixed - F.ship, sug = Math.floor(net / (1 + margin));
      var val = keep != null ? keep : existing ? existing.max : sug;
      openSheet('<div class="eyebrow">Sniper · demo</div><h2>' + esc(d.card) + '</h2><p class="small muted" style="margin:0">' + esc(d.grade) + ' · current bid ' + money(d.price) + ' · ' + fmtEnds(d.endsMin) + '</p>' +
        '<div class="card gold" style="margin-top:14px"><div class="row between"><span class="h3" style="color:var(--gold2)">Suggested fair max</span><span class="chip demo">SAMPLE</span></div><div class="callword num" style="font-size:46px;margin:8px 0 4px">' + money(sug) + '</div>' +
        '<dl class="kv small" style="margin-top:8px"><dt>Comp median (sample)</dt><dd class="num">' + money(d.comp) + '</dd><dt>eBay fees 13.25% + $0.40</dt><dd class="num">\u2212' + money(d.comp * F.pct + F.fixed, true) + '</dd><dt>Shipping to resell</dt><dd class="num">\u2212' + money(F.ship) + '</dd><dt>Target margin</dt><dd class="num">' + Math.round(margin * 100) + '%</dd></dl>' +
        '<div class="seg" id="mg" style="margin-top:12px">' + [0.1, 0.15, 0.2, 0.3].map(function (m) { return '<button data-m="' + m + '" class="' + (m === margin ? "on" : "") + '">' + Math.round(m * 100) + '%</button>'; }).join("") + '</div><p class="small dim" style="margin:6px 0 0;text-align:center">Target margin</p></div>' +
        (sug < d.price ? '<div class="note" style="margin-top:10px">' + I("lock") + '<div>The current bid is already above this max. Skipping is a fine call.</div></div>' : "") +
        '<div class="field"><label for="mymax">Your max bid (you decide)</label><input class="input num" id="mymax" inputmode="decimal" value="' + val + '" style="font-size:20px;font-weight:700"></div>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="rev">Review my max</button></div>' + disclaimer(), function () {
          document.querySelectorAll("#mg button").forEach(function (b) { b.onclick = function () { margin = +b.dataset.m; step1(); }; });
          document.getElementById("rev").onclick = function () {
            var v = parseFloat(String(document.getElementById("mymax").value).replace(/[^0-9.]/g, ""));
            if (!(v > 0)) { toast("Enter your max bid first."); return; }
            step2(Math.round(v * 100) / 100);
          };
        });
    }
    function step2(v) {
      openSheet('<div class="eyebrow">Reminder · demo</div><h2>Your max</h2><p class="muted small" style="margin:0">' + esc(d.card) + '</p>' +
        '<div class="card gold" style="margin-top:14px;text-align:center"><div class="small muted">Your max bid</div><div class="callword num" style="font-size:54px;margin:6px 0">' + money(v, true) + '</div><div class="small muted">You enter this on eBay yourself. CardHound reminds you before the end.</div></div>' +
        '<label class="row" style="margin-top:14px;gap:12px;align-items:flex-start;font-size:13.5px"><input type="checkbox" id="ok" style="width:20px;height:20px;accent-color:#e3bd6a;margin-top:1px;flex:none"><span>I will enter my max of <b>' + money(v, true) + '</b> on eBay myself. CardHound never bids.</span></label>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="ebay" disabled>' + I("ext") + 'Open the listing on eBay</button><button class="btn btn-ghost" id="remind" disabled>' + I("bell") + (existing ? "Update reminder (demo)" : "Remind me before it ends (demo)") + '</button></div>' +
        '<button class="link-btn" id="back" style="margin-top:12px">' + I("left") + 'Change amount</button>' + disclaimer(), function () {
          var ok = document.getElementById("ok"), eb = document.getElementById("ebay"), rm = document.getElementById("remind");
          ok.onchange = function () { eb.disabled = rm.disabled = !ok.checked; };
          document.getElementById("back").onclick = function () { step1(v); };
          var save = function (placed) {
            var s = existing;
            if (s) s.max = v;
            else { s = { id: "sn" + Date.now(), dealId: d.id, card: d.card, max: v, price: d.price, status: "Scheduled", endsAt: Date.now() + Math.min(d.endsMin, 45) * 60000 }; state.snipes.unshift(s); }
            if (placed) ebayHandoff(s); else toast("Reminder set (demo). CardHound never bids.");
            saveSnipes(); closeSheet();
            if (parseHash().route === "deals" && parseHash().sub === "snipes") dealsScreen({ sub: "snipes" }); else location.hash = "#/deals/snipes";
          };
          eb.onclick = function () { if (ok.checked) save(true); };
          rm.onclick = function () { if (ok.checked) save(false); };
        });
    }
    step1();
  }
  function offerSheet(id) {
    var d = (state._deals || []).filter(function (x) { return x.id === id; })[0]; if (!d) return;
    var offer = Math.round(Math.min(d.price * 0.85, d.comp * 0.9)), walk = Math.round(Math.min(d.price, d.comp * 0.97));
    var note = "Hi! I'm interested in your " + d.card + " (" + d.grade + "). Recent sales I've tracked are around " + money(d.comp) + ", so I'd like to offer " + money(offer) + ". I can pay right away. Thanks for considering it!";
    openSheet('<div class="eyebrow">Best Offer helper · sample</div><h2>' + esc(d.card) + '</h2><p class="small muted" style="margin:0">Listed at ' + money(d.price) + ' · comp ' + money(d.comp) + ' (sample)</p>' +
      '<div class="kpis"><div class="kpi"><span>Offer</span><b class="num" style="color:var(--gold2)">' + money(offer) + '</b><small>suggested</small></div><div class="kpi"><span>Walk away</span><b class="num">' + money(walk) + '</b><small>above this</small></div><div class="kpi"><span>Accept</span><b class="num">~45%</b><small>estimate</small></div></div>' +
      '<div class="card" style="margin-top:12px"><dl class="kv small"><dt>Why this offer</dt><dd style="font-weight:500">85% of ask, capped at 90% of comp</dd><dt>Accept rate<span class="tag-est">ESTIMATE</span></dt><dd style="font-weight:500">Offers 10 to 15% under ask</dd><dt>Walk away</dt><dd style="font-weight:500">Near comp: no edge above it</dd></dl></div>' +
      '<div class="field"><label for="onote">Polite offer note</label><textarea class="input" id="onote" rows="4" style="height:auto;padding:12px 14px;line-height:1.45;resize:vertical">' + esc(note) + '</textarea></div>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="cpy">' + I("copy") + 'Copy note</button></div><div class="note" style="margin-top:12px">' + I("shield") + '<div>You send the offer yourself on eBay. CardHound never submits offers for you.</div></div>', function () {
        document.getElementById("cpy").onclick = function () {
          var t = document.getElementById("onote"); t.select();
          var fb = function () { try { document.execCommand("copy"); toast("Copied. Paste it into your eBay offer."); } catch (e) { toast("Select the text and copy it."); } };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(function () { toast("Copied. Paste it into your eBay offer."); }, fb); else fb();
        };
      });
  }
  function alertSheet() {
    var a = state.alerts;
    openSheet('<div class="eyebrow">Deal alerts · demo</div><h2>Alert me when a listing drops under its comp</h2>' +
      '<div class="card" style="margin-top:12px"><div class="row between"><b>Threshold</b><span class="countdown num" id="thv" style="font-size:24px">' + a.threshold + '% under</span></div><input type="range" id="th" min="5" max="50" step="5" value="' + a.threshold + '" style="width:100%;accent-color:#e3bd6a;margin-top:12px"></div>' +
      '<label class="row between card tight" style="margin-top:10px"><span><b>Alerts on</b><br><span class="small muted">Watchlist and saved searches</span></span><input type="checkbox" id="aon" ' + (a.on ? "checked" : "") + ' style="width:22px;height:22px;accent-color:#e3bd6a"></label>' +
      gate("alerts") + '<button class="row between card tight" id="nhlink" style="margin-top:10px;width:100%;text-align:left"><span><b>New-high alerts (BOOM!)</b><br><span class="small muted">All-time and 90-day highs, exact variant only</span></span><span style="color:var(--gold2)">' + I("right") + '</span></button>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="asave">Save alert settings</button></div><p class="small dim" style="margin-top:10px;text-align:center">Demo: saved on this device only. No alerts are sent.</p>', function () {
        var th = document.getElementById("th"), v = document.getElementById("thv");
        th.oninput = function () { v.textContent = th.value + "% under"; };
        var nl = document.getElementById("nhlink"); if (nl && BOOM) nl.onclick = function () { BOOM.settingsSheet(); };
        document.getElementById("asave").onclick = function () { state.alerts = { threshold: +th.value, on: document.getElementById("aon").checked }; LS.set("alerts", state.alerts); closeSheet(); toast("Saved on this device (demo)."); go(); };
      });
  }

  /* CONNECT + IMPORT */
  var COST_COL = /(investment|cost|purchase price|price paid|paid|date purchased|purchase date|purchased|bought)/i;
  var VALUE_COL = /(value|ladder|\bcl\b|collx|market|price|fmv|comp|gain|loss|profit|roi)/i;
  var ID_COL = /(player|name|subject|year|set|variation|variant|parallel|number|card ?#|^#$|no\.|category|sport|condition|grade|grader|cert|quantity|qty|team|brand|serial)/i;
  function classifyCols(header) {
    return header.map(function (h) {
      var c = h.trim().replace(/^"|"$/g, "");
      var keep = COST_COL.test(c) ? true : VALUE_COL.test(c) ? false : ID_COL.test(c);
      return { name: c || "(blank)", keep: keep };
    });
  }
  function splitCSVLine(line) { var out = [], cur = "", q = false; for (var i = 0; i < line.length; i++) { var ch = line[i]; if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; }
  function importSheet() {
    var tab = "csv", certText = "";
    function render(result) {
      var tabs = '<div class="seg" id="imtab" style="margin-top:14px"><button data-t="csv" class="' + (tab === "csv" ? "on" : "") + '">CSV</button><button data-t="shot" class="' + (tab === "shot" ? "on" : "") + '">Screenshot</button><button data-t="cert" class="' + (tab === "cert" ? "on" : "") + '">Cert numbers</button></div>';
      var body = "";
      if (tab === "csv") body = '<p class="small muted" style="margin:12px 0 0">Any collection CSV: your own sheet, a Card Ladder or Market Movers list, or a CollX export.</p><div class="cta-stack"><label class="btn btn-ghost" for="imcsv">' + I("upload") + 'Choose a CSV file</label><input class="file-input" id="imcsv" type="file" accept=".csv,text/csv"></div>';
      else if (tab === "shot") body = '<p class="small muted" style="margin:12px 0 0">A screenshot of your own collection page. CardHound reads the card details only.</p><div class="cta-stack"><label class="btn btn-ghost" for="imshot">' + I("camera") + 'Choose a screenshot</label><input class="file-input" id="imshot" type="file" accept="image/*"></div>';
      else body = '<div class="field"><label for="imcert">PSA, BGS, SGC or CGC cert numbers</label><textarea class="input" id="imcert" rows="4" style="height:auto;padding:12px 14px" placeholder="One per line, or separated by commas">' + esc(certText) + '</textarea></div><div class="cta-stack"><button class="btn btn-ghost" id="imcertgo">' + I("check") + 'Check cert numbers</button></div>';
      openSheet('<div class="row" style="gap:12px;margin-bottom:8px"><span class="srcmono">IN</span><div class="eyebrow">CSV · screenshot · cert numbers</div></div><h2>Import my collection</h2>' +
        '<p class="muted small" style="margin:0">CardHound keeps the card details plus your cost and purchase date. Any value columns (Card Ladder, CollX and others) are dropped. Your cards are priced with CardHound\'s own data.</p>' +
        tabs + body + (result || "") +
        '<div class="bullets" style="margin-top:16px"><div>' + I("shield") + 'No passwords, no cookies, no scraping.</div><div>' + I("lock") + 'Demo: read on this device only. Nothing is uploaded.</div></div>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="imdone">' + I("check") + 'Finish import (demo)</button></div>', function () {
          document.querySelectorAll("#imtab button").forEach(function (b) { b.onclick = function () { tab = b.dataset.t; render(); }; });
          var f = document.getElementById("imcsv");
          if (f) f.onchange = function () {
            var file = f.files[0]; if (!file) return;
            var rd = new FileReader();
            rd.onload = function () {
              var lines = String(rd.result).split(/\r?\n/).filter(function (l) { return l.trim(); });
              if (!lines.length) { toast("That file looks empty."); return; }
              var cols = classifyCols(splitCSVLine(lines[0]));
              var kept = cols.filter(function (c) { return c.keep; }), drop = cols.filter(function (c) { return !c.keep; });
              render('<div class="card" style="margin-top:12px"><b style="font-size:14px">' + esc(file.name) + '</b><div class="small muted">' + (lines.length - 1) + ' card rows found</div>' +
                '<div class="h3" style="margin:12px 0 6px">Kept</div><div class="row wrap" style="gap:6px">' + (kept.map(function (c) { return '<span class="chip gold">' + esc(c.name) + '</span>'; }).join("") || '<span class="small dim">No card-detail columns found</span>') + '</div>' +
                '<div class="h3" style="margin:12px 0 6px">Dropped</div><div class="row wrap" style="gap:6px">' + (drop.map(function (c) { return '<span class="chip" style="text-decoration:line-through">' + esc(c.name) + '</span>'; }).join("") || '<span class="small dim">Nothing to drop</span>') + '</div></div>');
            };
            rd.readAsText(file.slice(0, 200000));
          };
          var sh = document.getElementById("imshot");
          if (sh) sh.onchange = function () { var file = sh.files[0]; if (!file) return; var u = URL.createObjectURL(file); render('<div class="card" style="margin-top:12px;display:flex;gap:12px;align-items:center"><img src="' + u + '" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:12px"><div class="small muted">Got it. Reading card details from screenshots is coming soon. Value numbers on the image are ignored.</div></div>'); };
          var cg = document.getElementById("imcertgo");
          if (cg) cg.onclick = function () {
            certText = document.getElementById("imcert").value;
            var toks = (certText.match(/[A-Za-z0-9-]{6,14}/g) || []);
            render('<div class="card" style="margin-top:12px"><b>' + toks.length + ' cert number' + (toks.length === 1 ? "" : "s") + ' ready</b><div class="small muted" style="margin-top:4px">PSA certs resolve through your own PSA token. BGS, SGC and CGC lookups are coming soon.</div>' + gate("cert") + '</div>');
          };
          document.getElementById("imdone").onclick = function () { state.conn["import"] = true; saveConn(); connectSheet("import"); };
        });
    }
    render();
  }
  function connectSheet(id) {
    var s = srcById(id); if (!s) return;
    if (s.status === "importonly") { importSheet(); return; }
    if (id === "import" && !isConnected(id)) { importSheet(); return; }
    if (isConnected(id)) {
      var label = id === "import" ? "Collection imported" : s.name + " connected";
      openSheet('<div class="bigcheck">' + I("check") + '</div><h2 style="text-align:center;padding:0">' + esc(label) + '</h2>' +
        '<div class="row" style="justify-content:center;gap:8px;margin:8px 0 12px"><span class="chip gold">' + I("check") + esc(label) + '</span><span class="chip demo">DEMO</span></div>' +
        (state.keys[id] ? '<p class="small muted" style="text-align:center;margin:0 0 6px">Token ending \u2026' + esc(state.keys[id]) + ', stored only on this device.</p>' : "") +
        '<p class="muted small" style="text-align:center;margin:0 0 6px">Simulated. This shared demo always shows sample data with the Sample data badge.</p>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="toscan">' + I("camera") + 'Next: photograph a card</button><button class="btn btn-ghost" id="disc">' + (id === "import" ? "Clear import (demo)" : "Disconnect (demo)") + '</button></div>', function () {
          document.getElementById("toscan").onclick = function () { closeSheet(); if (parseHash().route === "scan") go(); else location.hash = "#/scan"; };
          document.getElementById("disc").onclick = function () { delete state.conn[id]; delete state.keys[id]; saveConn(); closeSheet(); toast("Done (demo)."); go(); };
        });
      return;
    }
    var unlocks = Object.keys(CH_FEATURES).filter(function (k) { return CH_FEATURES[k].sources.indexOf(id) > -1; }).map(function (k) { return CH_FEATURES[k].label; });
    var top = '<div class="row" style="gap:12px;margin-bottom:8px"><span class="srcmono">' + esc(s.mono) + '</span><div class="eyebrow">' + esc(s.how) + '</div></div>';
    var safe = '<div class="bullets"><div>' + I("shield") + 'No password fields. Ever.</div><div>' + I("eye") + 'Reads only what your own account shows you.</div><div>' + I("close") + 'Disconnect any time.</div></div>';
    var unl = unlocks.length ? '<div class="h3" style="margin:4px 0 8px">Unlocks</div><div class="row wrap" style="gap:6px;margin-bottom:6px">' + unlocks.map(function (u) { return '<span class="chip">' + esc(u.charAt(0).toUpperCase() + u.slice(1)) + '</span>'; }).join("") + '</div>' : "";
    if (s.status === "na" || s.status === "partner" || s.status === "coming" || s.status === "feed") {
      var badge = { na: "Not available yet", partner: "Pending partnership", coming: "Coming soon", feed: "Coming soon" }[s.status];
      var extra = id === "companion" ? '<ol class="vsteps"><li><span class="sn">1</span><div><b>Sign in to Card Ladder in your own browser</b><span>As you normally do. CardHound never sees your password or cookies.</span></div></li><li><span class="sn">2</span><div><b>Open any card page</b><span>Companion recognizes which card it is.</span></div></li><li><span class="sn">3</span><div><b>Open the CardHound side panel</b><span>Our call, Gem Hunt hits, Sniper, add to watchlist, add to portfolio. Prices come from CardHound, never from Card Ladder.</span></div></li></ol>' : "";
      openSheet(top + '<h2>' + esc(s.name) + '</h2><span class="chip gold" style="margin:4px 0 10px">' + badge + '</span><p class="muted small" style="margin:10px 0 0">' + esc(s.blurb) + '</p>' + extra +
        '<div class="cta-stack"><button class="btn btn-ghost" disabled>' + I("clock") + badge + '</button><button class="btn btn-ghost" data-connect="import">' + I("upload") + 'Import my collection instead</button></div>' + safe);
      return;
    }
    var body = "";
    if (s.method === "apikey") body = '<div class="field"><label for="key">' + esc(s.keyLabel) + '</label><input class="input" id="key" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste your token"></div>' +
      '<p class="small muted" style="margin:8px 0 0">' + esc(s.keyHelp) + '</p><div class="note" style="margin-top:12px">' + I("key") + '<div>Demo: the token is stored only on this device (localStorage) and never sent anywhere. It\'s an API token, never your password.</div></div>';
    else if (s.method === "oauth") body = '<ol class="vsteps"><li><span class="sn">1</span><div><b>Continue to the official eBay sign-in</b><span>You sign in on eBay\'s own page. CardHound never sees your password.</span></div></li><li><span class="sn">2</span><div><b>Approve access</b><span>Watchlist, saved searches and listings. Look only: CardHound never bids or buys.</span></div></li></ol>';
    openSheet(top + '<h2>Connect your ' + esc(s.name) + '</h2><p class="muted small" style="margin:0">' + esc(s.blurb) + '</p>' + body + safe + unl +
      '<div class="cta-stack"><button class="btn btn-gold" id="sim">' + I(s.method === "apikey" ? "key" : "plug") + (s.method === "apikey" ? "Save token (demo)" : "Continue with eBay (simulated)") + '</button></div>' +
      '<p class="small dim" style="text-align:center;margin-top:12px">Demo: connections are simulated. Prices stay sample data.</p>', function () {
        document.getElementById("sim").onclick = function () {
          if (s.method === "apikey") { var k = document.getElementById("key").value.trim(); if (k.length < 6) { toast("Paste your token first."); return; } state.keys[id] = k.slice(-4); }
          state.conn[id] = true; saveConn(); connectSheet(id);
        };
      });
  }

  /* MORE / CONNECTIONS / TOOLS */
  function moreScreen() {
    var tools = [["ledger", "ledger", "Ledger", "Every buy: card, from, cost, status"], ["ledger/portfolio", "wallet", "Portfolio", "Cost basis, value, gain after fees"], ["connections", "plug", "Connections", "Import, eBay, PSA and what's next"], ["tool/fees", "calc", "Fee and net calculator", "What you keep after eBay fees"], ["tool/roi", "layers", "Grading ROI calculator", "Raw vs PSA 8, 9, 10 after fees"],
      ["tool/variant", "list", "Is this the exact variant?", "Parallel, refractor, reprint, slab label"], ["tool/offer", "handshake", "Best Offer helper", "Suggested offer and walk-away price"], ["tool/alerts", "bell", "Price alerts", "Under-comp alerts for your watchlist"]];
    if (window.CH_APP && window.CH_APP.moreItemsTop && window.CH_APP.moreItemsTop.length) tools = window.CH_APP.moreItemsTop.concat(tools);
    view.innerHTML = '<div class="eyebrow">More</div><h1 class="h1" style="font-size:30px">Tools and <em>connections</em></h1>' +
      tools.map(function (t) { return '<a class="tool" href="#/' + t[0] + '"><span class="tic">' + I(t[1]) + '</span><span class="tt"><b>' + t[2] + '</b><span>' + t[3] + '</span></span>' + I("right") + '</a>'; }).join("") +
      '<div class="sec card gold boom-promo"><div class="row between"><span class="h3" style="color:var(--gold2)">BOOM! New high comps</span><span class="chip demo">SAMPLE</span></div><p class="small muted" style="margin:8px 0 12px">An alert when a card\'s newest sale is its all-time or 90-day high for that exact variant and grade.</p><div style="display:grid;gap:8px"><button class="btn btn-gold btn-sm" id="boom-pv" style="width:100%">' + I("spark") + 'Preview BOOM alert</button><button class="btn btn-ghost btn-sm" id="boom-st" style="width:100%">' + I("bell") + 'Alert settings</button></div><a class="link-btn" href="#/markets/highs" style="margin-top:12px">New Highs list ' + I("right") + '</a></div>' +
      '<div class="sec card"><div class="h3" style="margin-bottom:8px">About this demo</div><p class="small muted" style="margin:0">Data source: <b style="color:var(--text)">' + esc(D.name) + '</b>. Every price, count, trend and odds value is invented sample data. Nothing is bought, bid, offered or sent.</p></div>' + footer();
    var bp = document.getElementById("boom-pv"); if (bp && BOOM) bp.onclick = function () { BOOM.preview(); };
    var bs = document.getElementById("boom-st"); if (bs && BOOM) bs.onclick = function () { BOOM.settingsSheet(); };
  }
  function statusPill(s) {
    if (isConnected(s.id)) return '<span class="status st-on">' + (s.id === "import" ? "Imported (demo)" : "Connected (demo)") + '</span>';
    return { available: '<span class="status st-off">Not connected</span>', coming: '<span class="status st-soon">Coming soon</span>', partner: '<span class="status st-soon">Pending partnership</span>', na: '<span class="status st-off">Not available yet</span>', importonly: '<span class="status st-soon">Import only</span>' }[s.status] || "";
  }
  function connectionsScreen() {
    var groups = [["Connect now", ["import", "ebay", "psa"]], ["On the way", ["companion", "cardladder"]], ["Import only or not available yet", ["collx", "marketmovers", "pricecharting", "cardhedge", "tcgplayer", "130point"]]];
    view.innerHTML = '<div class="eyebrow">Connections</div><h1 class="h1" style="font-size:30px">Bring your <em>own</em> accounts</h1>' +
      '<p class="lead">Import your collection, sign in with eBay, or paste your own PSA token. Never a password, never cookies, never scraping.</p>' +
      groups.map(function (g) {
        return '<div class="group-h"><h3 class="h3">' + g[0] + '</h3></div>' + g[1].map(function (id) {
          var s = srcById(id), on = isConnected(id);
          return '<button class="tool" data-connect="' + s.id + '"><span class="srcmono ' + (on ? "on" : "") + '">' + esc(s.mono) + '</span><span class="tt"><b>' + esc(s.name) + '</b><span>' + esc(s.how) + '</span></span>' + statusPill(s) + '</button>';
        }).join("");
      }).join("") +
      '<div class="note" style="margin-top:16px">' + I("shield") + '<div>This shared demo always runs on sample data, connected or not. Connections are simulated and stored only on this device.</div></div>' + footer();
  }
  function toolScreen(p) {
    var t = p.sub, back = '<a class="link-btn" href="#/more">' + I("left") + 'More</a>';
    var hd = function (eb, title) { return back + '<div class="eyebrow" style="margin-top:14px">' + eb + '</div><h1 class="h1" style="font-size:30px">' + title + '</h1>'; };
    var num = function (i) { return parseFloat(document.getElementById(i).value) || 0; };
    var f2 = function (id, l, v) { return '<div class="field"><label for="' + id + '">' + l + '</label><input class="input num" id="' + id + '" inputmode="decimal" value="' + v + '"></div>'; };
    if (t === "fees") {
      view.innerHTML = hd("Calculator", "Fee and <em>net</em>") + '<div class="card">' + f2("fp", "Sale price", 184) + '<div class="grid2">' + f2("ff", "eBay fee %", 13.25) + f2("fs", "Shipping cost", 5) + '</div>' + f2("fc", "Your cost", 120) + '</div><div class="card gold" style="margin-top:12px" id="fo"></div>' +
        '<p class="small dim" style="margin-top:10px">Sample fee model: % of sale plus $0.40 per order. Check your own eBay fee category.</p>' + footer();
      var calc = function () { var pr = num("fp"), fee = pr * num("ff") / 100 + 0.40, net = pr - fee - num("fs"), prof = net - num("fc");
        document.getElementById("fo").innerHTML = '<dl class="kv"><dt>eBay fees</dt><dd class="num">\u2212' + money(fee, true) + '</dd><dt>Shipping</dt><dd class="num">\u2212' + money(num("fs"), true) + '</dd><dt>You keep</dt><dd class="num" style="font-size:20px;color:var(--gold2)">' + money(net, true) + '</dd><dt>Profit</dt><dd class="num ' + (prof >= 0 ? "pill-up" : "pill-down") + '">' + money(prof, true) + '</dd></dl>'; };
      view.querySelectorAll("input").forEach(function (i) { i.oninput = calc; }); calc();
    } else if (t === "roi") {
      view.innerHTML = hd("Calculator", "Grading <em>ROI</em>") + '<div class="card"><div class="grid2">' + f2("r0", "Raw value", 184) + f2("rg", "Grading + ship", 88) + '</div><div class="grid2">' + f2("r8", "PSA 8 comp", 255) + f2("r9", "PSA 9 comp", 525) + '</div><div class="grid2">' + f2("r10", "PSA 10 comp", 1975) + f2("ro", "PSA 10 odds %", 15) + '</div></div>' +
        '<div class="card gold" style="margin-top:12px" id="ro2"></div><p class="small dim" style="margin-top:10px">Sample values prefilled. PSA 9 odds 40%, the rest PSA 8. Odds are your estimate; 13.25% + $0.40 eBay fee assumed.</p>' + footer();
      var c2 = function () {
        var n = function (c) { return c * 0.8675 - 0.40 - num("rg"); }, rawN = num("r0") * 0.8675 - 0.40, o10 = Math.min(1, num("ro") / 100), o9 = Math.min(1 - o10, 0.4), o8 = Math.max(0, 1 - o10 - o9);
        var ev = n(num("r10")) * o10 + n(num("r9")) * o9 + n(num("r8")) * o8;
        document.getElementById("ro2").innerHTML = '<dl class="kv"><dt>Sell raw, net</dt><dd class="num">' + money(rawN) + '</dd><dt>PSA 8 net</dt><dd class="num">' + money(n(num("r8"))) + '</dd><dt>PSA 9 net</dt><dd class="num">' + money(n(num("r9"))) + '</dd><dt>PSA 10 net</dt><dd class="num">' + money(n(num("r10"))) + '</dd>' +
          '<dt>Expected net<span class="tag-est">ESTIMATE</span></dt><dd class="num" style="font-size:20px;color:var(--gold2)">' + money(ev) + '</dd><dt>Grade vs sell raw</dt><dd class="num ' + (ev - rawN >= 0 ? "pill-up" : "pill-down") + '">' + (ev - rawN >= 0 ? "+" : "") + money(ev - rawN) + '</dd></dl>';
      };
      view.querySelectorAll("input").forEach(function (i) { i.oninput = c2; }); c2();
    } else if (t === "variant") {
      var items = ["Card number matches (e.g. T247)", "Chrome stock, not paper: check the shine and the back", "Base vs Refractor: tilt it; refractors show a rainbow sheen", "No serial number stamp (numbered parallels are a different card)", "Back copyright line and font match a known real copy", "Edges and gloss look factory, not reprinted", "If slabbed: label year, set, # and variant all match", "Cert number checks out on the grader's site"];
      view.innerHTML = hd("Checklist", "Is this the <em>exact</em> variant?") + '<div class="card">' + items.map(function (x, i) { return '<label class="row" style="gap:12px;padding:11px 0;' + (i ? "border-top:1px solid var(--line);" : "") + 'align-items:flex-start;font-size:14px"><input type="checkbox" class="vc" style="width:20px;height:20px;accent-color:#e3bd6a;flex:none;margin-top:1px"><span>' + x + '</span></label>'; }).join("") + '</div>' +
        '<div class="card gold" style="margin-top:12px;text-align:center" id="vo"></div>' + gate("cert") + footer();
      var upd = function () { var n = view.querySelectorAll(".vc:checked").length; document.getElementById("vo").innerHTML = '<div class="countdown num">' + n + ' / ' + items.length + '</div><div class="small muted">' + (n === items.length ? "Looks like the exact variant. Still verify the cert." : "Keep checking before you buy or grade.") + '</div>'; };
      view.querySelectorAll(".vc").forEach(function (c) { c.onchange = upd; }); upd();
    } else if (t === "offer") {
      Promise.all([D.getDeals(), D.getGems()]).then(function (res) {
        state._deals = res[0].concat(res[1]);
        view.innerHTML = hd("Best Offer", "Offer <em>helper</em>") + '<p class="lead">Pick a Best Offer listing (sample). You send the offer yourself on eBay.</p>' + res[0].filter(function (d) { return d.type === "Best Offer"; }).map(function (d) { return dealCard(d); }).join("") + footer();
      });
    } else if (t === "alerts") {
      var al = function (t1, t2, on) { return '<div class="lrow" style="grid-template-columns:22px 1fr auto"><span style="color:var(--gold)">' + I("bell") + '</span><div class="nm"><b>' + t1 + '</b><span>' + t2 + '</span></div><span class="chip ' + (on ? "gold" : "") + '">' + (on ? "On" : "Off") + '</span></div>'; };
      view.innerHTML = hd("Alerts", "Price <em>alerts</em>") + '<div class="card">' + al("Pujols T247 Chrome raw", "Buy under $135 · sell over $210 (sample)", true) + al("Wembanyama Prizm #136 raw", "Buy under $90 (sample)", true) + al("Any watchlist listing", state.alerts.threshold + "% or more under comp", state.alerts.on) + al("New high comps (BOOM!)", "All-time and 90-day highs, exact variant only", true) + '</div>' +
        '<div class="grid2" style="margin-top:12px"><button class="btn btn-ghost btn-sm" id="aboom" style="width:100%">' + I("spark") + 'Preview BOOM alert</button><button class="btn btn-ghost btn-sm" id="anh" style="width:100%">' + I("bell") + 'New-high settings</button></div>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="aset">' + I("sliders") + 'Alert settings</button></div>' + gate("alerts") + '<p class="small dim" style="margin-top:10px">Demo: nothing is sent.</p>' + footer();
      document.getElementById("aset").onclick = alertSheet;
      if (BOOM) { document.getElementById("aboom").onclick = function () { BOOM.preview(); }; document.getElementById("anh").onclick = function () { BOOM.settingsSheet(); }; }
    } else moreScreen();
  }

  var BOOM = null, VOICE = null;
  var ROUTES = { scan: scanScreen, analyze: analyzeScreen, match: matchScreen, report: reportScreen, markets: marketsScreen, deals: dealsScreen, more: moreScreen, connections: connectionsScreen, tool: toolScreen };
  BOOM = window.CH_BOOM ? window.CH_BOOM({ D: D, I: I, esc: esc, money: money, toast: toast, openSheet: openSheet, closeSheet: closeSheet, parseHash: parseHash }) : null;
  window.CH_BOOM_UI = BOOM;
  if (window.CH_LEDGER) ROUTES.ledger = window.CH_LEDGER({ view: view, D: D, I: I, esc: esc, money: money, pct: pct, toast: toast, footer: footer, openSheet: openSheet, closeSheet: closeSheet, isConnected: isConnected, gate: gate, parseHash: parseHash, go: go });

  /* Hooks for the voice / prompt assistant (js/voice.js). Add-only: other screens keep working without it. */
  window.CH_APP = { state: state, LS: LS, D: D, I: I, esc: esc, money: money, pct: pct, toast: toast, footer: footer, openSheet: openSheet, closeSheet: closeSheet, parseHash: parseHash, go: go, view: view, gate: gate,
    addSnipe: function (s) { state.snipes.unshift(s); saveSnipes(); },
    setScope: function (list, v, val) { if (state.scopes[list]) state.scopes[list] = { view: v || "overall", value: val || null }; },
    setMoversDir: function (d) { state.moversDir = d === "down" ? "down" : "up"; },
    lastCard: function () { return LS.get("lastCard", null); }, setLastCard: function (c) { LS.set("lastCard", c); },
    alertSheet: alertSheet, boom: BOOM, ledger: ROUTES.ledger,
    /* Add-only hooks for wrappers (the native app in ../app): extra routes, extra More items, a photo from a native camera. */
    addRoute: function (name, fn) { if (!ROUTES[name]) ROUTES[name] = fn; },
    setRoute: function (name, fn) { ROUTES[name] = fn; },   /* replace a screen (the private live server uses this for real-price search + report) */
    rerender: function () { go(); },
    moreItemsTop: [],
    setPhoto: function (url) { if (state.photo && state.photo.indexOf("blob:") === 0) URL.revokeObjectURL(state.photo); state.photo = url; if (parseHash().route === "scan") scanScreen(); } };
  if (window.CH_VOICE) { VOICE = window.CH_VOICE(window.CH_APP); ROUTES.ask = VOICE.screen; window.CH_VOICE_UI = VOICE; }
  /* Wrappers (e.g. the native app) can queue functions in window.CH_APP_PLUGINS before app.js loads; each gets CH_APP once. */
  (window.CH_APP_PLUGINS || []).forEach(function (fn) { try { fn(window.CH_APP); } catch (e) { if (window.console) console.error(e); } });

  function bindGlobal(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-connect],[data-snipe],[data-offer],[data-alert],[data-toast]"); if (!b || !root.contains(b)) return;
      if (b.dataset.connect) { e.preventDefault(); connectSheet(b.dataset.connect); }
      else if (b.dataset.snipe) snipeSheet(b.dataset.snipe);
      else if (b.dataset.offer) offerSheet(b.dataset.offer);
      else if (b.dataset.alert) alertSheet();
      else if (b.dataset.toast) toast(b.dataset.toast);
    });
  }
  bindGlobal(view);
  window.addEventListener("hashchange", go);
  D.meta().then(function (m) { state.meta = m; go(); });
})();
