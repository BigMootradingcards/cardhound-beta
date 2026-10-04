/* CardHound live layer (friends-beta copy): search, photo and the report through the CardHound API. Beta prices are SAMPLE data. */
(function () {
  "use strict";
  var CFG = window.CH_LIVE_CFG || { live: false };
  var BUY_RULE = 0.65; function TN() { return (window.CH_LIVE_CFG || {}).thinN || 12; }
  var LIVE_ROUTES = { ask: 1, report: 1, analyze: 1, lresults: 1, about: 1, scan: 1, pro: 1, legal: 1, match: 1 };
  var KNOWN_ROUTES = { scan: 1, analyze: 1, match: 1, report: 1, markets: 1, deals: 1, ledger: 1, more: 1, connections: 1, tool: 1, ask: 1, lresults: 1, about: 1, pro: 1, legal: 1 };
  var SAMPLE_NOTE = { markets: "Sample prices · Movers, New Highs and Most Searched",
    deals: "Sample prices · Hidden Gems and Deals", ledger: "Your Ledger · stored on this phone · values use sample comps",
    tool: "Sample on this screen · eBay is look-only: CardHound never bids or buys", connections: "Connections · nothing here sends data anywhere yet",
    more: "CardHound Beta · sample prices for testing" };
  var S = { resp: null, cur: null };
  try { var saved = JSON.parse(sessionStorage.getItem("ch_live_last") || "null"); if (saved) { S.resp = saved.resp; S.cur = saved.cur; } } catch (e) {}
  function save() { try { sessionStorage.setItem("ch_live_last", JSON.stringify({ resp: S.resp, cur: S.cur })); } catch (e) {} }

  function api(path, body, type) {
    var o = { method: body === undefined ? "GET" : "POST", credentials: "same-origin", headers: {} };
    if (body !== undefined) { if (type) { o.body = body; o.headers["Content-Type"] = type; } else { o.body = JSON.stringify(body); o.headers["Content-Type"] = "application/json"; } }
    return fetch(path, o).then(function (r) {
      if (r.status === 401) { location.href = "/login"; throw new Error("locked"); }
      return r.json().catch(function () { return { error: "Unexpected reply from the server." }; }).then(function (j) { if (!r.ok && !j.results) throw new Error(j.error || ("HTTP " + r.status)); return j; });
    });
  }

  (window.CH_APP_PLUGINS = window.CH_APP_PLUGINS || []).push(function (U) {
    var I = U.I, esc = U.esc, view = U.view, toast = U.toast;
    if (U.boom && U.boom.maybeAuto) U.boom.maybeAuto = function () {};   /* no auto-popping SAMPLE BOOM alerts in live mode (Preview still works) */
    function money(v) { if (v == null || isNaN(v)) return "—"; var a = Math.abs(v), s = a >= 1000 ? Math.round(a).toLocaleString("en-US") : a.toFixed(a % 1 ? 2 : 0); return (v < 0 ? "\u2212$" : "$") + s; }
    function foot() { return '<div class="foot"><b>CardHound Beta · sample prices.</b><br>Every price here is made up for testing. Exact-variant matching. Estimates and opinions, not financial advice.</div>'; }
    function compsOf(r) { return r.comps || {}; }

    /* ---------- Free vs Pro (see out/pricing/FREE_VS_PRO.md). This private link is the owner's admin account: always Pro.
     * "Preview the free plan" (Settings, or ?plan=free) shows exactly what a free account sees. Real enforcement lives on the
     * CardHound API server (cardhound_api/plans.py); this is the same rule drawn on screen. Prices are a PROPOSAL, not final. ---------- */
    var PK = "ch_plan_preview", FREE_DAILY = 10, PRICE = { monthly: "$19.99", yearly: "$199.99", yearlyPerMo: "$16.67" };
    try { var qp = new URLSearchParams(location.search).get("plan"); if (qp === "free" || qp === "pro") sessionStorage.setItem(PK, qp); } catch (e) {}
    function isFree() { try { return sessionStorage.getItem(PK) === "free"; } catch (e) { return false; } }
    function setFree(on) { try { sessionStorage.setItem(PK, on ? "free" : "pro"); } catch (e) {} }
    function etDay() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); }
    function usedToday() { try { var u = JSON.parse(localStorage.getItem("ch_free_used") || "{}"); return u.d === etDay() ? u.n || 0 : 0; } catch (e) { return 0; } }
    function useOne() { try { localStorage.setItem("ch_free_used", JSON.stringify({ d: etDay(), n: usedToday() + 1 })); } catch (e) {} }
    function capHit() { if (!isFree() || usedToday() < FREE_DAILY) return false; S.proWhy = "cap"; location.hash = "#/pro"; return true; }
    var PRO_LOCK = {
      markets: ["Movers, New Highs & Most Searched", "See which cards are moving before you buy."],
      deals: ["Hidden Gems & Deals", "Cards selling under their comps, found for you."],
      ledger: ["Portfolio & Ledger", "Every card you own, valued on sold comps."],
      tool: ["Sniper & pro tools", "Max-bid math and reminders. You always place the bid."] };
    function lockView(route) {
      var L = PRO_LOCK[route]; if (!L || !isFree() || view.querySelector(".pl-lock")) return;
      var inner = view.innerHTML;
      view.innerHTML = '<div class="pl-lock"><div class="pl-blur" aria-hidden="true" inert>' + inner + '</div>' +
        '<a class="pl-gate" href="#/pro" data-pro="' + esc(route) + '"><span class="pl-gi">' + I("lock") + '</span><span class="pl-ge">CardHound Pro</span>' +
        '<b class="pl-gt">' + esc(L[0]) + '</b><span class="pl-gs">' + esc(L[1]) + '</span><span class="pl-gb">See CardHound Pro' + I("right") + '</span></a></div>';
      view.querySelector(".pl-lock").onclick = function (e) { e.preventDefault(); S.proWhy = route; location.hash = "#/pro"; };
    }
    function target(r) { var c = compsOf(r); if (r.grade && c[r.grade]) return r.grade; var k = Object.keys(c).filter(function (g) { return c[g].median != null; }); return k[0] || r.grade || null; }
    /* the real card a report is about (identity only): sent with "add this to my watchlist", grade tabs, watch / snipe */
    function cardOf(r) { if (!r) return undefined; return { card_id: r.card_id, feed_card_id: r.feed_card_id, name: r.name, year: r.year, set: r.set, player: r.player, card_number: r.card_number,
      variant: r.variant, subset: r.subset, category: r.category, grade: r.grade, description: r.description, image: (r.image || {}).url || null }; }
    function rdJ(k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } }
    function wrJ(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function watchLocal(c, g) { var a = rdJ("ch_voice_watch"), nm = (c.name || c.card_id) + (g ? " · " + (g === "RAW" ? "Raw" : g) : "");   /* the Watchlist tab reads this */
      if (!a.some(function (w) { return w.card === nm; })) a.unshift({ id: "vw" + Date.now(), card: nm, card_id: c.card_id, feed_card_id: c.feed_card_id || null, grade: g || null, source: "live", added: new Date().toISOString() });
      wrJ("ch_voice_watch", a); }
    function ebayLive(r, g) { return ebayUrl(r, g).replace("&LH_Sold=1&LH_Complete=1", "&LH_Auction=1&_sop=1"); }   /* live auctions, ending soonest: look only */
    function ebayUrl(r, g) { var q = [r.year, r.set, r.card_number ? "#" + r.card_number : "", r.player, r.variant && r.variant !== "Base" ? r.variant : "", g && g !== "RAW" ? g : ""].filter(Boolean).join(" "); return "https://www.ebay.com/sch/i.html?_nkw=" + encodeURIComponent(q) + "&LH_Sold=1&LH_Complete=1"; }

    /* ---------- the call: fixed, transparent rules on real comps only ---------- */
    /* the price the call and bands stand on: the median of the last 5-10 sales (one-off sales excluded, server-side),
     * falling back to the window median when there are fewer than 3 recent sales */
    function basisOf(r, g) { var c = compsOf(r)[g] || {}, rc = (r.recent_by_grade || {})[g];
      return rc && rc.median != null ? { m: rc.median, n: rc.n, label: "median of the last " + rc.n + " sales" } : { m: c.median, n: c.n || 0, label: (c.window_days || 30) + "-day median of " + (c.n || 0) + " sales" }; }
    function theCall(r, price) {
      var g = target(r), c = compsOf(r)[g] || {}, n = c.n || 0, bs = basisOf(r, g), m = c.median != null ? bs.m : null;
      if (m == null) return { word: "NO CALL", cls: "HOLD", short: "No sales yet", why: "No exact-variant sales for " + (g || "this grade") + " yet, so there's nothing honest to call." };
      if (n < TN()) return { word: "HOLD", cls: "HOLD", short: "Too few sales to call", why: "Only " + n + " sales for " + g + " (under " + TN() + "). Too thin to call: wait for more comps.", thin: true };
      var buyMax = m * BUY_RULE;
      if (price != null) {
        if (price <= buyMax) return { word: "BUY", cls: "BUY", short: money(price) + " is a good price", tone: "up", why: money(price) + " is at or under " + money(buyMax) + " (65% of the " + g + " " + bs.label + ", " + money(m) + ")." };
        if (price >= m) return { word: "PASS", cls: "SELL", short: money(price) + " is too high", tone: "down", why: money(price) + " is at or above the " + g + " " + bs.label + " (" + money(m) + "). No edge buying here." };
        return { word: "HOLD", cls: "HOLD", short: "Wait for a better price", why: money(price) + " is between the buy line " + money(buyMax) + " and the " + bs.label + " (" + money(m) + "). Wait for a better price." };
      }
      return { word: "BANDS", cls: "BANDS", buyMax: buyMax, median: m, g: g, short: "Tell me your price for one call", basis: bs.label, why: "Give me your price (\"…under $X\") for a single call. Bands from the " + g + " " + bs.label + " (" + money(m) + "), one-off sales left out." };
    }

    /* ---------- result cards ---------- */
    function thumb(r) { var u = r.image && r.image.url; if (!u) { var sg = (r.sales_by_grade || {})[target(r)] || []; u = (sg[0] || {}).image; }
      return u && /^https:\/\//.test(u) ? '<img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer" loading="lazy">' : '<div class="lv-ph">' + I("report") + '</div>'; }
    function resultCard(r, i) {
      var g = target(r), c = compsOf(r)[g] || {}, m = r.match || {}, thin = c.median != null && (c.n || 0) < TN();
      return '<button class="lv-res card" data-lv="open" data-i="' + i + '"><div class="lv-th">' + thumb(r) + '</div><div class="lv-rb">' +
        '<b>' + esc(r.name || r.card_id) + '</b><div class="lv-chips"><span class="sig ' + (m.exact ? "sig-good" : "sig-warn") + '">' + (m.exact ? "Exact" : "Closest match, not exact") + (m.confidence != null ? " " + m.confidence + "%" : "") + '</span>' +
        (g ? '<span class="chip">' + esc(g) + '</span>' : "") + (thin ? '<span class="sig sig-bad">Thin comps</span>' : "") + ((r.verified || {}).status === "verified" ? '<span class="sig sig-good">Verified</span>' : "") + '</div>' +
        '<div class="lv-px"><span class="num">' + (c.median != null ? money(c.median) : "no sales yet") + '</span><small>' + (c.median != null ? "median · " + c.n + " sales · " + c.window_days + "d" : "exact variant") + '</small></div></div>' + I("right") + '</button>';
    }
    function renderResp(d, box) {
      var h = "";
      (d.live_errors || []).forEach(function (e) { h += '<div class="sig-box bad">' + I("shield") + '<div>Lookup: ' + esc(e.op || "") + " " + esc(e.error || e.status || "") + '</div></div>'; });
      if (d.clarify) {
        h += '<div class="card lv-q"><div class="eyebrow">One quick question</div><p><b>' + esc(d.clarify.question) + '</b></p><div class="vq-opts">' +
          d.clarify.options.map(function (o) { return '<button class="btn btn-ghost btn-xs" data-lv="clar" data-t="' + esc(o) + '">' + esc(o) + '</button>'; }).join("") + '</div></div>';
      }
      if (d.pending_confirm) {
        var p = d.pending_confirm;
        h += '<div class="card lv-q"><div class="eyebrow">Needs your OK</div><p><b>' + esc(p.kind) + " · " + money(p.amount) + '</b></p><p class="small muted">Fair max ' + money(p.fair_max) + (p.above_fair_max ? ' · <span class="sig sig-bad">Above fair max</span>' : "") + '. Simulated: nothing is sent to eBay.</p><button class="btn btn-gold btn-sm" data-lv="confirm" data-t="' + esc(p.token) + '">Confirm (simulated)</button></div>';
      }
      if (d.watch_card) h += '<div class="card lv-q"><div class="eyebrow">Watchlist</div><p><b>' + esc(d.say || "") + '</b></p><a class="btn btn-ghost btn-xs" href="#/deals/watch">Open your watchlist</a></div>';
      if (d.ledger_draft) { var LD = d.ledger_draft; S.ldraft = LD;
        h += '<div class="card lv-q"><div class="eyebrow">Needs your OK</div><p><b>' + esc(LD.name || "") + ' · ' + esc(LD.grade === "RAW" ? "Raw" : LD.grade || "") + '</b></p>' +
          '<label class="lv-sl">You paid ($)<input id="lv-lpaid" class="lv-in" type="number" inputmode="decimal" min="0" step="0.01" value="' + (LD.price != null ? esc(LD.price) : "") + '"></label>' +
          '<button class="btn btn-gold btn-sm" data-lv="ledger">Add to my Ledger</button><p class="small dim">Saved on this phone only after you tap Add.</p></div>'; }
      var rs = d.results || [];
      if (rs.length) h += '<div class="sec-head" style="margin-top:6px"><h3 class="h3">' + (rs.length === 1 ? "Match" : rs.length + " matches") + '</h3><span class="chip lv-real bt-pill">Sample prices</span></div>' + rs.map(resultCard).join("");
      else if (!d.clarify && !d.pending_confirm && !d.watch_card && !d.ledger_draft) h += '<div class="card lv-empty"><b>No exact card found.</b><p class="small muted">Try year, set, card number and player, e.g. "1996 Topps Chrome Kobe Bryant 138 PSA 9". CardHound only shows exact-variant matches.</p></div>';
      box.innerHTML = h;
    }
    function bindResp(box) {
      box.onclick = function (e) {
        var b = e.target.closest("[data-lv]"); if (!b) return;
        var v = b.dataset.lv;
        if (v === "open") { S.cur = (S.resp.results || [])[+b.dataset.i]; save(); location.hash = "#/report"; }
        else if (v === "clar") search((S.lastQ || "") + " " + b.dataset.t);
        else if (v === "ledger") { var LD = S.ldraft, pd = parseFloat((document.getElementById("lv-lpaid") || {}).value);
          if (!LD || !(pd >= 0)) { toast("Enter what you paid first."); return; }
          if (U.D && U.D.addLedgerRow) U.D.addLedgerRow({ card: (LD.name || LD.card_id) + (LD.grade ? " · " + LD.grade : ""), card_id: LD.card_id, grade: LD.grade, price: pd, from: "CardHound live", status: "bought" })
            .then(function () { b.textContent = "Added to your Ledger"; b.disabled = true; toast("Added to your Ledger."); }); }
        else if (v === "confirm") api("/api/live/confirm", { token: b.dataset.t }).then(function (c) { b.textContent = c.status || "Done"; b.disabled = true; }, function (er) { toast(er.message); });
      };
    }

    /* ---------- search (Ask) ---------- */
    var EX = ["1996 Topps Chrome Kobe Bryant 138 PSA 9", "2001 Topps Chrome Traded Pujols T247 raw", "2018 Prizm Luka Doncic 280 PSA 10", "Kobe Topps Chrome 138 PSA 9 under $3,500"];
    function loading(box, text) { box.innerHTML = '<div class="card lv-load"><div class="lv-spin"></div><div><b>' + esc(text) + '</b><span class="small muted">Exact variant · sample sold comps</span></div></div>'; }
    function search(q) {
      q = String(q || "").trim();
      if (!q) { var hb = document.getElementById("lv-out"), hi = document.getElementById("lv-in");
        if (hb) hb.innerHTML = '<div class="card lv-empty"><b>Type a card to check.</b><p class="small muted">Year, set, card number, player and grade, e.g. "' + esc(EX[0]) + '". Or tap the camera to scan it.</p></div>';
        else toast("Type a card first: year, set, number, player and grade."); if (hi) hi.focus(); return; }
      S.lastQ = q; if (U.parseHash().route !== "ask") { S.pending = q; location.hash = "#/ask"; return; }
      if (capHit()) return;
      var inp = document.getElementById("lv-in"); if (inp) inp.value = q;
      var box = document.getElementById("lv-out"); loading(box, "Finding the exact card…");
      api("/api/live/ask", { text: q, session: S.sid, card: cardOf(S.cur) }).then(function (d) { S.sid = d.session || S.sid;
        if (d.route) { toast(d.say || "Opening the list"); location.hash = d.route; return; }          /* "top movers", "buy hold sell list": that screen, no card search */
        if (d.watch_card) watchLocal(d.watch_card, d.watch_card.grade);
        if (d.watch_card || d.ledger_draft) { renderResp(d, box); return; }
        S.resp = d; S.q = q; save(); var r0 = d.results && d.results[0]; if (isFree()) useOne();
        if (r0 && !d.clarify && (d.results.length === 1 || (r0.match || {}).exact) && Object.keys(r0.comps || {}).length) { S.cur = r0; S.tab = null; save(); location.hash = "#/report"; return; }
        renderResp(d, box); },
        function (er) { box.innerHTML = '<div class="sig-box bad">' + I("shield") + '<div>' + esc(er.message) + '</div></div>'; });
    }
    function askScreen() {
      view.innerHTML = '<div class="lv-head"><div class="eyebrow">Search · voice · photo</div><h1 class="h1" style="font-size:31px">Ask <em>CardHound</em></h1>' +
        '<p class="lead">Name the card. Sold comps for the exact variant, by grade. Sample prices in the beta.</p></div>' +
        '<form class="lv-bar card" id="lv-f" autocomplete="off"><input id="lv-in" class="lv-in" type="search" enterkeyhint="search" placeholder="Year, set, #, player, grade" aria-label="Card to look up">' +
        '<button type="button" class="lv-ib" id="lv-mic" aria-label="Speak">' + I("mic") + '</button><button type="button" class="lv-ib" id="lv-cam" aria-label="Photo">' + I("camera") + '</button><button class="lv-go" type="submit" aria-label="Search">' + I("search") + '</button></form>' +
        '<div class="lv-ex">' + EX.map(function (e) { return '<button class="chip" data-ex="' + esc(e) + '">' + esc(e) + '</button>'; }).join("") + '</div>' +
        '<div id="lv-out"></div>' + foot();
      var box = document.getElementById("lv-out"); bindResp(box);
      document.getElementById("lv-f").onsubmit = function (e) { e.preventDefault(); search(document.getElementById("lv-in").value); };
      view.querySelectorAll("[data-ex]").forEach(function (b) { b.onclick = function () { search(b.dataset.ex); }; });
      document.getElementById("lv-mic").onclick = function () { listen(); };
      document.getElementById("lv-cam").onclick = function () { var f = document.getElementById("lv-photo"); if (f) f.click(); else location.hash = "#/scan"; };
      if (S.pending) { var q = S.pending; S.pending = null; search(q); }
      else if (S.resp) { document.getElementById("lv-in").value = S.q || ""; renderResp(S.resp, box); }
    }

    /* ---------- voice: Safari / Chrome speech recognition; the typed box always works ---------- */
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
    function listen() {
      if (!SR) { toast("Voice isn't available in this browser. Type instead."); return; }
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; var fin = "";
      document.body.classList.add("lv-listening"); toast("Listening… say the card");
      rec.onresult = function (e) { var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; fin = t; var inp = document.getElementById("lv-in"); if (inp) inp.value = t; };
      rec.onerror = function (e) { if (e.error === "not-allowed" || e.error === "service-not-allowed") toast("Mic blocked. Allow the microphone for this site, or type."); };
      rec.onend = function () { rec = null; document.body.classList.remove("lv-listening"); if (fin.trim()) search(fin); };
      try { rec.start(); } catch (er) { rec = null; document.body.classList.remove("lv-listening"); }
    }
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest('#vc-fab, [data-v="mic"]');
      if (!t) return; e.preventDefault(); e.stopImmediatePropagation();
      if (U.parseHash().route !== "ask") location.hash = "#/ask"; setTimeout(listen, 50);
    }, true);

    /* ---------- photo lookup with the analyzing screen ---------- */
    function analyzeScreen() {
      var ph = U.state.photo;
      if (!ph) { location.replace("#/scan"); return; }          /* opened directly with no photo: back to Check, never a sample lookup */
      if (capHit()) return;
      var steps = [["Reading the card", "Year, set, number, player"], ["Matching the exact variant", "Catalog match"], ["Pulling sold comps", "Sample sales by grade"], ["Making the call", "Fixed rules, shown in full"]];
      view.innerHTML = '<div class="an-wrap"><div class="an-photo"><img src="' + ph + '" alt="Your card photo"><div class="shade"></div><div class="grid-ov"></div><div class="sweep"></div><div class="corners" style="position:absolute;inset:16px"><i></i><i></i><i></i><i></i></div></div>' +
        '<div><h1 class="an-title">CardHound is analyzing<span class="dots"></span></h1><p class="muted small" style="margin:4px 0 0">Sample prices · exact variant only</p></div>' +
        '<ol class="an-steps" id="lv-steps">' + steps.map(function (s) { return '<li><span class="dot">' + I("check") + '</span><span><span class="lbl">' + s[0] + '</span><span class="sub">' + s[1] + '</span></span></li>'; }).join("") + '</ol></div>' + foot();
      var lis = view.querySelectorAll("#lv-steps li"), k = 0, tick = setInterval(function () { if (k < lis.length - 1) lis[k++].classList.add("done"); }, 900);
      (S.file && S.fileUrl === ph ? Promise.resolve(S.file) : fetch(ph).then(function (r) { return r.blob(); })).then(function (b) { return api("/api/live/photo" + (S.sid ? "?session=" + encodeURIComponent(S.sid) : ""), b, b.type || "image/jpeg"); })
        .then(function (d) { clearInterval(tick); lis.forEach(function (l) { l.classList.add("done"); }); S.sid = d.session || S.sid; S.resp = d; S.q = "Photo lookup"; save(); if (isFree()) useOne();
          setTimeout(function () { if (d.results && d.results.length === 1) { S.cur = d.results[0]; S.tab = null; save(); location.hash = "#/report"; } else location.hash = "#/lresults"; }, 500); },
          function (er) { clearInterval(tick); view.insertAdjacentHTML("afterbegin", '<div class="sig-box bad">' + I("shield") + '<div>Photo lookup failed: ' + esc(er.message) + '</div></div>'); });
    }
    function resultsScreen() {
      view.innerHTML = '<div class="lv-head"><div class="eyebrow">' + esc(S.q || "Results") + '</div><h1 class="h1" style="font-size:30px">Pick the <em>exact</em> card</h1></div><div id="lv-out"></div>' + foot();
      var box = document.getElementById("lv-out"); bindResp(box); if (S.resp) renderResp(S.resp, box); else box.innerHTML = '<div class="card lv-empty">No lookup yet.</div>';
    }

    /* ---------- the report ---------- */
    function priceFromQuery() { var f = (S.resp && S.resp.fields) || {}; return f.budget_max != null ? Number(f.budget_max) : null; }
    function reportScreen() {
      var r = S.cur;
      if (!r) { location.hash = "#/scan"; return; }
      var comps = compsOf(r), g = target(r), m = r.match || {}, sb = r.sales_by_grade || {}, slab = r.slab, tc = comps[g] || {};
      var order = ["RAW", "PSA 7", "PSA 8", "PSA 9", "PSA 10", "BGS 9", "BGS 9.5", "BGS 10", "SGC 9", "SGC 10", "CGC 9", "CGC 10"];
      var tabs = Object.keys(comps).concat(Object.keys(sb)).concat(r.lazy_grades || []).filter(function (k, i, a) { return a.indexOf(k) === i; })
        .sort(function (a, b) { var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
      var cur = S.tab && tabs.indexOf(S.tab) >= 0 && S.tabFor === r.card_id ? S.tab : g;
      var call = theCall(r, priceFromQuery()), rowsG = sb[g] || [];
      if (slab && call.cls === "BANDS") call = ownerCall(r, g, rowsG, call);
      var thin = tc.median != null && (tc.n || 0) < TN(), gl = g === "RAW" ? "Raw" : g;
      /* card line (what you're looking at) */
      var h = '<section class="lv-id">' + '<div class="lv-idt">' + thumb(r) + '</div><div class="lv-idb"><h1 class="lv-idn">' + esc(r.name || r.card_id) + '</h1><div class="lv-chips">' +
        (slab ? '<span class="sig sig-good">' + esc(slab.grade) + ' · cert ' + esc(slab.cert) + '</span>' : '<span class="sig ' + (m.exact ? "sig-good" : "sig-warn") + '">' + (m.exact ? "Exact card" : m.match_type === "image" ? "Photo match · check it's your card" : "Closest match, not exact") + '</span>') +
        '</div></div></section>';
      if ((m.warnings || []).length) h += '<p class="lv-warn1">' + I("shield") + '<span>' + esc(m.warnings[0]) + '</span></p>';
      /* THE answer: call + comp, big. Free plan: the comp stays, the call spot is a locked Pro tile. */
      if (isFree()) h += freeComp(gl, tc, thin);
      else { h += '<section class="lv-cc call-' + call.cls + '" aria-label="The comp and the call"><div class="lv-cch"><span>' + esc(gl) + ' · ' + (tc.window_days || 30) + '-day comp</span>' +
        '<button class="lv-info" id="lv-info" aria-expanded="false" aria-controls="lv-why" aria-label="Why this call">i</button></div><div class="lv-ccrow">';
      if (call.cls === "BANDS") h += '<div class="lv-ccall lv-bandcall"><div><span class="callpill cp-BUY">BUY</span><b class="num">under ' + money(call.buyMax) + '</b></div><div><span class="callpill cp-SELL">SELL</span><b class="num">' + money(call.median) + '+</b></div></div>';
      else h += '<div class="lv-ccall cw-' + call.cls + '">' + esc(call.word) + '</div>';
      h += '<div class="lv-ccmed"><b class="num">' + money(tc.median) + '</b><small>median</small></div></div>' +
        '<div class="lv-ccstats"><div><small>Low</small><b class="num">' + money(tc.low) + '</b></div><div><small>High</small><b class="num">' + money(tc.high) + '</b></div><div><small>Sales</small><b class="num' + (thin ? " lv-thin" : "") + '">' + (tc.n || 0) + '</b></div></div>' +
        '<p class="lv-ccshort ' + (call.tone || "") + '">' + esc(call.short || "") + (thin ? ' <span class="sig sig-bad sig-xs">thin comps</span>' : "") + '</p>' +
        '<div class="lv-why" id="lv-why" hidden><p>' + esc(call.why) + '</p>' +
        (call.buyMax != null ? '<div class="lv-bands4"><div class="b4 b-buy"><span class="callpill cp-BUY">BUY</span><b class="num">&lt; ' + money(call.buyMax) + '</b></div><div class="b4 b-hold"><span class="callpill cp-HOLD">HOLD</span><b class="num">' + money(call.buyMax) + '–' + money(call.median) + '</b></div>' +
          '<div class="b4 b-sell"><span class="callpill cp-SELL">SELL</span><b class="num">' + money(call.median) + '+</b></div><div class="b4 b-grade"><span class="callpill cp-GRADE">GRADE</span><b>' + (slab ? "Graded " + esc(slab.grade) : "No call") + '</b></div></div>' : "") +
        '<p class="small dim">BUY under 65% of the ' + esc(call.basis || "recent median") + ', SELL at it or above. One-off sales never count. ' + (slab ? "Already graded, so no grading call. " : "No grading call: pop data unavailable. ") + 'Fixed rules on the sold comps shown (sample prices in the beta), not financial advice.</p>' +
        ((m.notes || []).length ? '<p class="small dim">' + m.notes.map(esc).join(" ") + '</p>' : "") + '</div></section>';
      }
      /* sold comps, right under */
      h += '<nav class="lv-gtabs" role="tablist" aria-label="Grade">' + tabs.map(function (k) { return '<button role="tab" class="lv-gt' + (k === cur ? " on" : "") + '" data-g="' + esc(k) + '" aria-selected="' + (k === cur) + '">' + esc(k === "RAW" ? "Raw" : k) + '</button>'; }).join("") + '</nav>';
      h += '<div id="lv-gpane"></div>';
      h += '<section class="sec lv-after"><div class="lv-acts"><button class="btn btn-ghost" id="lv-watch" type="button">' + I("eye") + 'Add to watchlist</button><button class="btn btn-ghost" id="lv-snipe" type="button" aria-expanded="false" aria-controls="lv-snipebox">' + I("target") + 'Snipe</button></div><div id="lv-snipebox" hidden></div>' +
        '<div class="cta-stack"><a class="btn btn-gold" href="#/scan">' + I("camera") + 'Check another card</a><a class="btn btn-ghost" target="_blank" rel="noopener noreferrer" href="' + ebayUrl(r, cur) + '">' + I("ext") + 'eBay sold search</a></div>';
      if ((r.alternates || []).length) h += '<div class="lv-alts"><span class="small dim">Not your card?</span>' + r.alternates.map(function (a) { return '<button class="chip" data-alt="' + esc(a.name) + '">' + esc(a.name) + '</button>'; }).join("") + '</div>';
      h += '<p class="small dim lv-src"><span class="badge-sample bt-pill"><i></i>Sample prices</span> Made up for the beta, not real sales. Pop and grading odds unavailable. CardHound never bids or buys.</p></section>';
      view.innerHTML = h;
      var ib = document.getElementById("lv-info"), wy = document.getElementById("lv-why");
      var pc = view.querySelector(".pl-call"); if (pc) pc.onclick = function () { S.proWhy = "call"; };
      if (ib) ib.onclick = function () { var open = wy.hidden; wy.hidden = !open; ib.setAttribute("aria-expanded", open); ib.classList.toggle("on", open); };
      function pane(k) {
        S.tab = k; S.tabFor = r.card_id;
        view.querySelectorAll(".lv-gt").forEach(function (b) { var on = b.dataset.g === k; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
        var gp = document.getElementById("lv-gpane");
        if (!compsOf(r)[k] && !(r.sales_by_grade || {})[k] && (r.lazy_grades || []).indexOf(k) >= 0) {   /* grade tabs load on tap: 1 call, then cached */
          gp.innerHTML = '<div class="card lv-load"><div class="lv-spin"></div><div><b>Loading ' + esc(k === "RAW" ? "Raw" : k) + ' sales…</b><span class="small muted">Exact variant · sample sold comps</span></div></div>';
          api("/api/live/comps", { card: cardOf(r), grade: k }).then(function (d) {
            ["comps", "sales_by_grade", "recent_by_grade", "feed_aggregate"].forEach(function (f) { r[f] = r[f] || {}; r[f][k] = (d[f] || {})[k] || (f === "sales_by_grade" ? [] : f === "recent_by_grade" ? null : {}); });
            r.lazy_grades = (r.lazy_grades || []).filter(function (x) { return x !== k; }); save();
            var gq = document.getElementById("lv-gpane"); if (gq && S.tab === k && S.cur === r) gq.innerHTML = gradePane(r, k, k === g);
          }, function (er) { var gq = document.getElementById("lv-gpane"); if (gq) gq.innerHTML = '<div class="sig-box bad">' + I("shield") + '<div>' + esc(er.message) + '</div></div>'; });
          return;
        }
        gp.innerHTML = gradePane(r, k, k === g);
      }
      view.querySelectorAll(".lv-gt").forEach(function (b) { b.onclick = function () { pane(b.dataset.g); }; });
      view.querySelectorAll("[data-alt]").forEach(function (b) { b.onclick = function () { search(b.dataset.alt); }; });
      var wb = document.getElementById("lv-watch"), sbt = document.getElementById("lv-snipe");
      if (wb) wb.onclick = function () { var gg = S.tab || g; wb.disabled = true;
        api("/api/live/watch", { card: cardOf(r), grade: gg }).then(function (d) { watchLocal(d.card || cardOf(r), gg); wb.innerHTML = I("eye") + "On your watchlist"; toast((d.status || "added to watchlist").replace(/^./, function (c) { return c.toUpperCase(); }) + "."); },
          function (er) { wb.disabled = false; toast(er.message); }); };
      if (sbt) sbt.onclick = function () { snipeBox(r, S.tab || g, call, tc, sbt); };
      pane(cur);
      U.setLastCard && U.setLastCard({ title: r.name, source: "live" });
    }
    /* Snipe = look only: your max, the live eBay auctions, a reminder. CardHound never bids, never buys. */
    function snipeBox(r, gg, call, tc, btn) {
      var box = document.getElementById("lv-snipebox"); if (!box) return;
      box.hidden = !box.hidden; btn.setAttribute("aria-expanded", !box.hidden); if (box.hidden) return;
      var mx = call && call.buyMax != null ? Math.floor(call.buyMax) : (tc && tc.median != null ? Math.floor(tc.median * BUY_RULE) : "");
      function list() { var mine = rdJ("ch_live_snipes").filter(function (x) { return x.card_id === r.card_id; });
        return mine.length ? '<div class="lv-slist">' + mine.map(function (x) { return '<div class="lv-srow"><span><b>' + esc(x.grade === "RAW" ? "Raw" : x.grade) + ' · max ' + money(x.max) + '</b><small>' + (x.when ? "remind " + esc(new Date(x.when).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })) + " ET" : "no reminder time") + '</small></span><button class="link-btn" data-sx="' + esc(x.id) + '">Remove</button></div>'; }).join("") + '</div>' : ""; }
      function draw() {
        box.innerHTML = '<div class="card lv-snipe"><div class="eyebrow">Snipe · look only</div><p class="small muted">Set your max, open the live eBay auctions, save a reminder. CardHound never bids or buys: you place the bid yourself on eBay.</p>' +
          '<label class="lv-sl">Your max bid ($)<input id="lv-smax" class="lv-in" type="number" inputmode="decimal" min="1" step="1" value="' + esc(mx) + '"></label>' +
          '<label class="lv-sl">Remind me (the auction end, ET)<input id="lv-swhen" class="lv-in" type="datetime-local"></label>' +
          '<div class="cta-stack"><a class="btn btn-gold" target="_blank" rel="noopener noreferrer" href="' + ebayLive(r, gg) + '">' + I("ext") + 'Open eBay auctions</a><button class="btn btn-ghost" id="lv-ssave" type="button">Save reminder</button></div>' +
          (mx !== "" ? '<p class="small dim">Suggested max = the BUY line (' + money(mx) + '), from ' + esc((call && call.basis) || "recent sales") + '.</p>' : "") + list() + '</div>';
        document.getElementById("lv-ssave").onclick = function () {
          var v = parseFloat(document.getElementById("lv-smax").value), w = document.getElementById("lv-swhen").value;
          if (!(v > 0)) { toast("Set your max bid first."); return; }
          var a = rdJ("ch_live_snipes"); a.unshift({ id: "ls" + Date.now(), card: r.name, card_id: r.card_id, grade: gg, max: v, when: w ? new Date(w).toISOString() : null, url: ebayLive(r, gg), saved: new Date().toISOString() }); wrJ("ch_live_snipes", a.slice(0, 50));
          if (w) { var dt = new Date(w), pad = function (n) { return String(n).padStart(2, "0"); }, st = dt.getUTCFullYear() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate()) + "T" + pad(dt.getUTCHours()) + pad(dt.getUTCMinutes()) + "00Z";
            var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CardHound//Snipe reminder//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "@cardhound", "DTSTAMP:" + st, "DTSTART:" + st, "SUMMARY:Snipe: " + String(r.name || "").replace(/[,;\n]/g, " ") + " max $" + v,
              "DESCRIPTION:Look-only reminder. Bid yourself on eBay: " + ebayLive(r, gg), "BEGIN:VALARM", "TRIGGER:-PT5M", "ACTION:DISPLAY", "DESCRIPTION:Snipe reminder", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
            var aEl = document.createElement("a"); aEl.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); aEl.download = "cardhound-snipe.ics"; document.body.appendChild(aEl); aEl.click(); setTimeout(function () { URL.revokeObjectURL(aEl.href); aEl.remove(); }, 1000); }
          toast(w ? "Reminder saved. Add the calendar file so your phone reminds you." : "Saved. Add a time to get a reminder."); draw(); };
        box.querySelectorAll("[data-sx]").forEach(function (b) { b.onclick = function () { wrJ("ch_live_snipes", rdJ("ch_live_snipes").filter(function (x) { return x.id !== b.dataset.sx; })); draw(); }; });
      }
      draw();
    }
    function freeComp(gl, tc, thin) {
      return '<section class="lv-cc pl-cc" aria-label="The comp"><div class="lv-cch"><span>' + esc(gl) + ' · ' + (tc.window_days || 30) + '-day comp</span></div><div class="lv-ccrow">' +
        '<a class="pl-call" href="#/pro" data-pro="call" aria-label="Get the call with CardHound Pro"><span class="pl-cpills" aria-hidden="true"><i>BUY</i><i>SELL</i><i>HOLD</i><i>GRADE</i></span>' +
        '<span class="pl-cl">' + I("lock") + '<b>Get the call</b></span><small>with Pro</small></a>' +
        '<div class="lv-ccmed"><b class="num">' + money(tc.median) + '</b><small>median</small></div></div>' +
        '<div class="lv-ccstats"><div><small>Low</small><b class="num">' + money(tc.low) + '</b></div><div><small>High</small><b class="num">' + money(tc.high) + '</b></div><div><small>Sales</small><b class="num' + (thin ? " lv-thin" : "") + '">' + (tc.n || 0) + '</b></div></div>' +
        '<p class="pl-left">' + Math.max(0, FREE_DAILY - usedToday()) + ' of ' + FREE_DAILY + ' free comp checks left today</p></section>';
    }
    function medianOf(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }), i = s.length >> 1; return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; }
    function trendOf(rows) {
      var now = Date.now(), d = 864e5, a = [], b = [];
      rows.forEach(function (x) { var t = Date.parse(x.sold_at || x.date); if (isNaN(t)) return; var age = (now - t) / d; if (age <= 30) a.push(x.price); else if (age <= 60) b.push(x.price); });
      var ma = medianOf(a), mb = medianOf(b);
      return ma != null && mb ? { pct: (ma - mb) / mb, na: a.length, nb: b.length } : null;
    }
    function ownerCall(r, g, rows, bands) {
      var c = compsOf(r)[g] || {}, t = trendOf(rows.filter(function (x) { return !x.outlier; })), out = { buyMax: bands.buyMax, median: bands.median, basis: bands.basis, g: g };
      if ((c.n || 0) < TN()) return Object.assign(out, { word: "HOLD", cls: "HOLD", short: "Too few sales to call", why: "Only " + (c.n || 0) + " " + g + " sales: too thin to call a sale." });
      if (t && t.pct >= 0.10) return Object.assign(out, { word: "HOLD", cls: "HOLD", short: "▲ " + Math.round(t.pct * 100) + "% in 30 days", tone: "up", why: "You own it graded. " + g + " is up " + Math.round(t.pct * 100) + "% (last 30 days vs the 30 before): let it run. Sell at " + money(out.median) + "+." });
      if (t && t.pct <= -0.10) return Object.assign(out, { word: "SELL", cls: "SELL", short: "▼ " + Math.round(-t.pct * 100) + "% in 30 days", tone: "down", why: "You own it graded. " + g + " is down " + Math.round(-t.pct * 100) + "% (last 30 days vs the 30 before). If you sell, ask " + money(out.median) + " or more." });
      return Object.assign(out, { word: "HOLD", cls: "HOLD", short: "Steady price", why: "You own it graded. " + g + " is steady around " + money(out.median) + " (" + (bands.basis || "recent sales") + "). Sell only at that or above." });
    }
    function mkt(s) { s = String(s || ""); return /^ebay$/i.test(s) ? "eBay" : s ? s.charAt(0).toUpperCase() + s.slice(1) : "—"; }
    function fdate(x) { var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x.date || ""));   /* the server's ET sale day: never re-shifted by the browser */
      if (dm) return new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3], 12)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
      var t = Date.parse(x.sold_at || x.date); return isNaN(t) ? esc(x.date || "") : new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }); }
    function gradePane(r, k, isTop) {
      var rows = (r.sales_by_grade || {})[k] || [], c = compsOf(r)[k] || {}, agg = (r.feed_aggregate || {})[k] || {}, kl = k === "RAW" ? "Raw" : k;
      var outIdx = {}, srv = rows.some(function (x) { return "outlier" in x; });   /* one-off sales: flagged on the server (core.flag_outliers), listed but never counted */
      rows.forEach(function (x, i) { if (srv) { if (x.outlier) outIdx[i] = 1; return; }
        var nb = rows.slice(Math.max(0, i - 5), i).concat(rows.slice(i + 1, i + 6)).map(function (y) { return y.price; }), mm = medianOf(nb);
        if (nb.length >= 6 && mm && (x.price > mm * 1.6 || x.price < mm * 0.6)) outIdx[i] = 1; });
      var nOut = Object.keys(outIdx).length;
      var med = c.median != null ? c.median : medianOf(rows.filter(function (x, i) { return !outIdx[i]; }).map(function (x) { return x.price; })), h = "";
      if (!isTop) h += '<div class="lv-tabstat"><div><small>Median</small><b class="num">' + money(c.median) + '</b></div><div><small>Low–High</small><b class="num">' + (c.low != null ? money(c.low) + "–" + money(c.high) : "—") + '</b></div><div><small>Sales</small><b class="num' + (c.median != null && (c.n || 0) < TN() ? " lv-thin" : "") + '">' + (c.n || 0) + '</b></div></div>';
      if (!rows.length) return h + '<div class="card lv-empty">' + (agg.comp_price != null ? 'Only a summary price for ' + esc(kl) + ' (' + money(agg.comp_price) + '), no individual sales.' : 'No ' + esc(kl) + ' sales for this exact card.') + '</div>';
      h += '<ol class="lv-sold" aria-label="Sold comps, newest first">' + rows.map(function (x, i) {
          var out = !!outIdx[i], d = med && !out ? (x.price - med) / med : null;
          var inner = '<span class="lv-sth">' + (x.image ? '<img src="' + esc(x.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : "") + '</span>' +
            '<span class="lv-smid"><b>' + fdate(x) + '</b><span class="lv-smeta">' + esc(x.type || "Sale") + ' · ' + esc(mkt(x.market)) + (out ? ' <span class="sig sig-bad sig-xs lv-excl" title="' + esc(typeof x.outlier === "string" ? x.outlier : "far from the sales around it") + '">Excluded: one-off</span>' : "") + '</span></span>' +
            '<span class="lv-sprice"><b class="num">' + money(x.price) + '</b>' + (d != null ? '<em class="' + (d >= 0 ? "up" : "down") + '">' + (d >= 0 ? "+" : "") + Math.round(d * 100) + '%</em>' : "") + '</span>';
          return '<li' + (out ? ' class="out"' : "") + '>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(x.title || "") + '">' + inner + '</a>' : '<div>' + inner + '</div>') + '</li>';
        }).join("") + '</ol><p class="small dim lv-listnote">' + rows.length + ' sample ' + esc(kl) + ' sales, newest first. % vs median.' +
        (nOut ? ' ' + nOut + ' one-off sale' + (nOut > 1 ? "s" : "") + ' (dimmed, "Excluded") stay listed but never count: not in the median, low, high, last sale or the call.' : "") + '</p>';
      var kept = rows.filter(function (x, i) { return !outIdx[i]; });
      h += '<div class="lv-chhead">Price over time</div>' + chart(kept, med, {});
      return h;
    }
    function chart(rows, med, outIdx) {
      var pts = rows.map(function (x, i) { return { t: Date.parse(x.sold_at || x.date), p: x.price, o: !!outIdx[i] }; }).filter(function (o) { return !isNaN(o.t); }).sort(function (a, b) { return a.t - b.t; });
      if (pts.length < 2) return "";
      var W = 340, H = 150, L = 6, R = 6, T = 12, B = 22;
      var t0 = pts[0].t, t1 = pts[pts.length - 1].t, lo = Math.min.apply(null, pts.map(function (o) { return o.p; })), hi = Math.max.apply(null, pts.map(function (o) { return o.p; }));
      if (hi === lo) { hi += 1; lo -= 1; }
      function X(t) { return L + (t1 === t0 ? (W - L - R) / 2 : (t - t0) / (t1 - t0) * (W - L - R)); }
      function Y(p) { return T + (1 - (p - lo) / (hi - lo)) * (H - T - B); }
      var line = pts.map(function (o) { return X(o.t).toFixed(1) + "," + Y(o.p).toFixed(1); }).join(" ");
      var dots = pts.map(function (o) { return '<circle cx="' + X(o.t).toFixed(1) + '" cy="' + Y(o.p).toFixed(1) + '" r="' + (o.o ? 3.6 : 2.6) + '" class="' + (o.o ? "o" : "d") + '"/>'; }).join("");
      var my = med != null && med >= lo && med <= hi ? '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(med).toFixed(1) + '" y2="' + Y(med).toFixed(1) + '" class="m"/><text x="' + (W - R) + '" y="' + (Y(med) - 4).toFixed(1) + '" text-anchor="end" class="ml">median ' + money(med) + '</text>' : "";
      function d(t) { return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }); }
      return '<figure class="lv-chart card" aria-label="Sold prices over time"><div class="lv-chl"><span>' + money(hi) + '</span><span>' + money(lo) + '</span></div><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img">' +
        '<polyline points="' + line + '" class="l"/>' + my + dots + '<text x="' + L + '" y="' + (H - 6) + '" class="ax">' + d(t0) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end" class="ax">' + d(t1) + '</text></svg></figure>';
    }

    /* ---------- home: ONE action, check a comp ---------- */
    function homeScreen() {
      view.innerHTML = '<section class="lv-home"><h1 class="lv-hh">Check a <em>comp</em></h1><p class="lv-hs">Sold comps for your exact card. <span class="badge-sample bt-pill"><i></i>Sample prices</span></p>' +
        '<button class="lv-snap" id="lv-snap" type="button"><span class="lv-snapi">' + I("camera") + '</span><b>Scan a card</b><small>Slab or raw · take or pick a photo</small></button>' +
        '<div class="lv-or"><span>or type it</span></div>' +
        '<form class="lv-hbar" id="lv-hf" autocomplete="off"><input id="lv-in" class="lv-in" type="search" enterkeyhint="search" placeholder="Card, number, grade" aria-label="Card to look up">' +
        '<button type="button" class="lv-ib" id="lv-mic" aria-label="Speak">' + I("mic") + '</button><button class="lv-go" type="submit" aria-label="Check the comp">' + I("search") + '</button></form>' +
        (isFree() ? '<a class="pl-homeleft" href="#/pro"><span>' + Math.max(0, FREE_DAILY - usedToday()) + ' of ' + FREE_DAILY + ' free checks left today</span><b>Go Pro' + I("right") + '</b></a>' : "") +
        (S.cur ? '<a class="lv-recent" href="#/report"><small>Last checked</small><b>' + esc(S.cur.name || "") + '</b>' + I("right") + '</a>' : "") + '</section>';
      document.getElementById("lv-snap").onclick = function () { var f = document.getElementById("lv-photo"); if (f) f.click(); };
      document.getElementById("lv-hf").onsubmit = function (e) { e.preventDefault(); search(document.getElementById("lv-in").value); };
      document.getElementById("lv-mic").onclick = function () { listen(); };
    }
    /* ---------- about / settings: usage counter lives here, not on the main screens ---------- */
    function aboutScreen() { location.replace("#/about"); }

    /* ---------- the paywall: CardHound Pro ---------- */
    function proScreen() { location.replace("#/pro"); }
    function trialLine(k) { return "Free for 7 days, then " + (k === "monthly" ? PRICE.monthly + "/mo" : PRICE.yearly + "/yr") + ". Cancel anytime before the trial ends and you won't be charged."; }
    function legalScreen(p) {
      var f = p.sub === "privacy" ? "PRIVACY_POLICY.md" : "TERMS_OF_SERVICE.md";
      view.innerHTML = '<div class="lv-head"><div class="eyebrow">Draft · not final</div><h1 class="h1" style="font-size:30px">' + (p.sub === "privacy" ? "Privacy <em>Policy</em>" : "Terms of <em>Service</em>") + '</h1></div><div class="card pl-legal" id="pl-legal">Loading…</div>';
      fetch("/legal/" + f, { credentials: "same-origin" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (t) {
        var el = document.getElementById("pl-legal"); if (!el) return;
        el.innerHTML = t.split(/\n{2,}/).map(function (b) { var m = b.match(/^(#{1,4})\s+(.*)/); if (m) return "<h" + (m[1].length + 1) + ">" + esc(m[2]) + "</h" + (m[1].length + 1) + ">";
          return "<p>" + esc(b).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>") + "</p>"; }).join("");
      }, function () { var el = document.getElementById("pl-legal"); if (el) el.textContent = "Couldn't load the draft right now."; });
    }

    var pin = document.getElementById("lv-photo");
    if (pin) pin.addEventListener("change", function () { var f = pin.files && pin.files[0]; if (!f) return; U.state.photo = URL.createObjectURL(f); S.file = f; S.fileUrl = U.state.photo; pin.value = ""; location.hash = "#/analyze"; });
    U.setRoute("scan", homeScreen); U.setRoute("ask", askScreen); U.setRoute("analyze", analyzeScreen); U.setRoute("report", reportScreen);
    U.setRoute("match", function () { location.replace(S.resp && (S.resp.results || []).length ? "#/lresults" : "#/scan"); });   /* the sample match screen (Pujols) never shows in live mode */
    U.addRoute("lresults", resultsScreen); U.addRoute("about", aboutScreen); U.setRoute("pro", proScreen); U.setRoute("legal", legalScreen);
    U.moreItemsTop.push(["about", "sliders", "About the beta", "Your invite, sample prices, Home Screen how-to"]);

    /* ---------- per-screen theme + honest data strip ---------- */
    function onRoute() {
      var p = U.parseHash(), b = document.body;
      var rt = KNOWN_ROUTES[p.route] ? p.route : "scan";   /* an unknown route renders Check: give it Check's (real) strip, not a Sample one */
      b.setAttribute("data-route", rt); b.setAttribute("data-sub", p.sub || "");
      var line = document.getElementById("lv-line");
      if (!line) { var tb = document.getElementById("topbar"); line = document.createElement("div"); line.id = "lv-line"; tb.parentNode.insertBefore(line, tb.nextSibling); }
      var sample = SAMPLE_NOTE[rt];
      line.className = "lv-line " + (LIVE_ROUTES[rt] ? "real" : rt === "more" ? "real" : "sample");
      line.hidden = !!LIVE_ROUTES[rt];   
      var tbh = document.getElementById("topbar"); if (tbh && tbh.offsetHeight) b.style.setProperty("--lv-top", (tbh.offsetHeight - 1) + "px");
      if (PRO_LOCK[p.route] && isFree()) { line.hidden = true; lockView(p.route); }
      line.textContent = LIVE_ROUTES[rt] ? "Sample prices · CardHound Beta · exact variant only" : (sample || "Sample on this screen · not real prices");
    }
    window.addEventListener("hashchange", function () { setTimeout(onRoute, 0); });
    var TL = { "#/scan": "Check", "#/report": "Result" };
    function relabel() { var fr = isFree(); document.querySelectorAll("#tabbar a").forEach(function (a) { var hr = a.getAttribute("href"), t = TL[hr], sp = a.querySelector("span"); if (t && sp && sp.textContent !== t) sp.textContent = t;
      var lk = fr && !!PRO_LOCK[(hr || "").replace("#/", "")]; if (a.classList.contains("pl-tl") !== lk) a.classList.toggle("pl-tl", lk); }); }
    var tbar = document.getElementById("tabbar"); if (tbar && window.MutationObserver) new MutationObserver(relabel).observe(tbar, { childList: true, subtree: true });
    setTimeout(onRoute, 0);
  });
})();
