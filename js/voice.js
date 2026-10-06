/* CardHound voice / prompt assistant (route #/ask). Sample data only. Never bids, buys or sends anything:
 * every spend action ends at a confirm card with "Confirm (simulated)". Parsing lives in js/voice-parse.js. */
window.CH_VOICE = function (U) {
  "use strict";
  var V = window.CH_VOICE_PARSE, D = U.D, I = U.I, esc = U.esc, money = U.money, toast = U.toast;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var st = { msgs: [], answers: {}, pendingText: null, lastHunt: null, listings: null, rec: null, listening: false, seq: 0, store: {} };
  var EXAMPLES = ["Raw Prizm silver rookies under $400", "Find a Wemby chrome refractor rookie under $150", "What are the top movers in Pokemon today", "Should I grade this", "What's my portfolio up this week", "Show me new highs in Prizm", "Late 90s Kobe PMG or Credentials", "Set a max bid on this under $200"];
  var ttsOn = function () { return !!U.LS.get("voice_tts", false); };
  function listings() { if (st.listings) return Promise.resolve(st.listings); return (D.getHuntListings ? D.getHuntListings() : Promise.resolve((window.CARDHOUND_SAMPLE || {}).huntListings || [])).then(function (l) { st.listings = l; return l; }); }
  function byId(id) { return (st.listings || []).filter(function (l) { return l.id === id; })[0]; }

  /* ---------- speech out ---------- */
  var voicePick = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null; if (voicePick) return voicePick;
    var vs = speechSynthesis.getVoices().filter(function (v) { return /^en[-_]US/i.test(v.lang); });
    var pref = ["Samantha", "Ava", "Andrew", "Aria", "Jenny", "Guy", "Google US English", "Alex", "Allison", "Tom"];
    for (var i = 0; i < pref.length; i++) { var m = vs.filter(function (v) { return v.name.indexOf(pref[i]) > -1; })[0]; if (m) return (voicePick = m); }
    return (voicePick = vs.filter(function (v) { return v.localService; })[0] || vs[0] || null);
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = function () { voicePick = null; };
  function speak(txt) {
    if (!ttsOn() || !window.speechSynthesis || !txt) return;
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(txt.replace(/\$(\d)/g, "$1 dollars ").replace(/\s+/g, " ")); var v = pickVoice(); if (v) u.voice = v; u.lang = "en-US"; u.rate = 0.95; u.pitch = 1; speechSynthesis.speak(u); } catch (e) {}
  }

  /* ---------- mic in ---------- */
  function micMode() { return SR ? "speech" : "typed"; }
  function setListening(on) {
    st.listening = on;
    document.querySelectorAll(".vc-mic").forEach(function (b) { b.classList.toggle("live", on); b.setAttribute("aria-pressed", on ? "true" : "false"); b.setAttribute("aria-label", on ? "Stop listening" : "Speak your request"); });
    var hint = document.getElementById("vc-hint"); if (hint) hint.textContent = on ? "Listening… speak naturally" : "";
  }
  function listen() {
    if (!SR) { toast("Voice input isn't available in this browser. Type your request instead."); var i = document.getElementById("vc-in"); if (i) i.focus(); return; }
    if (st.listening && st.rec) { st.rec.stop(); return; }
    var r = new SR(); st.rec = r; r.lang = "en-US"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    var finalTxt = "";
    r.onresult = function (e) {
      var interim = ""; for (var k = e.resultIndex; k < e.results.length; k++) { if (e.results[k].isFinal) finalTxt += e.results[k][0].transcript; else interim += e.results[k][0].transcript; }
      var inp = document.getElementById("vc-in"); if (inp) inp.value = (finalTxt + " " + interim).trim();
    };
    r.onerror = function (e) { setListening(false); if (e.error === "not-allowed" || e.error === "service-not-allowed") toast("Mic blocked. Allow the microphone for this site, or type instead."); else if (e.error === "no-speech") toast("Didn't catch that. Tap the mic and try again."); };
    r.onend = function () {
      setListening(false);
      var t = finalTxt.trim(); if (!t) return;
      if (st.micTarget === "hunt") {
        st.micTarget = null;
        var hunt = document.getElementById("hunt-q"); if (hunt) hunt.value = t;
        if (U.submitHunt) U.submitHunt(t);
        return;
      }
      if (U.parseHash().route !== "ask") { st.pendingText = t; location.hash = "#/ask"; } else submit(t);
    };
    try { r.start(); setListening(true); } catch (e) { setListening(false); toast("Couldn't start the mic. Type your request instead."); }
  }

  /* ---------- rendering helpers ---------- */
  function chipsHTML(chips, amb) {
    var ambF = (amb || []).map(function (a) { return a.field; });
    var out = chips.map(function (c) { return '<span class="pchip" data-f="' + c.field + '"><i>' + esc(c.label) + '</i>' + esc(c.value) + '</span>'; });
    (amb || []).forEach(function (a) { out.push('<span class="pchip q" data-f="' + a.field + '"><i>' + esc(({ set: "Set", parallel_color: "Parallel", year: "Year", grade_company: "Grader", end_window: "Ends" })[a.field] || a.field) + '</i>?</span>'); });
    return '<div class="pchips" aria-label="What I heard">' + out.join("") + '</div>';
  }
  function push(role, html, opts) {
    opts = opts || {}; var id = "m" + (++st.seq);
    st.msgs.push({ id: id, role: role, html: html });
    var th = document.getElementById("vc-thread");
    if (th) {
      var d = document.createElement("div"); d.className = "vmsg " + role; d.id = id; d.innerHTML = html; th.appendChild(d);
      var ex = document.getElementById("vc-ex"); if (ex && st.msgs.length) ex.style.display = "none";
      setTimeout(function () { (opts.scrollTo === "top" ? d : d).scrollIntoView({ behavior: "smooth", block: opts.block || "start" }); }, 30);
    }
    if (opts.say) speak(opts.say);
    return id;
  }
  function bot(html, say, opts) { return push("bot", '<div class="vb"><div class="vb-h"><span class="vb-dot"></span>CardHound<span class="chip demo">SAMPLE</span></div>' + html + '</div>', Object.assign({ say: say }, opts || {})); }
  function btn(label, attrs, gold) { return '<button class="btn ' + (gold ? "btn-gold" : "btn-ghost") + ' btn-xs" ' + attrs + '>' + label + '</button>'; }
  function keep(data) { var k = "k" + (++st.seq); st.store[k] = data; return k; }

  /* ---------- main entry ---------- */
  function submit(text, silentUser) {
    text = String(text || "").trim(); if (!text) return;
    if (window.CH_CRISIS && CH_CRISIS.match(text)) {
      if (!silentUser) push("user", '<div class="vu">' + esc(text) + '</div>');
      var inp0 = document.getElementById("vc-in"); if (inp0) inp0.value = "";
      bot("<p>" + esc(CH_CRISIS.message()) + "</p>", CH_CRISIS.message());
      return;
    }
    if (!silentUser) push("user", '<div class="vu">' + esc(text) + '</div>');
    var inp = document.getElementById("vc-in"); if (inp) inp.value = "";
    var last = U.lastCard();
    var r = V.routeVoiceIntent(text, { currentCard: last });
    listings().then(function () { handle(r, text, last); });
  }
  function needCard(intentLabel, text) {
    var lc = U.lastCard();
    bot('<p>Which card do you mean by "this"? ' + (lc ? "" : "I don't have a card open yet.") + '</p><div class="vq-opts">' +
      btn("Pujols 2001 Topps Chrome Traded #T247 (sample report)", 'data-v="pickcard" data-id="vh14" data-t="' + esc(text) + '"', true) +
      btn("Luka 2018-19 Prizm Silver #280 (sample)", 'data-v="pickcard" data-id="vh01" data-t="' + esc(text) + '"') + '</div><p class="small dim">Or open a report or hunt result first, then ask again.</p>', "Which card do you mean?");
  }
  function cardFromLast(last) {
    if (!last) return null;
    if (last.listingId) return byId(last.listingId);
    if (last.id === "PUJOLS-01TCT-T247") return byId("vh14");
    return null;
  }
  function findListingFor(fields) {
    var res = V.runHunt(Object.assign({}, fields, { budget_max: null, listing_type: null, end_window: null, seller_filters: null }), st.listings || [], { min: 1 });
    return res.results[0] ? res.results[0].listing : null;
  }
  function handle(r, text, last) {
    var f = r.fields || {}, card = null;
    if (f.target === "this") card = cardFromLast(last);
    else if (f.target === "named") card = findListingFor(f.card);
    switch (r.intent) {
      case "card_hunt": return hunt(text, {});
      case "card_lookup": return lookup(f, card, text);
      case "should_grade": if (!card) return f.needsCard || f.target !== "named" ? needCard("grade", text) : noCard(f); return shouldGrade(card);
      case "lists": return lists(f);
      case "watchlist_add": case "watchlist_remove": if (!card) return f.target === "named" ? noCard(f) : needCard("watch", text); return watch(r.intent, card);
      case "portfolio_summary": return portfolio(f);
      case "ledger_add": return ledgerAdd(f, card, text);
      case "sniper_set": case "best_offer": case "buy":
        if (!card) return f.target === "named" ? noCard(f) : needCard(r.intent, text);
        return confirmCard(r.intent, card, f.max || f.offer || null);
      case "gem_hunt_save": return saveHunt(text);
      case "alerts_settings": return alertsReply(text);
      case "help": return help();
      default: return unknown(r, text);
    }
  }
  function noCard(f) {
    var chips = V.chipsFor(f.card || {});
    bot(chipsHTML(chips) + '<p>I couldn\'t find that exact card in the sample listings. Try a hunt instead, or open the sample report.</p><div class="vq-opts">' + btn("Open sample report", 'data-v="go" data-h="#/report"', true) + btn("Show example prompts", 'data-v="help"') + '</div>', "I couldn't find that exact card in the sample data.");
  }

  /* ---------- hunt ---------- */
  function hunt(text, answers) {
    var p = V.parseHunt(text, answers);
    if (p.ambiguities.length) {
      var a = p.ambiguities[0], k = keep({ text: text, answers: answers, amb: a });
      return bot(chipsHTML(p.chips, p.ambiguities) + '<div class="vq"><div class="vq-t">' + I("search") + esc(a.question) + '</div><div class="vq-opts">' +
        a.options.map(function (o, i) { return btn(esc(o.label), 'data-v="ans" data-k="' + k + '" data-i="' + i + '"', i === 0); }).join("") + '</div>' +
        (p.ambiguities.length > 1 ? '<p class="small dim" style="margin:8px 0 0">' + (p.ambiguities.length - 1) + ' more quick question' + (p.ambiguities.length > 2 ? "s" : "") + ' after this.</p>' : "") + '</div>', a.question + " " + a.options.map(function (o) { return o.label; }).join(", or "));
    }
    var res = V.runHunt(p.fields, st.listings || []);
    st.lastHunt = { q: text, fields: p.fields, chips: p.chips, answers: answers };
    var hid = res.hidden, hidTxt = ["lot", "sealed", "reprint"].filter(function (x) { return hid[x]; }).map(function (x) { return hid[x] + " " + (x === "lot" ? "lot" + (hid[x] > 1 ? "s" : "") : x === "sealed" ? "sealed" : "reprint" + (hid[x] > 1 ? "s" : "")); }).join(", ");
    var EXP = { end_window: "end time", seller_filters: "seller filters", listing_type: "listing type", budget_max: "budget (+25%)" };
    var head = '<div class="vsum"><b class="num">' + res.results.length + '</b> exact-variant card' + (res.results.length === 1 ? "" : "s") + (res.results.length ? ", ranked by net profit" : "") + '</div>' +
      (hidTxt ? '<div class="small dim">' + I("shield") + ' Cards only: hid ' + hidTxt + '.</div>' : "") +
      (res.expanded.length ? '<div class="vexp">' + I("spark") + '<div>' + (res.strictCount ? "Only " + res.strictCount : "Nothing") + ' matched every filter, so I widened <b>' + res.expanded.map(function (e) { return EXP[e]; }).join(", ") + '</b>. The card itself still matches exactly.</div></div>' : "");
    var cards = res.results.slice(0, 6).map(function (x, i) { return resultCard(x, i); }).join("");
    var none = !res.results.length ? '<p>No exact match in the sample listings' + (res.exactCount ? "" : " for that card") + '. Save it as a Gem Hunt and CardHound will watch for it.</p>' : "";
    var say = res.results.length ? "Found " + res.results.length + " exact matches. Best is " + res.results[0].listing.title.replace(/#/g, "number ") + " at " + money(res.results[0].listing.price) + ", about " + money(res.results[0].profit.net) + " net after grading and fees." : "No exact matches in the sample listings.";
    bot(chipsHTML(p.chips) + head + none + cards + '<div class="vq-opts" style="margin-top:10px">' + btn(I("gem") + "Save as Gem Hunt", 'data-v="savehunt"', true) + btn("Refine", 'data-v="refine"') + '</div>', say);
  }
  function resultCard(x, i) {
    var L = x.listing, pm = x.profit, k = keep({ id: L.id });
    var ends = L.listing_type === "auction" ? "Auction · ends in " + (L.ends_in_min < 60 ? L.ends_in_min + " min" : Math.floor(L.ends_in_min / 60) + "h " + (L.ends_in_min % 60) + "m") : "Buy It Now";
    var sel = L.seller, selTxt = sel.feedback_pct + "% · " + (sel.top_rated ? "Top Rated · " : "") + (sel.us ? "US" : "Intl") + (sel.returns ? " · Returns" : " · No returns");
    var gradeLbl = L.raw ? "Raw" : L.grade_company + " " + L.grade;
    var rows = pm.lines.map(function (l) { return '<dt>' + esc(l[0]) + '</dt><dd class="num">' + money(l[1], true) + '</dd>'; }).join("") +
      (pm.gradeCost ? "" : "") + '<dt><b>All-in cost</b></dt><dd class="num"><b>' + money(pm.cost, true) + '</b></dd>';
    var ev = pm.byGrade.map(function (g) { return '<tr><td>' + esc(g.grade) + '</td><td class="num">' + Math.round(g.odds * 100) + '%</td><td class="num">' + money(g.comp) + '</td><td class="num">' + money(g.net) + '</td></tr>'; }).join("");
    return '<div class="hcard' + (i === 0 ? " best" : "") + '" data-lid="' + L.id + '">' +
      '<div class="hc-top"><span class="chip ok hc-ex">' + I("check") + 'EXACT VARIANT</span>' + (i === 0 ? '<span class="chip gold">Top pick</span>' : '<span class="chip">#' + (i + 1) + '</span>') + '</div>' +
      '<b class="hc-t">' + esc(L.title) + '</b>' +
      '<div class="hc-m small muted">' + esc(gradeLbl) + ' · ' + esc(ends) + '</div>' +
      '<div class="hc-mchips">' + x.matched.concat(x.filters).map(function (m) { return '<span>' + I("check") + esc(m) + '</span>'; }).join("") + x.condition.map(function (c) { return '<span class="' + (c.ok ? "" : "warn") + '">' + (c.ok ? I("check") : "?") + esc(c.note) + (c.ok ? "" : " (check photos)") + '</span>'; }).join("") + '</div>' +
      '<div class="hc-price"><div><div class="small dim">' + (L.listing_type === "auction" ? "Current bid" : "Price") + '</div><div class="price num">' + money(L.price, true) + '</div><div class="small dim">+ ' + (L.shipping ? money(L.shipping, true) : "free") + ' ship</div></div>' +
      '<div style="text-align:right"><div class="small dim">Net profit (est.)</div><div class="price num ' + (pm.net >= 0 ? "pill-up" : "pill-down") + '">' + (pm.net >= 0 ? "+" : "\u2212") + money(Math.abs(pm.net)) + '</div><div class="small dim">ROI ' + pm.roi + '%</div></div></div>' +
      '<div class="hc-comps"><div><i>Raw</i><b class="num">' + money(L.comps.raw) + '</b></div><div><i>PSA 8</i><b class="num">' + money(L.comps.psa8) + '</b></div><div><i>PSA 9</i><b class="num">' + money(L.comps.psa9) + '</b></div><div><i>PSA 10</i><b class="num">' + money(L.comps.psa10) + '</b></div></div>' +
      '<div class="small dim hc-note">Sample 30-day comps · Pop PSA 10: ' + L.pop.psa10 + ' / PSA 9: ' + L.pop.psa9 + ' (sample estimate)' + (L.raw ? ' · Grading odds PSA 10 ' + Math.round(L.odds["10"] * 100) + '% / 9 ' + Math.round(L.odds["9"] * 100) + '% (sample estimate)' : "") + '</div>' +
      '<div class="small dim hc-note">Seller: ' + esc(selTxt) + '</div>' +
      '<details class="hc-math"><summary>' + I("calc") + 'Profit math</summary><dl class="kv small">' + rows + '</dl>' +
      '<table class="tbl small"><thead><tr><th>' + (L.raw ? "If it grades" : "Sell as") + '</th><th>Odds</th><th>Comp</th><th>Net</th></tr></thead><tbody>' + ev + '</tbody></table>' +
      '<p class="small dim" style="margin:6px 0 0">Expected net sale ' + money(pm.ev, true) + ' (eBay 13.25% + $0.40, $5 ship) minus all-in cost = <b style="color:var(--text)">' + money(pm.net, true) + '</b>. ' + (L.raw ? "Grading: sample PSA tier + $18 ship/insure. Selling raw nets about " + money(pm.rawNet) + "." : "Already graded, so no grading cost.") + ' Estimates only.</p></details>' +
      '<div class="acts acts-wrap">' + (L.listing_type === "auction" ? btn(I("target") + "Auction Watch", 'data-v="act" data-a="sniper_set" data-k="' + k + '"', true) : btn("Buy", 'data-v="act" data-a="buy" data-k="' + k + '"', true) + btn(I("handshake") + "Offer", 'data-v="act" data-a="best_offer" data-k="' + k + '"')) +
      btn(I("eye") + "Watch", 'data-v="act" data-a="watchlist_add" data-k="' + k + '"') + '</div></div>';
  }

  /* ---------- confirm card (never auto-runs) ---------- */
  function confirmCard(kind, L, amt) {
    U.setLastCard({ listingId: L.id, title: L.title, source: "hunt" });
    var pm = V.profitMath(L), fair = Math.floor(pm.ev / 1.15 - (L.raw ? pm.gradeCost : 0) - (L.shipping || 0) - L.price * 0.07 + L.price * 0.07);
    var def = amt || (kind === "sniper_set" ? Math.max(Math.round(L.price * 1.05), Math.min(fair, Math.round(L.price * 1.3))) : kind === "best_offer" ? Math.round(L.price * 0.85) : L.price);
    var T = { sniper_set: ["Set an Auction Watch reminder", "Your max bid", "I set this max of", ". If it wins, I agree to buy."], best_offer: ["Send a Best Offer", "Your offer", "I want to offer", ". If accepted, I agree to buy."], buy: ["Buy It Now", "You pay (before tax)", "I want to buy this for", " plus tax."] }[kind];
    var k = keep({ kind: kind, id: L.id });
    var total = kind === "buy" ? L.price + (L.shipping || 0) : null;
    bot('<div class="vconf" data-k="' + k + '"><div class="eyebrow" style="margin:0">Confirm · simulated</div><b class="vc-tt">' + T[0] + '</b><div class="small muted">' + esc(L.title) + ' · ' + (L.raw ? "Raw" : L.grade_company + " " + L.grade) + ' · ' + (L.listing_type === "auction" ? "current bid " + money(L.price, true) : "listed " + money(L.price, true)) + '</div>' +
      '<div class="field" style="margin-top:12px"><label for="amt-' + k + '">' + T[1] + '</label><input class="input num vamt" id="amt-' + k + '" inputmode="decimal" value="' + (total != null ? total.toFixed(2) : def) + '"' + (kind === "buy" ? " readonly" : "") + '></div>' +
      (kind === "sniper_set" ? '<div class="small dim">Suggested fair max (sample): ' + money(Math.max(0, fair)) + ' to keep about a 15% margin.</div>' : "") +
      (amt && kind === "sniper_set" && amt < L.price ? '<div class="note" style="margin-top:8px">' + I("lock") + '<div>The current bid is already above ' + money(amt) + '. This max would not win as things stand.</div></div>' : "") +
      '<label class="row vchk"><input type="checkbox" class="vok"><span>' + T[2] + ' <b class="vamt-echo">' + money(total != null ? total : def, true) + '</b>' + T[3] + '</span></label>' +
      '<div class="cta-stack" style="margin-top:10px"><button class="btn btn-gold vgo" data-v="confirm" data-k="' + k + '" disabled>Confirm (simulated)</button><button class="btn btn-ghost btn-sm" data-v="cancel" data-k="' + k + '">Cancel</button></div>' +
      '<p class="small dim" style="margin:8px 0 0">' + I("shield") + ' Demo: nothing is bid, bought or sent. In the app you finish on eBay yourself.</p></div>',
      T[0] + ". " + money(total != null ? total : def) + ". Check the box to confirm. This is simulated.");
  }

  /* ---------- other intents ---------- */
  function lookup(f, card, text) {
    var c = f.card || {};
    if (c.player === "Albert Pujols" || (!card && f.target === "this" && U.lastCard())) {
      return D.getCardReport("PUJOLS-01TCT-T247").then(function (r) {
        var g9 = r.graded.filter(function (g) { return g.grade === "PSA 9"; })[0];
        bot(chipsHTML(V.chipsFor(c)) + '<p><b>2001 Topps Chrome Traded #T247 Albert Pujols RC</b>, base (not refractor). Sample 30-day median raw <b>' + money(r.raw.w30.median) + '</b>, PSA 9 <b>' + money(g9.w30.median) + '</b>. The call: <b style="color:var(--gold2)">GRADE</b>.</p><div class="vq-opts">' + btn("Open full report", 'data-v="go" data-h="#/report"', true) + btn("Hunt listings", 'data-v="say" data-t="find a 2001 topps chrome traded pujols T247 raw"') + '</div>',
          "Pujols T247 base. Raw median " + money(r.raw.w30.median) + ", PSA 9 " + money(g9.w30.median) + ". The call is grade.");
      });
    }
    if (!card) return noCard(f);
    U.setLastCard({ listingId: card.id, title: card.title, source: "lookup" });
    bot(chipsHTML(V.chipsFor(c)) + '<p><b>' + esc(card.title) + '</b>. Sample 30-day comps: raw <b>' + money(card.comps.raw) + '</b>, PSA 8 ' + money(card.comps.psa8) + ', PSA 9 <b>' + money(card.comps.psa9) + '</b>, PSA 10 ' + money(card.comps.psa10) + '.</p><div class="vq-opts">' + btn("Hunt listings for it", 'data-v="say" data-t="' + esc("find " + card.title) + '"', true) + btn("Should I grade it?", 'data-v="say" data-t="should I grade this"') + '</div>',
      card.title.replace(/#/g, "number ") + ". Raw about " + money(card.comps.raw) + ", PSA 9 about " + money(card.comps.psa9) + ".");
  }
  function shouldGrade(L) {
    U.setLastCard({ listingId: L.id, title: L.title, source: "grade" });
    var raw = Object.assign({}, L, { raw: true }), pm = V.profitMath(raw), sellRaw = pm.rawNet, gradeEV = pm.ev - pm.gradeCost;
    var call = gradeEV > sellRaw * 1.1 ? "GRADE" : gradeEV > sellRaw ? "MAYBE" : "SELL RAW";
    bot('<p><b>' + esc(L.title) + '</b></p><div class="vcall"><span>The call (sample)</span><b>' + call + '</b></div>' +
      '<dl class="kv small"><dt>Sell raw now, net</dt><dd class="num">' + money(sellRaw) + '</dd><dt>Grade, expected net after fees</dt><dd class="num">' + money(pm.ev) + '</dd><dt>Grading + ship/insure (sample)</dt><dd class="num">\u2212' + money(pm.gradeCost) + '</dd><dt><b>Grading upside</b></dt><dd class="num"><b>' + (gradeEV - sellRaw >= 0 ? "+" : "\u2212") + money(Math.abs(gradeEV - sellRaw)) + '</b></dd></dl>' +
      '<p class="small dim">Odds PSA 10 ' + Math.round(L.odds["10"] * 100) + '% / 9 ' + Math.round(L.odds["9"] * 100) + '% / 8 ' + Math.round(L.odds["8"] * 100) + '% (sample estimate). Check centering and corners first.</p>' +
      '<div class="vq-opts">' + (L.id === "vh14" ? btn("Open grading math in the report", 'data-v="go" data-h="#/report"', true) : "") + btn("Grading checklist", 'data-v="go" data-h="#/tool/variant"') + '</div>',
      "My call: " + call.toLowerCase() + ". Grading upside about " + money(gradeEV - sellRaw) + " versus selling raw.");
  }
  var LIST_NAME = { movers: "Movers", highs: "New Highs", picks: "Buy / Hold / Sell", searched: "Most Searched" };
  function lists(f) {
    var list = f.list || "movers", v = f.set ? "set" : f.category ? "category" : "overall", val = f.set || f.category || null;
    var scope = { view: v, value: val }, fn = list === "highs" ? D.getNewHighs : list === "picks" ? D.getPicks : list === "searched" ? D.getMostSearched : D.getMovers;
    fn(scope).then(function (rows) {
      if (list === "movers") rows = rows.filter(function (r) { return !r.thin && (f.direction === "down" ? r.pct < 0 : r.pct > 0); }).sort(function (a, b) { return f.direction === "down" ? a.pct - b.pct : b.pct - a.pct; });
      var top = rows.slice(0, 3), k = keep({ list: list, v: v, val: val, dir: f.direction });
      var nm = function (r) { return r.card || r.name || r.title || ""; };
      var line = function (r) { return '<div class="vrow"><span>' + esc(nm(r)) + '</span><b class="num">' + (r.pct != null ? U.pct(r.pct) : r.call || r.rank || "") + '</b></div>'; };
      bot('<div class="pchips">' + '<span class="pchip"><i>List</i>' + LIST_NAME[list] + '</span>' + (val ? '<span class="pchip"><i>' + (v === "set" ? "Set" : "Category") + '</i>' + esc(val) + '</span>' : "") + (f.period ? '<span class="pchip"><i>Period</i>Today</span>' : "") + (list === "movers" ? '<span class="pchip"><i>Direction</i>' + (f.direction === "down" ? "Down" : "Up") + '</span>' : "") + '</div>' +
        (top.length ? top.map(line).join("") : '<p>No sample rows for that filter.</p>') +
        '<div class="vq-opts" style="margin-top:10px">' + btn("Open " + LIST_NAME[list] + (val ? " · " + esc(val) : ""), 'data-v="list" data-k="' + k + '"', true) + '</div>',
        top.length ? "Top " + LIST_NAME[list].toLowerCase() + (val ? " in " + val : "") + ": " + top.map(nm).join("; ") : "No sample rows for that.");
    });
  }
  function watch(intent, L) {
    U.setLastCard({ listingId: L.id, title: L.title, source: "watch" });
    var add = intent === "watchlist_add";
    (add ? D.addVoiceWatch(L.title) : D.removeVoiceWatch(L.title)).then(function () {
      bot('<p>' + (add ? "Added to" : "Removed from") + ' your watchlist on this phone: <b>' + esc(L.title) + '</b>.</p><div class="vq-opts">' + btn("Open watchlist", 'data-v="go" data-h="#/deals/watch"', true) + (add ? btn("Undo", 'data-v="unwatch" data-t="' + esc(L.title) + '"') : "") + '</div>', (add ? "Added to" : "Removed from") + " your watchlist.");
    });
  }
  function portfolio(f) {
    D.getPortfolio().then(function (pf) {
      var s = pf.series, n = s.length - 1, back = { today: 1, week: 1, month: 4, year: n, all: n }[f.period || "all"];
      var from = s[Math.max(0, n - back)], ch = s[n] - from, chp = from ? ch / from * 100 : 0;
      var lbl = { today: "today", week: "this week", month: "this month", year: "this year", all: "overall" }[f.period || "all"];
      bot('<div class="pchips"><span class="pchip"><i>Period</i>' + cap(lbl) + '</span></div><div class="vcall"><span>Portfolio ' + lbl + ' (sample)</span><b class="num ' + (ch >= 0 ? "pill-up" : "pill-down") + '">' + (ch >= 0 ? "+" : "\u2212") + money(Math.abs(ch)) + ' · ' + U.pct(chp) + '</b></div>' +
        '<dl class="kv small"><dt>Value now</dt><dd class="num">' + money(pf.value) + '</dd><dt>Cost basis</dt><dd class="num">' + money(pf.costBasis) + '</dd><dt>Unrealized after fees</dt><dd class="num">' + money(pf.unrealized) + '</dd><dt>Cards held</dt><dd class="num">' + pf.count + '</dd></dl>' +
        '<div class="vq-opts">' + btn("Open portfolio", 'data-v="go" data-h="#/ledger/portfolio"', true) + '</div>', "Your sample portfolio is " + (ch >= 0 ? "up " : "down ") + money(Math.abs(ch)) + " " + lbl + ".");
    });
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function ledgerAdd(f, card, text) {
    var c = f.card || {}, title = card ? card.title : V.chipsFor(c).filter(function (x) { return ["player", "year", "set", "parallel_color", "card_number"].indexOf(x.field) > -1; }).map(function (x) { return x.value; }).join(" ");
    var grade = c.grade_company && c.grade ? c.grade_company + " " + c.grade : "Raw";
    var k = keep({ card: title || "", price: f.price || null, grade: grade });
    bot(chipsHTML(V.chipsFor(c)) + '<p>Log this buy to your Portfolio? You review every field before it saves.</p><dl class="kv small"><dt>Card</dt><dd>' + esc(title || "(fill in)") + '</dd><dt>Price</dt><dd class="num">' + (f.price ? money(f.price, true) : "(fill in)") + '</dd><dt>Grade</dt><dd>' + esc(grade) + '</dd></dl><div class="vq-opts">' + btn("Review and add", 'data-v="ledger" data-k="' + k + '"', true) + '</div>', "Review the buy and save it to your portfolio.");
  }
  function saveHunt(text) {
    var h = st.lastHunt;
    if (!h) { var p = V.parseHunt(text); if (p.fields.player || p.fields.set) h = { q: text, fields: p.fields, chips: p.chips }; }
    if (!h) return bot('<p>Tell me what to hunt for first, for example "raw Prizm silver rookies under $400". Then say "save this hunt".</p>', "Tell me what to hunt for first.");
    D.saveGemHunt({ q: h.q, fields: h.fields, chips: h.chips }).then(function () {
      bot(chipsHTML(h.chips) + '<p>Saved as a <b>Gem Hunt</b> on this phone. CardHound checks the sample listings for exact matches.</p><div class="vq-opts">' + btn("Open Gem Hunt", 'data-v="go" data-h="#/deals/gems"', true) + '</div>', "Saved as a gem hunt.");
    });
  }
  function alertsReply(text) {
    D.getAlertSettings().then(function (s) {
      bot('<p>New-high (BOOM) alerts are <b>' + (s.newHighs.on ? "on" : "off") + '</b> for ' + (s.newHighs.scope === "watch" ? "your watchlist and portfolio" : "everything") + '. Price alerts: ' + (U.state.alerts.on ? U.state.alerts.threshold + "% under comp" : "off") + '. Change them here (nothing changes until you save):</p><div class="vq-opts">' + btn("New-high settings", 'data-v="boomset"', true) + btn("Price alert settings", 'data-v="alertset"') + '</div>', "Here are your alert settings.");
    });
  }
  function help() {
    bot('<p>Ask by voice or type. Examples:</p><div class="vq-opts col">' + EXAMPLES.concat(["Add this to my watchlist", "I bought a Luka Prizm silver for $300", "Turn off new high alerts"]).map(function (e) { return btn(esc(e), 'data-v="say" data-t="' + esc(e) + '"'); }).join("") + '</div>', "You can ask for movers, hunts, grading calls, your portfolio, Auction Watch and more.");
  }
  var ALT = { card_hunt: ["Find a card", "find raw prizm silver rookies under $400"], card_lookup: ["Look up a card", "how much is the pujols T247"], lists: ["Show market lists", "top movers today"], should_grade: ["Should I grade it?", "should I grade this"], portfolio_summary: ["My portfolio", "what's my portfolio up this week"], watchlist_add: ["Add to watchlist", "add this to my watchlist"], sniper_set: ["Auction Watch", "set a max bid on this"], best_offer: ["Make an offer", "make an offer on this"], buy: ["Buy it", "buy this"], gem_hunt_save: ["Save a Gem Hunt", "save this hunt"], alerts_settings: ["Alert settings", "alert settings"], ledger_add: ["Log a buy", "log a buy"], help: ["What can you do?", "help"], watchlist_remove: ["Remove from watchlist", "remove this from my watchlist"] };
  function unknown(r) {
    bot('<p>I\'m not sure what you meant. Did you mean:</p><div class="vq-opts">' + r.alternatives.slice(0, 3).map(function (a, i) { var x = ALT[a] || ALT.help; return btn(esc(x[0]), 'data-v="say" data-t="' + esc(x[1]) + '"', i === 0); }).join("") + '</div>', "I'm not sure. Did you mean " + r.alternatives.slice(0, 3).map(function (a) { return (ALT[a] || ALT.help)[0]; }).join(", or ") + "?");
  }

  /* ---------- events (delegated) ---------- */
  function onClick(e) {
    var b = e.target.closest("[data-v]"); if (!b) return;
    var v = b.dataset.v, k = b.dataset.k, d = k ? st.store[k] : null;
    if (v === "ans") {
      var o = d.amb.options[+b.dataset.i], ans = Object.assign({}, d.answers);
      Object.keys(o.set).forEach(function (f) { var val = o.set[f]; if (f === "brand") return; ans[f] = val; });
      push("user", '<div class="vu">' + esc(o.label) + '</div>');
      hunt(d.text, ans);
    } else if (v === "say") submit(b.dataset.t);
    else if (v === "help") help();
    else if (v === "go") location.hash = b.dataset.h;
    else if (v === "pickcard") { var L = byId(b.dataset.id); U.setLastCard({ listingId: L.id, title: L.title, source: "pick", id: L.id === "vh14" ? "PUJOLS-01TCT-T247" : null }); push("user", '<div class="vu">' + esc(L.title) + '</div>'); submit(b.dataset.t, true); }
    else if (v === "act") { var L2 = byId(d.id); U.setLastCard({ listingId: L2.id, title: L2.title, source: "hunt" }); if (b.dataset.a === "watchlist_add") watch("watchlist_add", L2); else confirmCard(b.dataset.a, L2, b.dataset.a === "sniper_set" && st.lastHunt && st.lastHunt.fields.budget_max ? Math.min(st.lastHunt.fields.budget_max, Math.round(L2.price * 1.25)) : null); }
    else if (v === "confirm") {
      var box = b.closest(".vconf"), amt = parseFloat(String(box.querySelector(".vamt").value).replace(/[^0-9.]/g, "")), L3 = byId(d.id);
      if (!box.querySelector(".vok").checked) return; if (!(amt > 0)) { toast("Enter an amount first."); return; }
      box.querySelectorAll("button,input").forEach(function (x) { x.disabled = true; });
      if (d.kind === "sniper_set") {
        U.addSnipe({ id: "sn" + Date.now(), dealId: L3.id, card: L3.title, max: amt, price: L3.price, status: "Scheduled", endsAt: Date.now() + Math.min(L3.ends_in_min, 45) * 60000 });
        bot('<p>Simulated: reminder set with your max of <b>' + money(amt, true) + '</b>. Nothing was bid.</p><div class="vq-opts">' + btn("Open Auction Watch", 'data-v="go" data-h="#/deals/snipes"', true) + '</div>', "Simulated. Reminder set. Nothing was bid.");
      } else bot('<p>Simulated: ' + (d.kind === "buy" ? "nothing was bought" : "no offer was sent") + '. In the app you finish this on eBay yourself' + (d.kind === "buy" && D.addLedgerRow ? ", and CardHound logs the buy to your Portfolio after you review it" : "") + '.</p>', d.kind === "buy" ? "Simulated. Nothing was bought." : "Simulated. No offer was sent.");
    } else if (v === "cancel") { var bx = b.closest(".vconf"); bx.querySelectorAll("button,input").forEach(function (x) { x.disabled = true; }); bx.classList.add("off"); toast("Cancelled. Nothing happened."); }
    else if (v === "savehunt") saveHunt("save this hunt");
    else if (v === "refine") { var i2 = document.getElementById("vc-in"); if (i2 && st.lastHunt) { i2.value = st.lastHunt.q + " "; i2.focus(); } }
    else if (v === "list") { U.setScope(d.list, d.v, d.val); if (d.list === "movers") U.setMoversDir(d.dir); location.hash = "#/markets/" + d.list; }
    else if (v === "unwatch") D.removeVoiceWatch(b.dataset.t).then(function () { toast("Removed from watchlist."); });
    else if (v === "ledger") { if (U.ledger && U.ledger.addPrefilled) U.ledger.addPrefilled({ card: d.card, price: d.price, grade: d.grade }); }
    else if (v === "boomset") { if (U.boom) U.boom.settingsSheet(); }
    else if (v === "alertset") U.alertSheet();
    else if (v === "tts") { U.LS.set("voice_tts", !ttsOn()); b.setAttribute("aria-pressed", ttsOn() ? "true" : "false"); b.classList.toggle("on", ttsOn()); toast(ttsOn() ? "Spoken replies on" : "Spoken replies off"); if (!ttsOn() && window.speechSynthesis) speechSynthesis.cancel(); else speak("Spoken replies are on."); }
    else if (v === "delhunt") D.deleteGemHunt(b.dataset.id).then(function () { fillDeals(U.view, "gems"); });
    else if (v === "runhunt") { D.getGemHunts().then(function (hs) { var h = hs.filter(function (x) { return x.id === b.dataset.id; })[0]; if (h) { st.pendingText = h.q; location.hash = "#/ask"; } }); }
    else if (v === "mic") { st.micTarget = b.getAttribute("data-mic-target") || ""; listen(); }
    else if (v === "ask") { st.pendingText = b.dataset.t || null; location.hash = "#/ask"; }
  }
  document.addEventListener("click", onClick);
  document.addEventListener("change", function (e) {
    if (e.target.classList && e.target.classList.contains("vok")) { var box = e.target.closest(".vconf"); box.querySelector(".vgo").disabled = !e.target.checked; }
  });
  document.addEventListener("input", function (e) {
    if (e.target.classList && e.target.classList.contains("vamt")) { var box = e.target.closest(".vconf"), v = parseFloat(String(e.target.value).replace(/[^0-9.]/g, "")); box.querySelector(".vamt-echo").textContent = v > 0 ? money(v, true) : "$0"; var ok = box.querySelector(".vok"); ok.checked = false; box.querySelector(".vgo").disabled = true; }
  });

  /* ---------- screen + chrome ---------- */
  function micBtn(cls) { return '<button type="button" class="vc-mic ' + (cls || "") + '" data-v="mic" data-mic-mode="' + micMode() + '" aria-pressed="false" aria-label="Speak your request">' + I("mic") + '</button>'; }
  function screen() {
    var v = U.view;
    v.innerHTML = '<div class="vc-head"><div><div class="eyebrow">Voice and prompt search</div><h1 class="h1" style="font-size:30px">Ask <em>CardHound</em></h1></div>' +
      '<button class="icon-btn vc-tts' + (ttsOn() ? " on" : "") + '" data-v="tts" aria-pressed="' + (ttsOn() ? "true" : "false") + '" aria-label="Spoken replies">' + I("speaker") + '</button></div>' +
      '<p class="lead" style="margin-top:2px">Say or type a card, a hunt, or a question. Exact variants only. ' + (SR ? "Tap the mic to talk." : "Voice isn't available in this browser, so type instead.") + '</p>' +
      '<div id="vc-ex" class="vc-ex"' + (st.msgs.length ? ' style="display:none"' : "") + '>' + EXAMPLES.map(function (e) { return '<button class="chip" data-v="say" data-t="' + esc(e) + '">' + esc(e) + '</button>'; }).join("") + '</div>' +
      '<div id="vc-thread" class="vc-thread">' + st.msgs.map(function (m) { return '<div class="vmsg ' + m.role + '" id="' + m.id + '">' + m.html + '</div>'; }).join("") + '</div>' + U.footer() + '<div class="vc-spacer"></div>';
    var c = document.getElementById("vc-composer");
    if (!c) { c = document.createElement("form"); c.id = "vc-composer"; c.className = "vc-composer"; c.setAttribute("autocomplete", "off"); document.getElementById("app").appendChild(c); }
    c.innerHTML = '<div class="vc-hint" id="vc-hint" aria-live="polite"></div><div class="vc-bar">' + micBtn() + '<input id="vc-in" class="vc-in" type="text" enterkeyhint="send" placeholder="Try: raw Prizm silver rookies under $400" aria-label="Type your request"><button class="vc-send" type="submit" aria-label="Send">' + I("send") + '</button></div>';
    c.onsubmit = function (e) { e.preventDefault(); submit(document.getElementById("vc-in").value); };
    if (st.pendingText) { var t = st.pendingText; st.pendingText = null; listings().then(function () { submit(t); }); }
    else if (st.msgs.length) setTimeout(function () { var th = document.getElementById("vc-thread"); if (th && th.lastChild) th.lastChild.scrollIntoView({ block: "start" }); }, 30);
  }
  function onRoute(route) {
    var c = document.getElementById("vc-composer"); if (c && route !== "ask") c.remove();
    var f = document.getElementById("vc-fab"); if (f) f.remove();
    document.body.classList.toggle("on-ask", route === "ask");
  }
  function homeCard() {
    return '<div class="sec"><div class="card gold vc-home"><div class="row" style="gap:12px;align-items:center">' + micBtn("lg") + '<div class="grow"><b>Ask CardHound</b><div class="small muted">Say it: "raw Prizm silver rookies under $400"</div></div></div>' +
      '<div class="vc-ex" style="margin-top:12px">' + EXAMPLES.slice(0, 4).map(function (e) { return '<button class="chip" data-v="ask" data-t="' + esc(e) + '">' + esc(e) + '</button>'; }).join("") + '</div>' +
      '<a class="btn btn-ghost btn-sm" href="#/ask" style="margin-top:12px;width:100%">' + I("search") + 'Type a prompt</a></div></div>';
  }
  function fillDeals(view, sub) {
    if (sub === "gems") {
      var el = view.querySelector("#vh-saved"); if (!el) return;
      D.getGemHunts().then(function (hs) {
        el.innerHTML = '<div class="sec" style="margin-top:14px"><div class="sec-head"><h3 class="h3">Your saved hunts</h3><span class="chip">On this phone</span></div>' +
          (hs.length ? hs.map(function (h) { return '<div class="card tight vh-saved"><b>' + esc(h.q) + '</b><div class="pchips sm">' + (h.chips || []).slice(0, 8).map(function (c) { return '<span class="pchip"><i>' + esc(c.label) + '</i>' + esc(c.value) + '</span>'; }).join("") + '</div><div class="acts acts-wrap">' + btn("Run hunt", 'data-v="runhunt" data-id="' + h.id + '"', true) + btn("Delete", 'data-v="delhunt" data-id="' + h.id + '"') + '</div></div>'; }).join("")
            : '<div class="card tight row" style="gap:12px">' + micBtn() + '<div class="grow small muted">No saved hunts yet. Ask for a card, then tap <b>Save as Gem Hunt</b>.</div></div>') + '</div>';
      });
    } else if (sub === "watch") {
      var w = view.querySelector("#vw-list"); if (!w) return;
      D.getVoiceWatch().then(function (ws) { if (!ws.length) return; w.innerHTML = '<div class="sec" style="margin-top:14px"><div class="sec-head"><h3 class="h3">Added by voice</h3><span class="chip">On this phone</span></div><div class="card">' + ws.map(function (x) { return '<div class="lrow" style="grid-template-columns:22px 1fr auto"><span style="color:var(--gold)">' + I("eye") + '</span><div class="nm"><b>' + esc(x.card) + '</b></div><button class="link-btn" data-v="unwatch" data-t="' + esc(x.card) + '">Remove</button></div>'; }).join("") + '</div></div>'; });
    }
  }
  return { screen: screen, onRoute: onRoute, homeCard: homeCard, fillDeals: fillDeals, submit: submit, listen: listen, micMode: micMode, _st: st };
};
