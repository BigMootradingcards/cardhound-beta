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
    ai: CH_AI.normalize(LS.get("ai", {})),
    ladderDeferred: !!LS.get("ladderDeferred", false),
    ladderHook: LS.get("ladderHook", null),
    snipes: LS.get("snipes", []),
    intent: LS.get("intent", null),
    huntSites: LS.get("huntSites", null),
    hunt: LS.get("hunt", null),
    alerts: LS.get("alerts", { threshold: 20, on: true }),
    scopes: { movers: { view: "overall", value: null }, picks: { view: "overall", value: null }, searched: { view: "overall", value: null }, highs: { view: "overall", value: null } },
    moversDir: "up", scopeSetQ: "", scopeCatQ: "", dailyCatQ: "", huntKind: "", meta: null, timers: []
  };
  /* Purge prior demo "connected" flag — never treat it as live Ladder comps. */
  if (state.conn && state.conn.cardladder) { delete state.conn.cardladder; try { LS.set("conn", state.conn); } catch (e) {} }
  function defaultLadderHook() {
    return { status: "none", method: null, accountOk: false, pendingRows: [], pendingText: "", uiStep: "account" };
  }
  if (!state.ladderHook || typeof state.ladderHook !== "object") state.ladderHook = defaultLadderHook();
  else {
    var _lh = defaultLadderHook();
    Object.keys(_lh).forEach(function (k) { if (state.ladderHook[k] == null) state.ladderHook[k] = _lh[k]; });
    if (state.ladderHook.status !== "awaiting") state.ladderHook.status = "none";
  }
  var saveConn = function () { LS.set("conn", state.conn); LS.set("keys", state.keys); state.connDirty = true; };
  var saveLadderHook = function () { LS.set("ladderHook", state.ladderHook); };
  /* Step 3: live only when confirmed card has ≥1 setguard-kept sale from user hook rows (not SAMPLE inventions). */
  state.liveSales = null;
  function hookPendingRows() {
    return (state.ladderHook && Array.isArray(state.ladderHook.pendingRows)) ? state.ladderHook.pendingRows : [];
  }
  function matchHookSalesFor(card) {
    var LH = window.CH_LADDER_HOOK;
    if (!LH || typeof LH.matchLiveSales !== "function") return [];
    return LH.matchLiveSales(hookPendingRows(), card || {});
  }
  function ladderCompsLive() {
    return !!(state.liveSales && state.liveSales.length >= 1);
  }
  function ladderHookPhase() {
    if (ladderCompsLive()) return "live";
    if (state.ladderHook && state.ladderHook.status === "awaiting") return "awaiting";
    return "none";
  }
  function parseLadderSaleLines(text) {
    var LH = window.CH_LADDER_HOOK;
    if (LH && typeof LH.parseLadderSaleLines === "function") return LH.parseLadderSaleLines(text);
    return [];
  }
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
  function isSampleAdapter() { return !!(D && (D.isSample || CFG.adapter === "sample")); }
  function gate(featureId) {
    var f = CH_FEATURES[featureId]; if (!f) return "";
    var on = f.sources.filter(isConnected);
    var src0 = f.sources[0];
    var label = f.label.charAt(0).toUpperCase() + f.label.slice(1);
    if (src0 === "cardladder") {
      if (ladderCompsLive()) {
        return '<div class="gate">' + I("check") + '<div class="grow"><b>Sold comps from your Card Ladder</b>. ' + esc(label) + '.</div></div>';
      }
      if (ladderHookPhase() === "awaiting") {
        return '<button class="gate" data-connect="cardladder">' + I("clock") + '<div class="grow"><b>Ladder hook set up · waiting for sale-by-sale rows</b>. ' + esc(label) + ' — still SAMPLE until real sales appear.</div>' + I("right") + '</button>';
      }
      return '<button class="gate" data-connect="cardladder">' + I("lock") + '<div class="grow"><b>Comps wait until Card Ladder is linked</b>. ' + esc(label) + ' — showing SAMPLE only. Live sale-by-sale needs a real Ladder hook.</div>' + I("right") + '</button>';
    }
    if (on.length) return '<div class="gate">' + I("check") + '<div class="grow"><b>' + esc(srcById(on[0]).name) + ' connected (demo)</b>. ' + esc(label) + ' would load here. This shared demo still shows sample data.</div></div>';
    var names = f.sources.map(function (s) { return srcById(s).name; });
    var nm = names.length > 1 ? names.slice(0, -1).join(", ") + " or " + names[names.length - 1] : names[0];
    return '<button class="gate" data-connect="' + src0 + '">' + I("lock") + '<div class="grow"><b>Connect ' + esc(nm) + '</b> to unlock ' + esc(f.label) + '. Showing sample data.</div>' + I("right") + '</button>';
  }
  function jobSplitHTML() {
    var j = CH_AI.job;
    return '<div class="job-split" aria-label="AI and sold comps do different jobs"><div class="job-row"><b>AI</b><span>' + esc(j.aiShort) + '</span></div><div class="job-row"><b>Card Ladder</b><span>Live sold comps from your Ladder. Hunt faster. Clearer call. Less tab-juggling.</span></div></div>';
  }
  /* End of a flow only. Do not place this above the first action. */
  function flowEnd(opts) {
    opts = opts || {};
    var j = CH_AI.job;
    var lines = [];
    if (opts.sample !== false) lines.push("<b>SAMPLE.</b> Not live prices. Live sold comps wait on your Card Ladder hook — this preview does not unlock them.");
    lines.push("Not financial or investment advice.");
    lines.push("<b>AI.</b> " + esc(j.aiShort) + " <b>Sold comps.</b> From your Card Ladder when a real hook returns rows.");
    if (opts.leave) lines.push("Your key stays on this phone until you send a hunt. It goes only to the AI you picked, after you agree. If no live reply comes back, this stays SAMPLE.");
    if (opts.huntLine) lines.push('<span id="flow-hunt-line">' + esc(opts.huntLine) + '</span>');
    if (opts.photo) lines.push("A photo stays on this phone until you agree to send it.");
    return '<aside class="flow-end" aria-label="Notes">' + lines.map(function (l) { return "<p>" + l + "</p>"; }).join("") + "</aside>";
  }
  function microNote() { return ""; }
  function openGate(opts) {
    var root = document.getElementById("legal-root");
    if (!root) { if (opts.onPrimary) opts.onPrimary(); return; }
    root.innerHTML = '<div class="legal-bg"><div class="legal-card" role="dialog" aria-modal="true" aria-labelledby="gate-title"><h2 id="gate-title">' + esc(opts.title) + '</h2>' +
      opts.lines.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") +
      '<div class="cta-stack"><button class="btn btn-gold" id="gate-go" type="button">' + esc(opts.primary) + '</button>' +
      (opts.secondary ? '<button class="btn btn-ghost" id="gate-no" type="button">' + esc(opts.secondary) + '</button>' : "") +
      "</div></div></div>";
    document.getElementById("gate-go").onclick = function () { root.innerHTML = ""; if (opts.onPrimary) opts.onPrimary(); };
    var no = document.getElementById("gate-no");
    if (no) no.onclick = function () { root.innerHTML = ""; if (opts.onSecondary) opts.onSecondary(); };
  }
  function showLegal() {
    /* friends-beta: Maurice end-only disclaimers — no first-open modal */
    LS.set("legalOk", true);
  }
  function photoGate(then) {
    if (LS.get("photoOk")) { if (then) then(); return; }
    openGate({
      title: "This photo",
      lines: [
        "A live photo can leave this phone so your AI can name the card.",
        "You will be asked again before it is sent."
      ],
      primary: "Continue",
      secondary: "Not now",
      onPrimary: function () { LS.set("photoOk", true); if (then) then(); }
    });
  }
  function leaveGate(onYes, onNo) {
    if (LS.get("leaveOk")) { onYes(); return; }
    openGate({
      title: "This leaves your phone",
      lines: [
        "This sends your hunt to the AI you connected (OpenAI, Anthropic, or Google), using your key.",
        "Your words, and the photo if you added one, leave this phone. Your AI's web search looks at public pages only.",
        "Sold comps come only from your Card Ladder. We never show sample prices as real."
      ],
      primary: "Continue",
      secondary: "Not now",
      onPrimary: function () { LS.set("leaveOk", true); onYes(); },
      onSecondary: function () { if (onNo) onNo(); }
    });
  }
  function canLive() {
    return CH_AI.connected(state.ai) && !!CH_AI.acceptKey(aiSecret());
  }
  function paintLive() {
    var slot = document.getElementById("live-slot");
    if (slot) slot.innerHTML = liveHuntBody();
    var line = document.getElementById("flow-hunt-line");
    if (line && state.liveHunt) line.textContent = CH_AI.huntLine(state.liveHunt);
  }
  function liveHuntBody() {
    var h = state.liveHunt;
    if (!h) return "";
    if (h.status === "live" && h.text) {
      var who = CH_AI.byId(h.provider);
      return '<section class="card live-reply" aria-label="Live AI reply"><div class="row between"><b>From ' + esc(who ? who.name : "your AI") + '</b></div><p style="margin:8px 0 0">' + esc(h.text) + '</p><p class="micro-note">From your AI. Not a sold price. Not advice. The card list below stays SAMPLE.</p></section>';
    }
    if (h.status === "pending") return '<p class="small muted">Asking your AI. Still SAMPLE until a reply returns.</p>';
    return '<p class="micro-note">' + esc(CH_AI.sampleLine(h)) + '</p>';
  }
  function shrinkPhoto(url) {
    return new Promise(function (resolve) {
      if (!url) { resolve(null); return; }
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1024, w = img.naturalWidth || img.width || 1, h = img.naturalHeight || img.height || 1;
          var scale = Math.min(1, max / Math.max(w, h));
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          var dataUrl = c.toDataURL("image/jpeg", 0.72);
          var cut = dataUrl.indexOf(",");
          resolve(cut > -1 ? { mime: "image/jpeg", data: dataUrl.slice(cut + 1) } : null);
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }
  function startLive(text, photoUrl) {
    var provider = CH_AI.normalize(state.ai).provider;
    function sample(reason) { state.liveHunt = { status: "sample", reason: reason, provider: provider }; }
    if (!canLive()) {
      sample(CH_AI.connected(state.ai) ? "no-key" : "skipped");
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      leaveGate(function () {
        state.liveHunt = { status: "pending", provider: provider };
        resolve();
        var ready = photoUrl ? shrinkPhoto(photoUrl) : Promise.resolve(null);
        ready.then(function (image) {
          return CH_AI.ask({ provider: provider, key: aiSecret(), text: text, image: image });
        }).then(function (res) {
          if (res && res.live && res.text) state.liveHunt = { status: "live", text: res.text, provider: res.provider || provider };
          else state.liveHunt = { status: "sample", reason: (res && res.reason) || "network", provider: provider };
          paintLive();
        }).catch(function () {
          state.liveHunt = { status: "sample", reason: "network", provider: provider };
          paintLive();
        });
      }, function () {
        sample("held");
        resolve();
      });
    });
  }
  function guardPhoto(input) {
    if (!input) return;
    view.querySelectorAll('label[for="' + input.id + '"]').forEach(function (label) {
      label.addEventListener("click", function (e) {
        if (LS.get("photoOk")) return;
        e.preventDefault();
        photoGate(function () { input.click(); });
      });
    });
  }

  /* Sample card art: a generic studio render (img/, source in ../art-source). No real player, brand or seller photo. */
  var ART_ALT = "Sample card: generic chrome base render in a slab, marked SAMPLE (not the actual card)";
  function cardArt() { return '<img class="card-img" src="img/sample-card-sm.webp" width="350" height="550" alt="' + ART_ALT + '">'; }
  function studioArt() { return '<img class="studio" src="img/sample-card-studio.jpg" width="1200" height="1200" alt="' + ART_ALT + '">'; }
  (new Image()).src = "img/sample-card-studio.jpg";

  var TABS = [
    { id: "scan", label: "Hunt", icon: "search", match: ["scan", "hunt", "analyze", "match", "confirm", "report", "unpriced"] },
    { id: "lists", label: "Lists", icon: "markets", match: ["lists", "markets"] },
    { id: "more", label: "More", icon: "more", match: ["more", "intent", "sites", "connections", "settings", "tool", "ask", "ledger", "deals", "daily"] }
  ];
  function renderTabs(route) {
    document.getElementById("tabbar").innerHTML = TABS.map(function (t) {
      var on = t.match.indexOf(route) > -1;
      return '<a href="#/' + t.id + '" class="' + (on ? "on" : "") + '"' + (on ? ' aria-current="page"' : "") + '>' + I(t.icon) + '<span>' + t.label + '</span></a>';
    }).join("");
  }
  document.getElementById("btn-settings").innerHTML = I("sliders");
  document.getElementById("btn-settings").addEventListener("click", function () { location.hash = "#/settings"; });

  function parseHash() {
    var h = (location.hash || "#/scan").replace(/^#\/?/, "");
    var parts = h.split("/");
    var route = parts[0] || "scan";
    if (route === "confirm") route = "match";
    return { route: route, sub: parts[1] || null };
  }
  function go() {
    clearTimers(); closeSheet(); state.connDirty = false; if (BOOM) BOOM.close(true);
    var p = parseHash();
    if (!state.intent && ["start", "intent", "sites"].indexOf(p.route) < 0) { location.replace("#/start/intent"); p = parseHash(); }
    var fn = ROUTES[p.route] || ROUTES.scan;
    var badge = document.querySelector(".badge-sample"); if (badge) badge.style.display = ["scan", "hunt", "start", "intent", "sites"].indexOf(p.route) > -1 ? "none" : "";
    var tb = document.getElementById("tabbar"); if (tb) tb.style.display = p.route === "start" ? "none" : "";
    renderTabs(ROUTES[p.route] ? p.route : "scan");
    view.style.animation = "none"; void view.offsetWidth; view.style.animation = "";
    fn(p);
    if (VOICE) VOICE.onRoute(p.route);
    window.scrollTo(0, 0);
  }

  /* CHECK — Home is 50/50: photo and AI hunt, equal, side by side. */
  function lastCheckedHTML() {
    var last = LS.get("lastCard", null);
    if (!last || !last.title) return "";
    return '<a class="tool" href="#/report" style="margin-top:12px"><span class="tic">' + I("report") + '</span><span class="tt"><b>Last checked</b><span>' + esc(last.title) + '</span></span>' + I("right") + '</a>';
  }
  function saveAi(next) { state.ai = CH_AI.normalize(next); LS.set("ai", state.ai); }
  function aiSecret() { var v = LS.get("ai_secret", ""); return typeof v === "string" ? v : ""; }
  function setAiSecret(key) {
    if (!key) { try { localStorage.removeItem("ch_ai_secret"); } catch (e) {} return; }
    LS.set("ai_secret", key);
  }
  function aiKeyField(id) {
    return '<div class="field"><label for="' + id + '">Your key</label><input class="input" id="' + id + '" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Paste your key"></div>';
  }
  function commitAi(providerId, keyRaw, keepExisting) {
    var typed = CH_AI.acceptKey(keyRaw);
    var key = typed || (keepExisting ? aiSecret() : "");
    if (!CH_AI.acceptKey(key)) { toast("Paste your key."); return false; }
    saveAi({ provider: providerId, skipped: false });
    if (typed) setAiSecret(typed);
    return true;
  }
  function disconnectAi() {
    saveAi({ provider: null, skipped: true });
    setAiSecret("");
  }
  var aiDraft = "chatgpt";
  function aiPickHTML(selected) {
    return CH_AI.providers.map(function (p) {
      var on = p.id === selected;
      return '<button type="button" class="ai-pick' + (on ? " on" : "") + '" data-ai="' + p.id + '" role="radio" aria-checked="' + (on ? "true" : "false") + '"><span class="srcmono">' + esc(p.mono) + '</span><span class="tt"><b>' + esc(p.name) + '</b><span>' + esc(p.blurb) + '</span></span></button>';
    }).join("");
  }
  function bindAiPicks(root, onPick) {
    var boxes = root.querySelectorAll("[data-ai]");
    boxes.forEach(function (b) {
      b.onclick = function () {
        boxes.forEach(function (o) { var on = o === b; o.classList.toggle("on", on); o.setAttribute("aria-checked", on ? "true" : "false"); });
        onPick(b.getAttribute("data-ai"));
      };
    });
  }
  function aiSheet(opts) {
    opts = opts || {};
    var cur = CH_AI.normalize(state.ai);
    var pick = cur.provider || "chatgpt";
    var chosen = CH_AI.byId(pick);
    var held = aiSecret();
    openSheet('<div class="eyebrow">Your AI</div><h2>' + esc(opts.title || (cur.provider ? "Your AI" : "Connect your AI")) + '</h2>' +
      '<p class="muted small" style="margin:0">' + esc(CH_AI.job.ai) + ' Card Ladder supplies the sold comps. It does not find cards to buy.</p>' +
      jobSplitHTML() +
      '<div class="ai-picks" role="radiogroup" aria-label="Preferred AI">' + aiPickHTML(pick) + '</div>' +
      (held ? '<p class="small muted" style="margin:8px 0 0">Key on this phone · …' + esc(CH_AI.maskKey(held)) + '</p>' : "") +
      aiKeyField("ai-key-sheet") +
      '<div class="cta-stack"><button class="btn btn-gold" id="ai-go" type="button">' + (cur.provider ? "Save" : "Connect " + esc(chosen.name)) + '</button>' +
      (cur.provider || held ? '<button class="btn btn-ghost" id="ai-off" type="button">Disconnect</button>' : "") + '</div>' +
      flowEnd({ leave: true }), function (sh) {
        bindAiPicks(sh, function (id) {
          pick = id;
          var btn = document.getElementById("ai-go");
          var name = CH_AI.byId(id);
          if (btn && name && !cur.provider) btn.textContent = "Connect " + name.name;
        });
        document.getElementById("ai-go").onclick = function () {
          var field = document.getElementById("ai-key-sheet");
          if (!commitAi(pick, field ? field.value : "", true)) return;
          closeSheet();
          var name = CH_AI.byId(pick);
          toast((name ? name.name : "AI") + " connected on this phone.");
          if (opts.then) { opts.then(); return; }
          if (parseHash().route === "scan") scanScreen(); else go();
        };
        var off = document.getElementById("ai-off");
        if (off) off.onclick = function () {
          disconnectAi();
          closeSheet();
          toast("Using sample results on this phone.");
          if (parseHash().route === "scan") scanScreen(); else go();
        };
      });
  }
  /* HOME — the hunt box leads. Photo ID is secondary. */
  var HUNT_EXAMPLES = {
    flip: ["98 Chrome rookies PSA 9 under $150", "Raw Wemby Prizm under comp", "Pokémon slabs priced under recent sales"],
    hold: ["Clean Jordan inserts under $300", "Ohtani rookies with great centering", "Charizard I'd keep forever"],
    grade: ["Cards Card Doc could clean that would grade higher", "Raw 90s Chrome stars, sharp corners", "Raw Pokémon holos with good centering"],
    other: ["98 Chrome rookies PSA 9 under $150", "Cards Card Doc could clean that would grade higher", "Star Wars autos under $100"]
  };
  function intentNow() { return CH_HUNT.intentById(state.intent) || null; }
  function ladderBannerHTML() {
    var phase = ladderHookPhase();
    var t = phase === "awaiting" ? "Card Ladder hook set · waiting for sales" : "Live sold comps need your Card Ladder";
    return '<button type="button" class="ai-banner" id="ladder-open"><span><b>' + t + '</b><span>Required for live comps. Hunting works without it.</span></span>' + I("right") + '</button>';
  }
  function aiBannerHTML() {
    var ai = CH_AI.normalize(state.ai), who = ai.provider ? CH_AI.byId(ai.provider) : null;
    if (who && canLive()) return '<button type="button" class="ai-banner on" id="ai-open"><span><b>' + esc(who.name) + ' hunts for you</b><span>Uses its web search · key on this phone …' + esc(CH_AI.maskKey(aiSecret())) + '</span></span><span class="chip">Change</span></button>';
    return '<button type="button" class="ai-banner" id="ai-open"><span><b>Connect your AI to hunt</b><span>ChatGPT, Claude, or Gemini. Your key stays on this phone.</span></span>' + I("right") + '</button>';
  }
  function scanScreen() {
    var it = intentNow();
    var ex = HUNT_EXAMPLES[(it && it.id) || "other"];
    var frame = state.photo
      ? '<img class="photo" src="' + state.photo + '" alt="Your card photo preview"><div class="corners"><i></i><i></i><i></i><i></i></div>'
      : '<div class="grid-ov"></div><div class="corners"><i></i><i></i><i></i><i></i></div><div class="scan-empty"><div class="ring">' + I("camera") + '</div><b>Frame the card</b>Slab or raw.</div>';
    var last = state.hunt && state.hunt.query ? '<a class="tool" href="#/hunt" style="margin-top:12px"><span class="tic">' + I("search") + '</span><span class="tt"><b>Last hunt</b><span>' + esc(state.hunt.query) + ' · ' + ((state.hunt.items || []).length) + ' found</span></span>' + I("right") + '</a>' : "";
    view.innerHTML =
      '<section class="hunt-hero" aria-label="Hunt">' +
        '<div class="eyebrow">' + esc(it ? it.label : "Hunt") + '</div>' +
        '<h1 class="h1">What are you hunting?</h1>' +
        '<p class="lead">' + esc(it ? it.lead : "Describe it. Your AI hunts it.") + ' Say it in plain words.</p>' +
        '<textarea class="input hunt-box" id="hunt-q" rows="3" placeholder="' + esc(ex[0]) + '" aria-label="Describe what you want"></textarea>' +
        '<button class="btn btn-gold" id="hunt-go" type="button">' + I("search") + 'Hunt</button>' +
        '<div class="ex-row" aria-label="Examples">' + ex.map(function (e) { return '<button type="button" class="ex-chip" data-ex="' + esc(e) + '">' + esc(e) + '</button>'; }).join("") + '</div>' +
      '</section>' +
      aiBannerHTML() + ladderBannerHTML() + last +
      '<details class="photo-more"><summary>' + I("camera") + ' Check a card by photo</summary>' +
        '<section class="home-pane" aria-label="What\'s this card?">' +
          '<div class="scan-frame">' + frame + '</div>' +
          '<input class="file-input" id="file" type="file" accept="image/*" capture="environment">' +
          (state.photo ? '<button class="btn btn-gold" id="go-analyze" type="button">Name this card</button><label class="btn btn-ghost" for="file">Retake</label>' : '<label class="btn btn-ghost" for="file">Take or upload a photo</label>') +
          '<p class="small muted" style="margin:0">Names the card. Comps need your Card Ladder.</p>' +
        '</section></details>' +
      '<aside class="flow-end" aria-label="Notes"><p>Hunt results are real listings from your AI\'s live web search. Your words go only to the AI you picked, after you agree. Your key stays on this phone.</p><p>Sold comps, lists, and charts elsewhere in this beta are <b>SAMPLE</b> unless your Card Ladder is linked.</p><p>A photo stays on this phone until you agree to send it. Not financial advice.</p></aside>';
    if (state.photo) view.querySelector(".photo-more").open = true;
    var f = document.getElementById("file");
    if (f) {
      f.addEventListener("change", function () {
        var file = f.files && f.files[0]; if (!file) return;
        if (state.photo) URL.revokeObjectURL(state.photo);
        state.photo = URL.createObjectURL(file); scanScreen();
      });
      guardPhoto(f);
    }
    var a = document.getElementById("go-analyze");
    if (a) a.onclick = function () { state.check = null; location.hash = "#/analyze"; };
    var box = document.getElementById("hunt-q");
    document.getElementById("hunt-go").onclick = function () { submitHunt(box.value); };
    box.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitHunt(box.value); } });
    view.querySelectorAll("[data-ex]").forEach(function (b) { b.onclick = function () { box.value = b.dataset.ex; box.focus(); }; });
    document.getElementById("ladder-open").onclick = function () { connectSheet("cardladder"); };
    document.getElementById("ai-open").onclick = function () { aiSheet(); };
  }

  /* HUNT — the user's AI searches live listings; refine with chips. */
  function saveHunt() { LS.set("hunt", state.hunt); }
  function submitHunt(q) {
    q = String(q || "").trim();
    if (!q) { toast("Say what you want."); return; }
    if (window.CH_CRISIS && CH_CRISIS.match(q)) { openGate({ title: "You are not alone", lines: [CH_CRISIS.message()], primary: "OK" }); return; }
    state.hunt = { query: q, chips: [], items: [], log: [{ who: "you", text: q }], status: "idle", at: Date.now() };
    saveHunt();
    state.huntQueued = true;
    if (parseHash().route === "hunt") huntScreen(); else location.hash = "#/hunt";
  }
  function runHunt() {
    var h = state.hunt; if (!h) return;
    if (!canLive()) {
      h.status = "needai"; saveHunt(); paintHunt();
      aiSheet({ then: function () { runHunt(); }, title: "Connect your AI to hunt" });
      return;
    }
    leaveGate(function () {
      var provider = CH_AI.normalize(state.ai).provider;
      h.status = "pending"; h.provider = provider; saveHunt(); paintHunt();
      var seq = (runHunt.seq = (runHunt.seq || 0) + 1);
      CH_HUNT.run({ provider: provider, key: aiSecret(), query: h.query, chips: h.chips, intent: state.intent, sites: state.huntSites, campid: CFG.epnCampaignId }).then(function (r) {
        if (seq !== runHunt.seq || state.hunt !== h) return;
        if (r.ok) {
          h.items = r.items; h.verified = r.verified; h.dropped = r.dropped; h.status = "done"; h.at = Date.now();
          var shown = CH_HUNT.applyChips(r.items, h.chips).length;
          h.log.push({ who: "ai", text: (r.reply || (shown ? "Here's what I found." : "Nothing real matched yet.")) + (r.dropped && (r.dropped.noUrl + r.dropped.unseen) ? " (" + (r.dropped.noUrl + r.dropped.unseen) + " dropped: no real listing link.)" : "") });
        } else {
          h.status = "error"; h.error = CH_HUNT.failLine(r);
          h.log.push({ who: "ai", text: h.error, bad: true });
        }
        saveHunt(); paintHunt();
      });
    }, function () { h.status = "held"; saveHunt(); paintHunt(); });
  }
  function huntResultHTML(it, i) {
    var ship = it.shipping == null ? "+ ship ?" : (it.shipping === 0 ? "Free ship" : "+ " + money(it.shipping, true) + " ship");
    var g = it.grade ? '<span class="chip">' + esc(it.grade) + '</span>' : "";
    return '<article class="hr-card">' +
      '<button type="button" class="hr-main" data-pick="' + i + '" aria-label="Confirm this exact card">' +
        (it.image ? '<img class="hr-img" src="' + esc(it.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'hr-img none\'}))">' : '<div class="hr-img none" aria-hidden="true">' + I("gem") + '</div>') +
        '<span class="hr-body"><b class="hr-title">' + esc(it.title) + '</b>' +
          '<span class="hr-price"><em class="num">' + money(it.price, true) + '</em> <span class="small muted">' + ship + '</span></span>' +
          '<span class="hr-meta"><span class="chip gold">' + esc(it.source) + '</span>' + g + '</span>' +
          (it.why ? '<span class="hr-why">' + esc(it.why) + '</span>' : "") +
        '</span></button>' +
      '<div class="hr-actions"><a class="btn btn-ghost btn-sm" href="' + esc(it.link || it.url) + '" target="_blank" rel="noopener noreferrer sponsored">Open listing ' + I("right") + '</a><button type="button" class="btn btn-gold btn-sm" data-pick="' + i + '">Confirm card</button></div>' +
    '</article>';
  }
  function paintHunt() {
    if (parseHash().route !== "hunt") return;
    var slot = document.getElementById("hunt-body"); if (!slot) { huntScreen(); return; }
    var h = state.hunt;
    var items = CH_HUNT.applyChips(h.items || [], h.chips);
    var chips = (h.chips || []).map(function (c, i) { return '<button type="button" class="rchip" data-unchip="' + i + '" aria-label="Remove ' + esc(c.text) + '">' + esc(c.text) + ' <span aria-hidden="true">×</span></button>'; }).join("");
    document.getElementById("hunt-chips").innerHTML = chips;
    document.getElementById("hunt-log").innerHTML = (h.log || []).slice(-2).map(function (m) { return '<p class="msg ' + (m.who === "you" ? "me" : "ai") + (m.bad ? " bad" : "") + '">' + esc(m.text) + '</p>'; }).join("");
    var body = "";
    if (h.status === "pending") body = '<div class="hunt-wait"><span class="spin" aria-hidden="true"></span><b>Your AI is searching live listings…</b><span class="small muted">Keep this screen open.</span></div>';
    else if (h.status === "needai") body = '<div class="card"><b>Connect your AI to hunt.</b><p class="small muted" style="margin:6px 0 10px">One step. Your key stays on this phone.</p><button class="btn btn-gold" id="hunt-ai" type="button">Connect AI</button></div>';
    else if (h.status === "held") body = '<div class="card"><b>Kept on this phone.</b><p class="small muted" style="margin:6px 0 10px">Nothing was sent.</p><button class="btn btn-gold" id="hunt-retry" type="button">Hunt</button></div>';
    else if (h.status === "error") body = '<div class="card bad-card"><b>' + esc(h.error || "Hunt failed.") + '</b><button class="btn btn-ghost" id="hunt-retry" type="button" style="margin-top:10px">Try again</button></div>';
    else if (!items.length && h.status === "done") body = '<div class="empty">No real listings match' + ((h.items || []).length ? " these chips. Remove one or hunt again." : ". Try a looser ask.") + '</div>';
    else body = items.map(huntResultHTML).join("");
    if (h.status === "done" && (h.items || []).length) body = '<p class="small muted hunt-count">' + items.length + ' real listing' + (items.length === 1 ? "" : "s") + (h.verified ? " · links seen in your AI's search" : "") + ' · tap one to confirm the exact card</p>' + body;
    if (h.chipsDirty && h.status === "done") body = '<button class="btn btn-ghost" id="hunt-again" type="button" style="margin-bottom:12px">Hunt again with these chips</button>' + body;
    slot.innerHTML = body;
    var sites = CH_HUNT.sitesFor(state.huntSites);
    document.getElementById("hunt-open").innerHTML = '<h2 class="h3">Search your sites yourself</h2><div class="site-links">' + sites.map(function (s) { return '<a class="chip" href="' + esc(s.search(h.query + " " + (h.chips || []).map(function (c) { return c.filter.exclude ? "" : c.text; }).join(" "))) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name) + '</a>'; }).join("") + '</div>';
    view.querySelectorAll("[data-unchip]").forEach(function (b) { b.onclick = function () { h.chips.splice(+b.dataset.unchip, 1); h.chipsDirty = true; saveHunt(); paintHunt(); }; });
    view.querySelectorAll("[data-pick]").forEach(function (b) { b.onclick = function () { pickListing(items[+b.dataset.pick]); }; });
    var r1 = document.getElementById("hunt-retry"); if (r1) r1.onclick = runHunt;
    var r2 = document.getElementById("hunt-again"); if (r2) r2.onclick = function () { h.chipsDirty = false; runHunt(); };
    var r3 = document.getElementById("hunt-ai"); if (r3) r3.onclick = function () { aiSheet({ then: runHunt, title: "Connect your AI to hunt" }); };
  }
  function huntScreen() {
    var h = state.hunt;
    if (!h || !h.query) { location.hash = "#/scan"; return; }
    view.innerHTML = '<a class="link-btn" href="#/scan">' + I("left") + 'New hunt</a>' +
      '<h1 class="h2 hunt-q">' + esc(h.query) + '</h1>' +
      '<div class="rchips" id="hunt-chips"></div>' +
      '<div class="hunt-log" id="hunt-log" aria-live="polite"></div>' +
      '<form class="refine" id="refine"><input class="input" id="refine-q" placeholder="Refine: only PSA 9+, under $200, no Moss" autocomplete="off" aria-label="Refine the hunt"><button class="btn btn-gold btn-sm" type="submit">Refine</button></form>' +
      '<div id="hunt-body" aria-live="polite"></div>' +
      '<div id="hunt-open" class="hunt-open"></div>' +
      '<aside class="flow-end"><p>Listings come from your AI\'s live web search of public pages. Price and availability can change. Check the listing before you buy. CardHound never buys or bids for you.</p><p>Not financial advice.</p>' + (/^\d{10}$/.test(String(CFG.epnCampaignId || "")) ? '<p>eBay links may earn CardHound a commission. Your price stays the same.</p>' : "") + '</aside>';
    document.getElementById("refine").onsubmit = function (e) {
      e.preventDefault();
      var inp = document.getElementById("refine-q"), t = inp.value.trim(); if (!t) return;
      if (window.CH_CRISIS && CH_CRISIS.match(t)) { openGate({ title: "You are not alone", lines: [CH_CRISIS.message()], primary: "OK" }); return; }
      var c = CH_HUNT.parseRefine(t);
      h.chips.push(c); h.log.push({ who: "you", text: t }); h.chipsDirty = false; inp.value = "";
      saveHunt(); paintHunt(); runHunt();
    };
    paintHunt();
    if (state.huntQueued) { state.huntQueued = false; runHunt(); }
  }
  function pickListing(it) {
    if (!it) return;
    var cand = { year: it.year, set: it.set, number: it.number, player: it.player, variant: it.variant || (/(psa|bgs|sgc|cgc)/i.test(it.grade) ? "" : ""), name: it.title, id: it.id, score: it.fit, priceable: false, rawVariant: it.variant };
    var full = !!(cand.set && cand.number && cand.variant);
    state.liveHunt = null;
    state.check = { source: "listing", listing: it, image: it.image, query: it.title, candidates: full ? [cand] : [], catalog: sampleCatalog(),
      read: (cand.year && cand.set) ? cand : null, prefill: { year: it.year, set: it.set, card_number: it.number, player: it.player, variant: it.variant } };
    state.pickedCandidate = 0; state.fromFlow = true;
    location.hash = "#/match";
  }

  /* ONBOARDING — intention, then where you hunt. Editable under More. */
  function onboardScreen(p, mode) {
    var step = mode || (p && p.sub) || "intent";
    var editing = !!mode;
    if (step === "intent") {
      view.innerHTML = (editing ? '<a class="link-btn" href="#/more">' + I("left") + 'More</a>' : '<div class="eyebrow">Welcome to CardHound</div>') +
        '<h1 class="h1">What\'s your intention?</h1><p class="lead">We aim every hunt at it. Change it anytime under More.</p>' +
        '<div class="intent-list" role="radiogroup" aria-label="Your intention">' + CH_HUNT.INTENTS.map(function (x) {
          var on = state.intent === x.id;
          return '<button type="button" class="intent' + (on ? " on" : "") + '" role="radio" aria-checked="' + on + '" data-intent="' + x.id + '"><b>' + esc(x.label) + '</b><span>' + esc(x.sub) + '</span></button>';
        }).join("") + '</div>';
      view.querySelectorAll("[data-intent]").forEach(function (b) {
        b.onclick = function () {
          var x = CH_HUNT.intentById(b.dataset.intent);
          state.intent = x.id; LS.set("intent", x.id);
          if (!LS.get("alertsTouched", false)) { state.alerts = { threshold: x.alertPct, on: true }; LS.set("alerts", state.alerts); }
          if (editing) { toast("Saved: " + x.label); location.hash = "#/more"; } else location.hash = "#/start/sites";
        };
      });
      return;
    }
    var picked = (state.huntSites && state.huntSites.length ? state.huntSites : CH_HUNT.DEFAULT_SITES).slice();
    view.innerHTML = (editing ? '<a class="link-btn" href="#/more">' + I("left") + 'More</a>' : '<a class="link-btn" href="#/start/intent">' + I("left") + 'Back</a>') +
      '<h1 class="h1">Where do you hunt cards?</h1><p class="lead">If you look for cards on these sites, link them here so your AI hunt searches where you shop.</p>' +
      '<div class="site-list">' + CH_HUNT.SITES.map(function (s) {
        var on = picked.indexOf(s.id) > -1;
        return '<button type="button" class="site' + (on ? " on" : "") + '" aria-pressed="' + on + '" data-site="' + s.id + '"><span class="srcmono">' + esc(s.mono) + '</span><span class="tt"><b>' + esc(s.name) + '</b><span>' + esc(s.line) + '</span></span><span class="tick" aria-hidden="true">' + I("check") + '</span></button>';
      }).join("") + '</div>' +
      '<p class="small muted">Public pages only. No passwords. Nothing behind a login is searched.</p>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="sites-go" type="button">' + (editing ? "Save" : "Done") + '</button>' + (editing ? "" : '<button class="btn btn-ghost" id="sites-skip" type="button">Skip</button>') + '</div>';
    view.querySelectorAll("[data-site]").forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.site, k = picked.indexOf(id);
        if (k > -1) picked.splice(k, 1); else picked.push(id);
        b.classList.toggle("on", k < 0); b.setAttribute("aria-pressed", k < 0);
      };
    });
    document.getElementById("sites-go").onclick = function () {
      state.huntSites = picked; LS.set("huntSites", picked); LS.set("onboarded", true);
      if (editing) { toast("Saved."); location.hash = "#/more"; } else location.hash = "#/scan";
    };
    var sk = document.getElementById("sites-skip");
    if (sk) sk.onclick = function () { LS.set("onboarded", true); location.hash = "#/scan"; };
  }

  /* ANALYZE */
  var STEPS = [["Reading the card", "Edges, text, card number"], ["Matching the exact version", "Set, year, parallel, refractor"], ["Pulling comps", "Sold prices, raw and graded"], ["Checking trends", "30, 90 and 365 days"], ["Building your call", "Fees, grading math, risk"]];
  function analyzeScreen() {
    state.check = null;
    function draw() {
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
      '<div><h1 class="an-title">CardHound is analyzing<span class="dots"></span></h1><p class="muted small" style="margin:4px 0 0">' + (state.liveHunt && state.liveHunt.status === "pending" ? "Asking your AI. Sold prices stay SAMPLE until a reply returns." : "Sample card. Results stay SAMPLE until a live reply returns.") + '</p></div>' +
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
    if (state.photo && canLive()) startLive("Name this card from the photo.", state.photo).then(draw);
    else {
      state.liveHunt = { status: "sample", reason: CH_AI.connected(state.ai) ? "no-key" : "skipped", provider: CH_AI.normalize(state.ai).provider };
      draw();
    }
  }


  /* Set picker: searchable list with year: set / Set: name labels. */
  /* Kind / category — TOP_KINDS native <select> (Maurice lock Oct 6).
   * Confirm + Markets/Daily use one dropdown, not a searchable kind wall. */
  var TOP_KINDS = [
    "Disney", "Marvel", "Football", "Basketball", "Baseball", "Hockey",
    "Pokémon", "Magic", "Yu-Gi-Oh!", "Lorcana", "One Piece",
    "Star Wars", "Simpsons", "WWE", "Soccer", "Golf",
    "Racing", "Garbage Pail Kids", "Digimon", "Flesh and Blood"
  ];
  var KIND_FAMILY = {
    "Basketball": "Sport", "Baseball": "Sport", "Football": "Sport", "Hockey": "Sport",
    "Soccer": "Sport", "Golf": "Sport", "Racing": "Sport", "Boxing": "Sport", "MMA": "Sport",
    "Tennis": "Sport", "Wrestling": "Sport",
    "Pokémon": "TCG", "Magic": "TCG", "Yu-Gi-Oh!": "TCG", "Lorcana": "TCG", "One Piece": "TCG",
    "Flesh and Blood": "TCG", "Digimon": "TCG", "Dragon Ball": "TCG", "Weiss Schwarz": "TCG",
    "Marvel": "Non-sport", "Star Wars": "Non-sport", "Simpsons": "Non-sport", "WWE": "Non-sport",
    "Garbage Pail Kids": "Non-sport", "Disney": "Non-sport", "Harry Potter": "Non-sport",
    "Lord of the Rings": "Non-sport", "Fortnite": "Non-sport", "Music": "Non-sport"
  };
  function kindFamily(id) {
    return KIND_FAMILY[id] || "Other";
  }
  function kindLabel(id) {
    id = String(id || "").trim();
    if (!id) return "";
    return kindFamily(id) + ": " + id;
  }
  /** Native <select> of TOP_KINDS (+ optional empty “Any kind”). Extra selected value kept if not in list. */
  function kindSelectHTML(selected, opts) {
    opts = opts || {};
    var id = opts.id || "o-kind";
    var emptyLabel = opts.emptyLabel;
    var sel = String(selected || "").trim();
    var html = '<select class="input" id="' + esc(id) + '"' + (opts.ariaLabel ? ' aria-label="' + esc(opts.ariaLabel) + '"' : "") + '>';
    if (emptyLabel != null) {
      html += '<option value="">' + esc(emptyLabel) + '</option>';
    }
    var seen = {};
    TOP_KINDS.forEach(function (k) {
      seen[k.toLowerCase()] = true;
      html += '<option value="' + esc(k) + '"' + (sel.toLowerCase() === k.toLowerCase() ? " selected" : "") + ">" + esc(kindLabel(k)) + "</option>";
    });
    if (sel && !seen[sel.toLowerCase()]) {
      html += '<option value="' + esc(sel) + '" selected>' + esc(kindLabel(sel)) + "</option>";
    }
    return html + "</select>";
  }
  function bindKindSelectForSets() {
    var kindEl = document.getElementById("o-kind");
    if (!kindEl) return;
    kindEl.onchange = function () {
      if (typeof bindSetPick === "function") bindSetPick();
    };
  }

  function setLabel(year, set) {
    year = String(year || "").trim(); set = String(set || "").trim();
    if (year && set) return year + ": " + set;
    if (set) return "Set: " + set;
    return year || "";
  }
  function allSets() {
    var seen = {}, out = [];
    var kindEl = document.getElementById("o-kind");
    var kindFilter = (kindEl && kindEl.value.trim()) || "";
    function add(year, set) {
      set = String(set || "").trim(); if (!set) return;
      var y = String(year || "").trim();
      var k = y + "|" + set.toLowerCase();
      if (seen[k]) return; seen[k] = true;
      out.push({ year: y, set: set, label: setLabel(y, set) });
    }
    sampleCatalog().forEach(function (c) {
      if (kindFilter && c.category && String(c.category).toLowerCase() !== kindFilter.toLowerCase()) return;
      add(c.year, c.set);
    });
    if (!kindFilter) ((state.meta && state.meta.sets) || []).forEach(function (s) { add("", s); });
    out.sort(function (a, b) {
      if (a.year && b.year && a.year !== b.year) return b.year.localeCompare(a.year);
      if (a.year && !b.year) return -1;
      if (!a.year && b.year) return 1;
      return a.set.localeCompare(b.set);
    });
    return out;
  }
  function filterSets(q) {
    q = String(q || "").trim().toLowerCase();
    var all = allSets();
    if (!q) return all;
    return all.filter(function (s) {
      return s.label.toLowerCase().indexOf(q) > -1 || s.set.toLowerCase().indexOf(q) > -1 || (s.year && s.year.indexOf(q) > -1);
    });
  }
  function setPickHTML(q, selected) {
    var rows = filterSets(q);
    if (!rows.length) return '<p class="small muted setpick-empty" style="margin:8px 0 0">No sets match. Keep typing.</p>';
    return '<div class="setpick" id="o-set-pick" role="listbox">' + rows.slice(0, 48).map(function (s) {
      var on = selected && selected.toLowerCase() === s.set.toLowerCase();
      return '<button type="button" class="setpick-item' + (on ? " on" : "") + '" data-set="' + esc(s.set) + '" data-year="' + esc(s.year) + '" role="option">' + esc(s.label) + '</button>';
    }).join("") + '</div>';
  }
  function readManualSet() {
    var qEl = document.getElementById("o-set-q");
    var hid = document.getElementById("o-set");
    var raw = ((qEl && qEl.value) || (hid && hid.value) || "").trim();
    var m = raw.match(/^(\d{4})\s*:\s*(.+)$/);
    if (m) return { year: m[1], set: m[2].trim() };
    var set = ((hid && hid.value) || raw).trim();
    if (/^set:\s*/i.test(set)) set = set.replace(/^set:\s*/i, "").trim();
    return { year: "", set: set };
  }
  function bindSetPick() {
    var q = document.getElementById("o-set-q");
    var hid = document.getElementById("o-set");
    if (!q || !hid) return;
    function paint() {
      var wrap = q.parentNode;
      var html = setPickHTML(q.value, hid.value);
      var tmp = document.createElement("div"); tmp.innerHTML = html;
      var next = tmp.firstChild;
      var cur = wrap.querySelector("#o-set-pick, .setpick-empty");
      if (cur) wrap.replaceChild(next, cur); else wrap.appendChild(next);
      wire();
    }
    function wire() {
      var pick = document.getElementById("o-set-pick");
      if (!pick) return;
      pick.querySelectorAll(".setpick-item").forEach(function (b) {
        b.onclick = function () {
          hid.value = b.dataset.set || "";
          q.value = b.dataset.year ? (b.dataset.year + ": " + b.dataset.set) : ("Set: " + b.dataset.set);
          var y = document.getElementById("o-year");
          if (y && b.dataset.year && !y.value.trim()) y.value = b.dataset.year;
          paint();
        };
      });
    }
    q.oninput = function () {
      var m = q.value.trim().match(/^(\d{4})\s*:\s*(.+)$/);
      if (m) hid.value = m[2].trim();
      else {
        var t = q.value.trim().replace(/^set:\s*/i, "").trim();
        hid.value = t;
      }
      paint();
    };
    wire();
  }

  /* CONFIRM — always required, even a single photo match. */
  function sampleCatalog() {
    return CH_SETGUARD.structureAll((window.CARDHOUND_SAMPLE && CARDHOUND_SAMPLE.candidates) || []);
  }
  function renderConfirm(pack) {
    state.check = pack;
    var c = pack.candidates || [];
    if (state.pickedCandidate >= c.length) state.pickedCandidate = 0;
    var pre = pack.prefill || {};
    var isListing = pack.source === "listing";
    var thumb = isListing && pack.image ? '<img src="' + esc(pack.image) + '" alt="" referrerpolicy="no-referrer" style="width:60px;height:60px;object-fit:cover;border-radius:14px;border:1px solid var(--line)">' : state.photo ? '<img src="' + state.photo + '" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:14px;border:1px solid var(--line)">' : '<div style="width:46px;flex:none">' + cardArt() + '</div>';
    var rows = c.map(function (x, i) {
      return '<button type="button" class="cand' + (i === state.pickedCandidate ? " on" : "") + '" data-i="' + i + '"><span class="rad"></span><span class="ct"><b>' + esc(x.player || x.name) + '</b>' +
        '<span class="setrow"><span class="setchip">' + esc(setLabel(x.year, x.set)) + '</span><span class="setchip">#' + esc(x.number) + '</span><span class="setchip">' + esc(x.variant || "Variant") + '</span></span></span></button>';
    }).join("");
    view.innerHTML = '<a class="link-btn" href="' + (isListing ? "#/hunt" : "#/scan") + '">' + I("left") + 'Back</a>' +
      '<div class="row" style="gap:14px;margin-top:12px">' + thumb + '<div><h1 class="h2">Is this the exact card?</h1></div></div>' +
      '<p class="lead">Set must match the cardboard. Topps ≠ Topps Chrome ≠ Update. Base ≠ Refractor / parallel.</p>' +
      (isListing ? '<p class="small muted" style="margin:0 0 8px">Listing: ' + esc(pack.listing.title) + '</p><span class="chip gold">From the listing title · check it</span>' : '<div id="live-slot">' + liveHuntBody() + '</div><span class="chip">SAMPLE</span>') +
      (rows || '<div class="card" style="margin-top:12px"><b>No single match yet.</b><p class="small muted" style="margin:6px 0 0">Type the year, set, number, and variant.</p></div>') +
      '<div class="card" style="margin-top:14px"><button class="row between" id="ovr" type="button" style="width:100%;min-height:48px"><span class="row" style="gap:10px"><b style="font-size:15px">Type the set myself</b></span><span class="dim">' + I("down") + '</span></button>' +
      '<div id="ovr-form" ' + (c.length ? "hidden" : "") + '><div class="grid2"><div class="field"><label for="o-year">Year</label><input class="input" id="o-year" placeholder="2001" inputmode="numeric" value="' + esc(pre.year || "") + '"></div><div class="field"><label for="o-num">Card #</label><input class="input" id="o-num" placeholder="T247" value="' + esc(pre.card_number || pre.number || "") + '"></div></div>' +
      '<div class="field"><label for="o-kind">Kind</label>' + kindSelectHTML(pre.category || "", { id: "o-kind", emptyLabel: "Any kind" }) + '</div>' +
      '<div class="field"><label for="o-set-q">Set</label><input class="input" id="o-set-q" placeholder="Search year or set" autocomplete="off" value="' + esc(pre.set ? setLabel(pre.year, pre.set) : "") + '"><input type="hidden" id="o-set" value="' + esc(pre.set || "") + '">' + setPickHTML(pre.set || "", pre.set || "") + '</div><div class="field"><label for="o-player">Player or subject</label><input class="input" id="o-player" placeholder="Albert Pujols" value="' + esc(pre.player || "") + '"></div>' +
      '<div class="field"><label for="o-var">Parallel or variant</label><input class="input" id="o-var" placeholder="Base, Refractor, Gold /50" value="' + esc(pre.parallel_color || pre.variant || "") + '"></div>' +
      '<p class="confirm-err" id="confirm-err" hidden>Add the set (example: 1998 Topps Chrome).</p></div></div>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="confirm" type="button">Confirm — show sold prices</button><a class="btn btn-ghost" href="#/scan">Start over</a></div>' + flowEnd({ leave: true, huntLine: state.liveHunt ? CH_AI.huntLine(state.liveHunt) : "" }) + footer();
    view.querySelectorAll(".cand").forEach(function (b) { b.onclick = function () { state.pickedCandidate = +b.dataset.i; view.querySelectorAll(".cand").forEach(function (o) { o.classList.toggle("on", o === b); }); }; });
    document.getElementById("ovr").onclick = function () { var f = document.getElementById("ovr-form"); f.hidden = !f.hidden; if (!f.hidden) { bindKindSelectForSets(); bindSetPick(); } };
    document.getElementById("confirm").onclick = function () { confirmExact(pack); };
    if (document.getElementById("ovr-form") && !document.getElementById("ovr-form").hidden) { bindKindSelectForSets(); bindSetPick(); }
  }
  function confirmExact(pack) {
    var form = document.getElementById("ovr-form");
    var manualOn = form && !form.hidden;
    var picked;
    if (manualOn) {
      var ms = readManualSet();
      var kindEl = document.getElementById("o-kind");
      picked = {
        year: document.getElementById("o-year").value.trim() || ms.year,
        set: ms.set,
        number: document.getElementById("o-num").value.trim(),
        player: document.getElementById("o-player").value.trim(),
        variant: document.getElementById("o-var").value.trim(),
        category: (kindEl && kindEl.value.trim()) || ""
      };
    } else picked = (pack.candidates || [])[state.pickedCandidate] || null;
    if (!picked) {
      var err = document.getElementById("confirm-err");
      if (form) form.hidden = false;
      if (err) { err.hidden = false; err.textContent = "Add the set (example: 1998 Topps Chrome)."; }
      return;
    }
    var decision = CH_SETGUARD.evaluate(picked, {
      read: pack.read || null,
      catalog: pack.catalog || sampleCatalog(),
      explicitPick: true,
      ambiguous: (pack.candidates || []).length > 1 && !manualOn ? false : !!(pack.candidates && pack.candidates.length > 1 && !CH_SETGUARD.confirmRequired())
    });
    if (!decision.priced && /^missing_/.test(decision.code)) {
      if (form) form.hidden = false;
      var err2 = document.getElementById("confirm-err");
      if (err2) { err2.hidden = false; err2.textContent = decision.detail; }
      return;
    }
    var card = (decision && decision.picked) ? decision.picked : picked;
    var pending = hookPendingRows();
    /* Real listing: never show SAMPLE comps. Mismatch → UNPRICED; no Ladder rows → comps wait. */
    if (pack.source === "listing") {
      if (!decision.priced && decision.code !== "no_exact_comp") { state.liveSales = null; state.unpriced = decision; location.hash = "#/unpriced"; return; }
      if (!pending.length) {
        state.liveSales = null;
        state.unpriced = { priced: false, showPrices: false, code: "ladder_needed", title: "Comps wait", ladder: true,
          headline: "Exact card confirmed. Live comps need your Card Ladder.",
          detail: "Link Card Ladder (paste your sold history) to see sale-by-sale comps for this exact set, parallel, and year. We never show sample prices for a real listing.",
          pickedLine: CH_SETGUARD.lineOf(card), readLine: "", picked: card };
        location.hash = "#/unpriced"; return;
      }
    }
    /* When the user has pasted sold rows, comps come only from exact setguard matches — never SAMPLE inventions. */
    if (pending.length) {
      if (!decision.priced && decision.code !== "no_exact_comp") {
        state.liveSales = null;
        state.unpriced = decision;
        location.hash = "#/unpriced";
        return;
      }
      var kept = matchHookSalesFor(card);
      if (!kept.length) {
        state.liveSales = null;
        state.unpriced = {
          priced: false, showPrices: false, code: "no_exact_comp", title: "UNPRICED",
          headline: "We won't guess the set.",
          detail: "No exact-card comps in your Ladder sold history for that set and variant. We won't borrow another card's price.",
          pickedLine: CH_SETGUARD.lineOf(card), readLine: "", picked: card
        };
        location.hash = "#/unpriced";
        return;
      }
      state.liveSales = kept;
      state.unpriced = null;
      state.confirmed = card;
      location.hash = "#/report";
      return;
    }
    state.liveSales = null;
    if (!decision.priced) { state.unpriced = decision; location.hash = "#/unpriced"; return; }
    state.unpriced = null;
    state.confirmed = decision.picked;
    location.hash = "#/report";
  }
  function matchScreen() {
    if (state.check && (state.check.source === "hunt" || state.check.source === "listing")) { renderConfirm(state.check); return; }
    D.identifyCard(state.photo).then(function (res) {
      var candidates = CH_SETGUARD.structureAll(res.candidates);
      renderConfirm({ source: "photo", candidates: candidates, catalog: sampleCatalog(), read: CH_SETGUARD.photoRead(candidates), prefill: {} });
    });
  }
  function unpricedScreen() {
    var d = state.unpriced || { title: "UNPRICED", headline: "We won't guess the set.", detail: "Pick the exact set.", pickedLine: "", readLine: "" };
    view.innerHTML = '<section class="unpriced" aria-label="UNPRICED">' +
      '<div class="eyebrow">Exact set</div><h1 class="h1">' + esc(d.title || "UNPRICED") + '</h1>' +
      '<p class="lead" style="font-size:18px;color:var(--text)">' + esc(d.headline || "We won't guess the set.") + '</p>' +
      (d.pickedLine ? '<div class="card"><b>You picked</b><p style="margin:6px 0 0">' + esc(d.pickedLine) + '</p>' +
        (d.readLine ? '<b style="display:block;margin-top:12px">That doesn\'t match</b><p style="margin:6px 0 0">' + esc(d.readLine) + '</p>' : "") + '</div>' : "") +
      (d.ladder ? "" : '<p style="font-size:16px;font-weight:700">Wrong set → wrong price.</p>') +
      '<p class="muted">' + esc(d.detail || "") + '</p>' +
      (d.ladder
        ? '<div class="cta-stack"><button class="btn btn-gold" type="button" data-connect="cardladder">Connect Card Ladder</button><a class="btn btn-ghost" href="#/hunt">Back to hunt</a></div></section>'
        : '<div class="cta-stack"><a class="btn btn-gold" href="#/match">Pick the exact set</a><a class="btn btn-ghost" href="' + (state.check && state.check.source === "listing" ? "#/hunt" : "#/scan") + '">' + (state.check && state.check.source === "listing" ? "Back to hunt" : "Start over") + '</a></div></section>') + footer();
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
  function liveSoldHTML(card, rows) {
    if (!rows || !rows.length) return '<p class="muted">No sold comps in your Ladder history for this exact card.</p>';
    var title = [card.year, card.set, card.number ? "#" + card.number : "", card.player].filter(Boolean).join(" ");
    var latest = rows[0];
    var hero = '<article class="comp-hero"><div class="comp-photo-frame"><div class="comp-photo" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);min-height:180px"><span class="muted small">Your Ladder sale</span></div></div>' +
      '<div class="comp-cap"><div><span class="chip ok">Latest · ' + esc(latest.grade || "Raw") + '</span><b class="who">' + esc(title) + '</b>' +
      '<span class="meta">' + esc(latest.date || "Date n/a") + " · " + esc(latest.type || "Sold") + " · " + esc(card.variant || "Exact card") + '</span></div>' +
      '<span class="px num">' + money(latest.price) + '</span></div></article>';
    var older = rows.slice(1).map(function (s) {
      return '<article class="comp-older"><span style="width:72px;height:72px;border-radius:10px;background:rgba(255,255,255,.06);flex:none"></span><span><b>' + esc(title) + '</b><span class="meta">' + esc(s.date || "") + " · " + esc(s.type || "Sold") + " · " + esc(s.grade || "Raw") + '</span></span><span class="px num">' + money(s.price) + '</span></article>';
    }).join("");
    return hero + (older ? '<div class="comp-older-list">' + older + '</div>' : "") +
      '<p class="small dim" style="margin:10px 0 0">Exact card only from your pasted Ladder sales. Other sets and parallels stay off this list.</p>';
  }
  function renderLiveReport() {
    var c = state.confirmed || {};
    var rows = state.liveSales || [];
    var prices = rows.map(function (s) { return s.price; }).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
    var mid = prices.length ? prices[Math.floor(prices.length / 2)] : null;
    var low = prices.length ? prices[0] : null;
    var high = prices.length ? prices[prices.length - 1] : null;
    LS.set("lastCard", {
      id: c.id || "",
      title: [c.year, c.set, c.number ? "#" + c.number : "", c.player].filter(Boolean).join(" "),
      variant: c.variant || "",
      raw: mid,
      source: "ladder-hook"
    });
    var h = '<a class="link-btn" href="#/scan">' + I("left") + 'Check another</a>' +
      '<div class="row wrap" style="gap:8px;margin:12px 0"><span class="chip ok">Live comps</span><span class="chip ok">Exact card</span><span class="chip">Your Card Ladder</span></div>' +
      '<h1 class="h2">' + esc([c.year, c.set].filter(Boolean).join(" ")) + (c.number ? " #" + esc(c.number) : "") + " " + esc(c.player || "") + '</h1>' +
      '<p class="muted" style="margin:4px 0 0">' + esc(c.variant || "Exact card") + '</p>' +
      '<div class="stat4" style="margin-top:12px">' +
        '<div class="kpi median"><span>Median · live</span><b class="num">' + money(mid) + '</b><small>' + rows.length + ' sale' + (rows.length === 1 ? "" : "s") + ' · your Ladder</small></div>' +
        '<div class="kpi"><span>Low</span><b class="num">' + money(low) + '</b></div>' +
        '<div class="kpi"><span>High</span><b class="num">' + money(high) + '</b></div>' +
        '<div class="kpi"><span># sales</span><b class="num">' + rows.length + '</b><small>matched</small></div>' +
      '</div>' +
      gate("comps") +
      '<p class="small muted" id="sale-note" style="margin:12px 0 8px">Sold comps from your Card Ladder · exact card.</p>' +
      '<div id="sold-list">' + liveSoldHTML(c, rows) + '</div>' +
      '<div class="cta-stack" style="margin-top:16px"><a class="btn btn-ghost" href="#/scan">Check another card</a></div>' +
      flowEnd({ sample: false, leave: true }) + footer();
    view.innerHTML = h;
  }
  function reportScreen() {
    if (ladderCompsLive() && state.confirmed) {
      renderLiveReport();
      return;
    }

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
      function statsFor(g) {
        if (g === "Raw") return { label: "Raw", low: raw.w30.low, median: raw.w30.median, high: raw.w30.high, n: raw.w30.n, thin: raw.w30.n < 5 };
        var row = r.graded.filter(function (x) { return x.grade === g; })[0];
        if (!row) return { label: g, low: null, median: null, high: null, n: 0, thin: true };
        return { label: row.grade, low: row.w30.low, median: row.w30.median, high: row.w30.high, n: row.w30.n, thin: !!row.thin || row.w30.n < 5 };
      }
      function statHTML(s) {
        return '<div class="kpi median"><span>Median · ' + esc(s.label) + '</span><b class="num">' + money(s.median) + '</b><small>30 days · SAMPLE</small></div>' +
          '<div class="kpi"><span>Low</span><b class="num">' + money(s.low) + '</b></div><div class="kpi"><span>High</span><b class="num">' + money(s.high) + '</b></div>' +
          '<div class="kpi"><span># sales</span><b class="num">' + s.n + '</b><small>30 days</small></div>';
      }
      function soldHTML() {
        var rows = CH_SETGUARD.orderSales(r.sales, c);
        if (!rows.length) return '<p class="muted">No sold comps in this window for this exact card.</p>';
        var title = c.year + " " + c.set + " #" + c.number + " " + c.player;
        var alt = "Sample photo of the exact card: " + title + (c.variant ? ", " + c.variant : "") + ". Not a live listing photo.";
        var latest = rows[0];
        var hero = '<article class="comp-hero"><div class="comp-photo-frame"><img class="comp-photo" alt="' + esc(alt) + '" src="img/sample-card.webp" width="640" height="640"></div>' +
          '<div class="comp-cap"><div><span class="chip">Latest · ' + esc(latest.grade) + '</span><b class="who">' + esc(title) + '</b>' +
          '<span class="meta">' + esc(latest.date) + " · " + esc(latest.type) + " · " + esc(c.variant || "Exact card") + '</span></div>' +
          '<span class="px num">' + money(latest.price) + '</span></div></article>';
        var older = rows.slice(1).map(function (s) {
          return '<article class="comp-older"><img alt="" src="img/sample-card-sm.webp" width="72" height="72"><span><b>' + esc(title) + '</b><span class="meta">' + esc(s.date) + " · " + esc(s.type) + " · " + esc(s.grade) + '</span></span><span class="px num">' + money(s.price) + '</span></article>';
        }).join("");
        return hero + (older ? '<div class="comp-older-list">' + older + '</div>' : "") +
          microNote() +
          '<p class="small dim" style="margin:10px 0 0">Exact card only. Other sets and parallels stay off this list.</p>';
      }
      var gradeNow = "Raw", saleNow = "sold", s0 = statsFor("Raw");
      var h = '<a class="link-btn" href="#/scan">' + I("left") + 'Check another</a>' +
        '<div class="row wrap" style="gap:8px;margin:12px 0"><span class="chip">SAMPLE</span><span class="chip ok">Exact card</span><span class="chip">' + esc(r.asOf) + '</span></div>' +
        '<h1 class="h2">' + c.year + ' ' + esc(c.set) + ' #' + c.number + ' ' + esc(c.player) + '</h1>' +
        '<p class="muted" style="margin:4px 0 0">' + esc(c.variant) + ' · ' + esc(c.team) + '</p>' +
        '<section class="callband callbox ' + callWord + '" aria-label="AI deal call"><div class="callpill cp-' + callWord + '">' + callWord + '</div><div class="callword">' + callWord + '</div>' +
        '<p class="because">' + because + '</p><p class="small" style="margin:8px 0 0;opacity:.8">AI deal call. This sample says GRADE.</p>' + microNote() + '</section>' +
        '<div class="seg" id="grade-seg">' + ["Raw", "PSA 10", "PSA 9", "PSA 8"].map(function (g) { return '<button type="button" data-g="' + g + '"' + (g === "Raw" ? ' class="on"' : "") + '>' + g + '</button>'; }).join("") + '</div>' +
        '<div class="stat4" id="stat-grid">' + statHTML(s0) + '</div>' + microNote() +
        (s0.thin ? '<p class="small muted" id="thin-note">Thin comps — fewer than 5 sales. Treat as soft.</p>' : '<p class="small muted" id="thin-note" hidden></p>') +
        gate("comps") +
        '<div class="seg" id="sale-seg" style="margin-top:12px"><button type="button" data-sale="sold" class="on">Sold</button><button type="button" data-sale="ask">For sale now</button></div>' +
        '<p class="small muted" id="sale-note" style="margin:8px 0">' + (ladderCompsLive() ? "Sold comps from your Card Ladder · exact card." : (ladderHookPhase() === "awaiting" ? "Ladder hook set up · waiting for sale-by-sale rows · exact card · SAMPLE." : "Sold comps wait until Card Ladder is linked · exact card · SAMPLE. Your AI reads these for the deal call.")) + '</p>' +
        '<div id="sold-list">' + soldHTML() + '</div><div id="ask-list" hidden></div>' +
        '<div class="stack" style="margin-top:12px"><a class="tool" href="#/deals/watch"><span class="tic">' + I("eye") + '</span><span class="tt"><b>Watchlist</b><span>Save this card</span></span>' + I("right") + '</a>' +
        '<a class="tool" href="#/deals/snipes"><span class="tic">' + I("target") + '</span><span class="tt"><b>Auction Watch</b><span>Reminder only. You set the max.</span></span>' + I("right") + '</a></div>' +
        '<details class="more-on-card" id="more-on-card"><summary>More on this card</summary>';
      h += '<div class="sec">' + secHead("01", "Exact card") + '<div class="card"><dl class="kv">' + kv("Year", c.year) + kv("Set", esc(c.set)) + kv("Card #", c.number) + kv("Player", esc(c.player)) + kv("Variant", esc(c.variant)) + kv("CardHound ID", '<span style="font-size:12px">' + c.id + '</span>') + '</dl>' +
        '<div class="note" style="margin-top:14px">' + I("list") + '<div><b style="color:var(--text)">Variant rules.</b> Must have: ' + c.mustHave.join(", ") + '. Must not have: ' + c.mustNot.join(", ") + '.</div></div></div></div>';
      h += '<div class="sec">' + secHead("02", "Raw comps", "Sample") + '<div class="card"><table class="tbl"><thead><tr><th>Window</th><th>Sales</th><th>Median</th></tr></thead><tbody>' +
        '<tr class="hi"><td class="gname">30 days</td><td class="num">' + raw.w30.n + '</td><td class="num"><b>' + money(raw.w30.median) + '</b></td></tr><tr><td class="gname">90 days</td><td class="num">' + raw.w90.n + '</td><td class="num">' + money(raw.w90.median) + '</td></tr>' +
        '<tr><td class="gname">365 days</td><td class="num">' + raw.w365.n + '</td><td class="num">' + money(raw.w365.median) + '</td></tr></tbody></table>' +
        '<div class="row between small muted" style="margin-top:10px"><span>30d range ' + money(raw.w30.low) + ' to ' + money(raw.w30.high) + '</span><span>Last ' + raw.last.date + ' · ' + money(raw.last.price) + '</span></div>' + gate("comps") + '</div></div>';
      h += '<div class="sec">' + secHead("03", "Graded comps", "Sample · 30d") + '<div class="card"><table class="tbl"><thead><tr><th>Grade</th><th>Sales</th><th>Low</th><th>Median</th><th>High</th></tr></thead><tbody>' + gradedRows + '</tbody></table><p class="small muted" style="margin:10px 0 0">THIN = fewer than 5 sales in 30 days. Treat as soft.</p></div>' +
        '<div class="card" style="margin-top:10px"><div class="sec-head" style="margin-bottom:6px"><h3 class="h3">Recent sold (sample)</h3></div><table class="tbl"><tbody>' + sales + '</tbody></table>' +
        '<p class="small dim" style="margin:10px 0 0">Excluded: ' + r.dropped.map(function (x) { return money(x.price) + " (" + esc(x.why) + ")"; }).join("; ") + '.</p></div></div>';
      h += '<div class="sec">' + secHead("04", "Track this card", "AI chart") + '<div class="card"><p class="small muted" style="margin:0 0 10px">Your AI charts this card from Card Ladder sold comps. SAMPLE.</p><div class="seg" id="cg" style="margin-bottom:10px"><button data-g="Raw" class="on">Raw</button><button data-g="PSA 9">PSA 9</button><button data-g="PSA 10">PSA 10</button></div>' +
        '<div class="chart-wrap" id="chart"></div><div class="chart-legend"><span id="ch-l"></span><span id="ch-r"></span></div>' + microNote() + '<div class="seg" id="cr" style="margin-top:12px"><button data-r="90">90 days</button><button data-r="365" class="on">1 year</button></div>' + gate("trend") + '</div></div>';
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
      h += '</details><div class="cta-stack"><a class="btn btn-ghost" href="#/scan">Check another card</a></div>' + flowEnd({ leave: true }) + footer();
      view.innerHTML = h;
      function paintGrade(g) {
        gradeNow = g;
        var s = statsFor(g);
        document.getElementById("stat-grid").innerHTML = statHTML(s);
        var note = document.getElementById("thin-note");
        if (note) { note.hidden = !s.thin; note.textContent = s.thin ? "Thin comps — fewer than 5 sales. Treat as soft." : ""; }
        document.getElementById("sold-list").innerHTML = soldHTML();
      }
      view.querySelectorAll("#grade-seg button").forEach(function (b) {
        b.onclick = function () {
          view.querySelectorAll("#grade-seg button").forEach(function (o) { o.classList.toggle("on", o === b); });
          paintGrade(b.dataset.g);
        };
      });
      view.querySelectorAll("#sale-seg button").forEach(function (b) {
        b.onclick = function () {
          saleNow = b.dataset.sale;
          view.querySelectorAll("#sale-seg button").forEach(function (o) { o.classList.toggle("on", o === b); });
          document.getElementById("sold-list").hidden = saleNow !== "sold";
          document.getElementById("ask-list").hidden = saleNow !== "ask";
          document.getElementById("sale-note").textContent = saleNow === "ask" ? "Open-market asking prices. Not Card Ladder sold comps." : (ladderCompsLive() ? "Sold comps from your Card Ladder · exact card." : (ladderHookPhase() === "awaiting" ? "Ladder hook set up · waiting for sale-by-sale rows · exact card · SAMPLE." : "Sold comps wait until Card Ladder is linked · exact card · SAMPLE. Your AI reads these for the deal call."));
        };
      });
      Promise.all([D.getDeals(), D.getGems()]).then(function (res) {
        state._deals = res[0].concat(res[1]);
        var mine = state._deals.filter(function (d) { return d.card.indexOf("T247") > -1; });
        var ask = document.getElementById("ask-list");
        if (ask) ask.innerHTML = (mine.length ? mine.map(function (d) { return dealCard(d, true); }).join("") : '<p class="muted">No asking prices in this sample for this exact card.</p>') + '<p class="small dim">Open-market asking prices. Not Card Ladder sold comps.</p>';
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
    var seg = '<div class="seg" data-scopeview="' + list + '">' + ["overall", "category", "set"].map(function (v) { return '<button data-v="' + v + '" class="' + (sc.view === v ? "on" : "") + '">' + (v === "category" ? "Kind" : v.charAt(0).toUpperCase() + v.slice(1)) + '</button>'; }).join("") + '</div>';
    var chips = "";
    if (sc.view !== "overall") {
      if (sc.view === "set") {
        var opts = m.sets || [];
        var q = (state.scopeSetQ || "").trim().toLowerCase();
        var filtered = opts.filter(function (o) { return !q || String(o).toLowerCase().indexOf(q) > -1; });
        chips = '<div class="field set-search" style="margin:10px 0 0"><label class="sr-only" for="scope-set-q">Search sets</label><input class="input" id="scope-set-q" placeholder="Search sets" value="' + esc(state.scopeSetQ || "") + '" aria-label="Search sets"></div>' +
          '<div class="scopes" data-scopeval="' + list + '">' +
          (filtered.length ? filtered.map(function (o) { return '<button class="' + (sc.value === o ? "on" : "") + '" data-o="' + esc(o) + '">' + esc("Set: " + o) + '</button>'; }).join("") : '<span class="small muted" style="padding:8px 0">No sets match</span>') +
          '</div>';
      } else if (sc.view === "category") {
        chips = '<div class="field" style="margin:10px 0 0"><label class="sr-only" for="scope-kind">Kind</label>' +
          kindSelectHTML(sc.value || TOP_KINDS[0] || "", { id: "scope-kind", ariaLabel: "Kind" }) +
          '</div>';
      }
    }
    return seg + chips;
  }
  function bindScope(list, rerender) {
    view.querySelectorAll('[data-scopeview="' + list + '"] button').forEach(function (b) {
      b.onclick = function () {
        var sc = state.scopes[list];
        sc.view = b.dataset.v;
        if (sc.view === "overall") sc.value = null;
        else if (sc.view === "category") sc.value = (TOP_KINDS[0] || (state.meta.categories && state.meta.categories[0]) || null);
        else sc.value = state.meta.sets[0];
        if (sc.view !== "set") state.scopeSetQ = "";
        rerender();
      };
    });
    function bindVal() {
      view.querySelectorAll('[data-scopeval="' + list + '"] button').forEach(function (b) {
        b.onclick = function () { state.scopes[list].value = b.dataset.o || b.dataset.kind; rerender(); };
      });
    }
    bindVal();
    var sq = document.getElementById("scope-set-q");
    if (sq) {
      sq.oninput = function () {
        state.scopeSetQ = sq.value;
        var q = sq.value.trim().toLowerCase();
        var wrap = view.querySelector('[data-scopeval="' + list + '"]');
        if (!wrap) return;
        var sc = state.scopes[list];
        var opts = (state.meta && state.meta.sets) || [];
        var filtered = opts.filter(function (o) { return !q || String(o).toLowerCase().indexOf(q) > -1; });
        wrap.innerHTML = filtered.length
          ? filtered.map(function (o) { return '<button class="' + (sc.value === o ? "on" : "") + '" data-o="' + esc(o) + '">' + esc("Set: " + o) + '</button>'; }).join("")
          : '<span class="small muted" style="padding:8px 0">No sets match</span>';
        bindVal();
      };
    }
    var sk = document.getElementById("scope-kind");
    if (sk) {
      sk.onchange = function () {
        state.scopes[list].value = sk.value || (TOP_KINDS[0] || null);
        rerender();
      };
    }
  }
  function marketsScreen(p) {
    var sub = ["movers", "highs", "picks", "searched", "gems"].indexOf(p.sub) > -1 ? p.sub : "movers";
    var titles = { movers: "Movers", highs: "New Highs", picks: "Picks", searched: "Most searched", gems: "Gem Hunt" };
    var head = '<div class="eyebrow">Lists</div><h1 class="h1" style="font-size:28px">' + titles[sub] + '</h1>' +
      '<div class="subtabs scroll-tabs">' + [["movers", "Movers"], ["highs", "Highs"], ["picks", "Picks"], ["searched", "Searched"], ["gems", "Gems"]].map(function (t) { return '<button type="button" data-sub="' + t[0] + '" class="' + (sub === t[0] ? "on" : "") + '">' + t[1] + '</button>'; }).join("") + '</div>';
    var rer = function () { var y = window.scrollY; marketsScreen({ sub: sub }); setTimeout(function () { window.scrollTo(0, y); }, 0); };
    if (!state.scopes[sub]) state.scopes[sub] = { view: "overall", value: null };
    var fn = sub === "gems" ? D.getGems : sub === "highs" ? D.getNewHighs : sub === "picks" ? D.getPicks : sub === "searched" ? D.getMostSearched : D.getMovers, sc = state.scopes[sub];
    fn(sc).then(function (rows) {
      var body = "";
      if (sub === "movers") {
        var dir = state.moversDir, side = function (r) { return dir === "up" ? r.pct > 0 : r.pct < 0; };
        var list = rows.filter(function (r) { return !r.thin && side(r); }).sort(function (a, b) { return dir === "up" ? b.pct - a.pct : a.pct - b.pct; });
        var thinL = rows.filter(function (r) { return r.thin && side(r); });
        var row = function (r, i) {
          return '<div class="lrow mover-row' + (r.thin ? " thin" : "") + '"><span class="rk">' + (r.thin ? "\u2013" : i + 1) + '</span><div class="nm"><b>' + esc(r.card) + '</b><span>' + esc(r.grade) + ' · ' + r.sales + ' today · ' + r.base + ' in 30d' + (r.thin ? ' <span class="chip thin" title="' + esc(r.thinWhy) + '">THIN</span>' : "") + '</span></div>' +
            '<div class="rt">' + sparkSVG(r.spark, r.pct >= 0) + '<span class="pct num ' + (r.pct >= 0 ? "pill-up" : "pill-down") + '">' + pct(r.pct) + '</span></div></div>';
        };
        body = '<div class="seg" id="dir" style="margin-top:12px"><button type="button" data-d="up" class="' + (dir === "up" ? "on" : "") + '">Up</button><button type="button" data-d="down" class="' + (dir === "down" ? "on" : "") + '">Down</button></div>' +
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
      } else if (sub === "gems") {
        body = '<p class="lead">Hard-to-find and mislabeled listings under the sample comp. Look-only.</p>' +
          (rows.length ? rows.map(function (d) { return dealCard(d, true); }).join("") : '<div class="empty">No gem hunts in this sample.</div>') +
          '<p class="small dim" style="margin-top:12px">SAMPLE. CardHound never bids for you.</p>';
      } else {
        rows.sort(function (a, b) { return b.lookups - a.lookups; });
        body = '<div class="card" style="margin-top:12px">' + (rows.length ? rows.map(function (r, i) {
          var ch = r.change > 0 ? '<span class="pill-up small num row" style="font-weight:800;gap:2px">' + I("up", "mini") + r.change + '</span>' : r.change < 0 ? '<span class="pill-down small num row" style="font-weight:800;gap:2px">' + I("down", "mini") + Math.abs(r.change) + '</span>' : '<span class="dim small">steady</span>';
          return '<div class="lrow"><span class="rk" style="color:' + (i < 3 ? "var(--gold2)" : "var(--dim)") + '">' + (i + 1) + '</span><div class="nm"><b>' + esc(r.card) + '</b><span>' + r.lookups.toLocaleString() + ' lookups · ' + r.users.toLocaleString() + ' people</span></div><div class="rt">' + ch + '</div></div>';
        }).join("") : '<div class="empty">No sample lookups in this view.</div>') + '</div><p class="small dim" style="margin-top:12px">Sample lookup counts, last 7 days. In the real app these come only from CardHound\'s own lookup log.</p>';
      }
      view.innerHTML = head + '<div class="row between" style="margin-bottom:10px"><span class="small muted">' + esc(state.meta.asOf) + '</span><span class="chip">SAMPLE</span></div>' + (sub === "gems" ? "" : scopeBar(sub)) + body + microNote() + flowEnd() + footer();
      view.querySelectorAll("[data-sub]").forEach(function (b) { b.onclick = function () { var base = parseHash().route === "lists" ? "lists" : "markets"; location.hash = "#/" + base + "/" + b.dataset.sub; }; });
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
    var act = d.type === "Auction" ? '<button class="btn btn-gold btn-xs" data-snipe="' + d.id + '">' + I("target") + 'Auction Watch</button>'
      : d.type === "Best Offer" ? '<button class="btn btn-gold btn-xs" data-offer="' + d.id + '">' + I("handshake") + 'Offer helper</button>'
      : '<button class="btn btn-ghost btn-xs" data-alert="1">' + I("bell") + 'Alert me</button>';
    return '<div class="deal"><div class="top"><b>' + esc(d.card) + '</b><span class="chip" style="height:22px;font-size:10.5px">' + d.type + '</span></div>' +
      '<div class="small dim" style="margin-top:4px">' + esc(d.grade) + ' · ' + (d.type === "Auction" ? d.bids + " bids · " : "") + fmtEnds(d.endsMin) + '</div>' +
      (withNote && d.note ? '<div class="note" style="margin-top:10px">' + I("gem") + '<div>' + esc(d.note) + '</div></div>' : "") +
      '<div class="vs"><div class="price num">' + money(d.price) + '<small>vs comp ' + money(d.comp) + '</small></div><span class="under ' + (good ? "good" : "bad") + ' num">' + (good ? Math.abs(diff).toFixed(0) + "% under" : diff.toFixed(0) + "% over") + '</span></div>' + microNote() +
      '<div class="acts">' + act + '<button class="btn btn-ghost btn-xs" data-toast="Demo: sample listings have no eBay link.">' + I("eye") + 'View</button></div></div>';
  }
  function dealsScreen(p) {
    var sub = ["deals", "watch", "gems", "snipes"].indexOf(p.sub) > -1 ? p.sub : "deals";
    var head = '<div class="eyebrow">More</div><h1 class="h1" style="font-size:28px">' + ({ deals: "For sale", watch: "Watchlist", gems: "Gem Hunt", snipes: "Auction Watch" }[sub]) + '</h1>' +
      '<div class="subtabs scroll-tabs">' + [["deals", "For sale"], ["watch", "Watchlist"], ["gems", "Gem Hunt"], ["snipes", "Auction Watch"]].map(function (t) { return '<button type="button" data-dsub="' + t[0] + '" class="' + (sub === t[0] ? "on" : "") + '">' + t[1] + '</button>'; }).join("") + '</div>';
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
    return '<div class="note" style="margin-top:14px">' + I("shield") + '<div><b style="color:var(--text)">You set the max. CardHound never bids without your confirmation.</b> Today you place your max on eBay yourself and CardHound reminds you before the end. Automatic last-second bidding is <b style="color:var(--gold2)">coming soon, pending eBay approval</b> (Buy Offer API, limited release). Nothing is ever bid in this demo.</div></div>';
  }
  function cd(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" : "") + (m < 10 ? "0" : "") + m + ":" + (x < 10 ? "0" : "") + x; }
  var ST_LABEL = { Scheduled: "Reminder set", Placed: "Max set on eBay", Won: "Won", Outbid: "Outbid" };
  function snipesList() {
    var head = gate("sniper");
    if (!state.snipes.length) return head + '<div class="card" style="text-align:center;padding:28px 18px;margin-top:12px"><div style="width:60px;height:60px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;color:var(--gold2);border:1px solid var(--gold-line)">' + I("target") + '</div><b>No auctions tracked yet</b><p class="muted small" style="margin:6px 0 14px">Tap <b>Auction Watch</b> on a live auction. You set the max. Nothing is bid for you.</p><a class="btn btn-gold btn-sm" href="#/deals">Browse auctions</a></div>' + disclaimer();
    return head + '<div style="height:12px"></div>' + state.snipes.map(function (s) {
      var st = s.status, live = st === "Scheduled" || st === "Placed", left = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
      return '<div class="deal"><div class="top"><b>' + esc(s.card) + '</b><span class="chip ' + (st === "Won" ? "ok" : st === "Outbid" ? "" : "gold") + '" style="height:22px;font-size:10.5px">' + ST_LABEL[st] + ' · demo</span></div>' +
        '<div class="vs"><div><div class="small dim">Your max</div><div class="price num">' + money(s.max, true) + '</div></div><div style="text-align:right"><div class="small dim">' + (live ? "Auction ends in (demo)" : "Result (demo)") + '</div><div class="countdown num" data-cd="' + s.id + '">' + (live ? cd(left) : st) + '</div></div></div>' +
        '<div class="acts acts-wrap">' + (live ? (st === "Scheduled" ? '<button class="btn btn-gold btn-xs" data-ebay="' + s.id + '">' + I("ext") + 'Set my max on eBay</button>' : "") + '<button class="btn btn-ghost btn-xs" data-edit="' + s.id + '">Edit</button><button class="btn btn-ghost btn-xs" data-cancel="' + s.id + '">Cancel</button><button class="btn btn-ghost btn-xs" data-sim="' + s.id + '">Skip ahead</button>' : '<button class="btn btn-ghost btn-xs" data-remove="' + s.id + '">Remove</button>') + '</div></div>';
    }).join("") + '<div class="card tight row between" style="margin-top:12px"><span><b style="font-size:13.5px">Auto last-second bid</b><br><span class="small muted">Coming soon, pending eBay approval</span></span><span class="chip">Coming soon</span></div>' + disclaimer();
  }
  function findSnipe(id) { return state.snipes.filter(function (x) { return x.id === id; })[0]; }
  function ebayHandoff(s) {
    if (s && s.status === "Scheduled") { s.status = "Placed"; saveSnipes(); }
    toast("Demo: sample listings have no eBay link. In the app this opens the listing on eBay, where you enter your own max.");
  }
  function bindSnipes() {
    state.timers.push(setInterval(function () {
      state.snipes.forEach(function (s) {
        if (s.status !== "Scheduled" && s.status !== "Placed") return;
        var left = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)), el = view.querySelector('[data-cd="' + s.id + '"]');
        if (el) el.textContent = cd(left);
        if (left === 0) {
          s.status = (s.status === "Placed" && s.max >= s.price * 1.1) ? "Won" : "Outbid"; saveSnipes();
          if (s.status === "Won" && D.addLedgerRow) {
            var paid = Math.round(Math.min(s.max, s.price * 1.1) * 100) / 100;
            D.addLedgerRow({ card: s.card, from: "eBay · Auction Watch win", seller: "sample-seller (demo)", price: paid, shipping: 4.99, tax: Math.round(paid * 7) / 100, order: "SAMPLE-AUTO-" + String(s.id).slice(-4), status: "bought", auto: true, sample: true });
            toast("Demo: auction ended (Won). Logged to your Portfolio automatically.");
          } else toast("Demo: auction ended (" + s.status + "). Simulated result.");
          dealsScreen({ sub: "snipes" });
        }
      });
    }, 1000));
    view.querySelectorAll("[data-ebay]").forEach(function (b) { b.onclick = function () { ebayHandoff(findSnipe(b.dataset.ebay)); dealsScreen({ sub: "snipes" }); }; });
    view.querySelectorAll("[data-cancel]").forEach(function (b) { b.onclick = function () { state.snipes = state.snipes.filter(function (s) { return s.id !== b.dataset.cancel; }); saveSnipes(); toast("Reminder cancelled (demo)."); dealsScreen({ sub: "snipes" }); }; });
    view.querySelectorAll("[data-remove]").forEach(function (b) { b.onclick = function () { state.snipes = state.snipes.filter(function (s) { return s.id !== b.dataset.remove; }); saveSnipes(); dealsScreen({ sub: "snipes" }); }; });
    view.querySelectorAll("[data-sim]").forEach(function (b) { b.onclick = function () { findSnipe(b.dataset.sim).endsAt = Date.now() + 4000; saveSnipes(); toast("Demo: skipping to the last seconds. No real bid."); }; });
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
      openSheet('<div class="eyebrow">Auction Watch · demo</div><h2>' + esc(d.card) + '</h2><p class="small muted" style="margin:0">' + esc(d.grade) + ' · current bid ' + money(d.price) + ' · ' + fmtEnds(d.endsMin) + '</p>' +
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
      openSheet('<div class="eyebrow">Confirm · demo</div><h2>Confirm your exact max</h2><p class="muted small" style="margin:0">' + esc(d.card) + '</p>' +
        '<div class="card gold" style="margin-top:14px;text-align:center"><div class="small muted">Your max bid</div><div class="callword num" style="font-size:54px;margin:6px 0">' + money(v, true) + '</div><div class="small muted">You enter this on eBay yourself. CardHound reminds you before the end.</div></div>' +
        '<label class="row" style="margin-top:14px;gap:12px;align-items:flex-start;font-size:13.5px"><input type="checkbox" id="ok" style="width:20px;height:20px;accent-color:#e3bd6a;margin-top:1px;flex:none"><span>I set this max of <b>' + money(v, true) + '</b>. If it wins, I agree to buy.</span></label>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="ebay" disabled>' + I("ext") + 'Set my max on eBay</button><button class="btn btn-ghost" id="remind" disabled>' + I("bell") + (existing ? "Update reminder (demo)" : "Remind me before it ends (demo)") + '</button></div>' +
        '<div class="card tight row between" style="margin-top:10px;opacity:.75"><span><b style="font-size:13.5px">Auto last-second bid</b><br><span class="small muted">Coming soon, pending eBay approval</span></span><input type="checkbox" disabled style="width:22px;height:22px"></div>' +
        '<button class="link-btn" id="back" style="margin-top:12px">' + I("left") + 'Change amount</button>' + disclaimer(), function () {
          var ok = document.getElementById("ok"), eb = document.getElementById("ebay"), rm = document.getElementById("remind");
          ok.onchange = function () { eb.disabled = rm.disabled = !ok.checked; };
          document.getElementById("back").onclick = function () { step1(v); };
          var save = function (placed) {
            var s = existing;
            if (s) s.max = v;
            else { s = { id: "sn" + Date.now(), dealId: d.id, card: d.card, max: v, price: d.price, status: "Scheduled", endsAt: Date.now() + Math.min(d.endsMin, 45) * 60000 }; state.snipes.unshift(s); }
            if (placed) ebayHandoff(s); else toast("Reminder set (demo). Nothing will be bid.");
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
        document.getElementById("asave").onclick = function () { state.alerts = { threshold: +th.value, on: document.getElementById("aon").checked }; LS.set("alerts", state.alerts); LS.set("alertsTouched", true); closeSheet(); toast("Saved on this device (demo)."); go(); };
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
  function ladderConnectSheet() {
    var step = (state.ladderHook && state.ladderHook.uiStep) || "account";
    var methodPick = (state.ladderHook && state.ladderHook.method) || null;
    var pasteText = (state.ladderHook && state.ladderHook.pendingText) || "";
    var parsePreview = null;
    function stepChips(cur) {
      var steps = [["account", "1 · Account"], ["method", "2 · Feed"], ["confirm", "3 · Confirm"]];
      if (cur === "paste") cur = "method";
      return '<div class="row wrap" style="gap:6px;margin:10px 0 4px">' + steps.map(function (s) {
        var on = s[0] === cur;
        return '<span class="chip' + (on ? " gold" : "") + '">' + s[1] + '</span>';
      }).join("") + '</div>';
    }
    function persistDraft() {
      state.ladderHook.uiStep = step;
      state.ladderHook.method = methodPick;
      state.ladderHook.pendingText = pasteText;
      if (parsePreview && parsePreview.length) state.ladderHook.pendingRows = parsePreview;
      saveLadderHook();
    }
    function render() {
      var phase = ladderHookPhase();
      if (phase === "live") {
        openSheet('<div class="eyebrow">BYO sold comps</div><h2>Card Ladder live</h2>' +
          '<div class="row" style="justify-content:center;gap:8px;margin:8px 0 12px"><span class="chip gold">' + I("check") + 'Live sale-by-sale</span></div>' +
          '<p class="muted small" style="margin:0">Sold comps are coming from your Ladder hook.</p>' +
          '<div class="cta-stack"><button class="btn btn-gold" id="cl-done">Done</button></div>' + flowEnd({ leave: true }), function () {
            document.getElementById("cl-done").onclick = function () { closeSheet(); };
          });
        return;
      }
      if (phase === "live") {
        var liveRows = state.liveSales || [];
        var methL = (state.ladderHook && state.ladderHook.method) || "paste";
        openSheet('<div class="eyebrow">BYO sold comps</div><h2>Card Ladder · live</h2>' +
          '<div class="row wrap" style="gap:8px;margin:8px 0 12px"><span class="chip ok">' + I("check") + 'Live comps</span><span class="chip ok">Exact card</span></div>' +
          '<p class="muted small" style="margin:0"><b>Sold comps from your Card Ladder.</b> ' + liveRows.length + ' exact-card sale' + (liveRows.length === 1 ? "" : "s") + ' matched for the confirmed card. Method: paste / import.</p>' +
          '<div class="bullets" style="margin-top:12px"><div>' + I("shield") + 'No password. No scrape. User-provided rows only.</div></div>' +
          '<div class="cta-stack"><button class="btn btn-ghost" id="cl-close">Done</button></div>', function () {
          var done = document.getElementById("cl-close");
          if (done) done.onclick = closeSheet;
        });
        return;
      }
      if (phase === "awaiting") {
        var rows = (state.ladderHook && state.ladderHook.pendingRows) || [];
        var meth = (state.ladderHook && state.ladderHook.method) || "paste";
        var methLabel = meth === "companion" ? "Companion (coming soon)" : "Paste / import sold history";
        openSheet('<div class="eyebrow">BYO sold comps</div><h2>Ladder hook set up</h2>' +
          '<div class="row wrap" style="gap:8px;margin:8px 0 12px"><span class="chip gold">' + I("clock") + 'Waiting for sale-by-sale rows</span><span class="chip">Pending</span></div>' +
          '<p class="muted small" style="margin:0"><b>Ladder hook set up · waiting for sale-by-sale rows.</b> Method: ' + esc(methLabel) + '. Confirm a card — live only when ≥1 pasted sale matches that exact set / parallel.</p>' +
          (rows.length ? '<div class="card" style="margin-top:12px"><b style="font-size:14px">' + rows.length + ' pending sale row' + (rows.length === 1 ? "" : "s") + ' on this phone</b><div class="small muted" style="margin-top:6px">' + rows.slice(0, 4).map(function (r) { return esc(r.identity) + " · " + money(r.price) + (r.date ? " · " + esc(r.date) : ""); }).join("<br>") + (rows.length > 4 ? "<br>…" : "") + '</div></div>' : '<p class="small muted" style="margin:12px 0 0">No sale rows stored yet. Paste an export anytime from Settings → Card Ladder.</p>') +
          '<div class="bullets" style="margin-top:12px"><div>' + I("shield") + 'No password. No scrape. User-provided rows only.</div><div>' + I("check") + 'Live on Confirm when ≥1 exact-card sale matches (setguard).</div></div>' +
          '<div class="cta-stack"><button class="btn btn-gold" id="cl-done">Got it</button>' +
          '<button class="btn btn-ghost" id="cl-more">' + I("upload") + 'Add sold history</button>' +
          '<button class="btn btn-ghost" id="cl-clear">Clear Ladder hook</button></div>' + flowEnd({ leave: true }), function () {
            document.getElementById("cl-done").onclick = function () { closeSheet(); if (parseHash().route === "scan") scanScreen(); else go(); };
            document.getElementById("cl-more").onclick = function () {
              state.ladderHook.status = "none";
              state.ladderHook.uiStep = "paste";
              methodPick = "paste";
              state.ladderHook.method = "paste";
              saveLadderHook();
              step = "paste";
              render();
            };
            document.getElementById("cl-clear").onclick = function () {
              state.ladderHook = defaultLadderHook();
              state.liveSales = null;
              state.confirmed = null;
              saveLadderHook();
              toast("Ladder hook cleared. Comps still wait.");
              closeSheet();
              if (parseHash().route === "scan") scanScreen(); else go();
            };
          });
        return;
      }
      /* Not linked — hook wizard */
      var body = "";
      var cta = "";
      if (step === "account") {
        body = stepChips("account") +
          '<ol class="vsteps" style="margin-top:8px"><li><span class="sn">1</span><div><b>Have Card Ladder Pro / an account</b><span>Sold comps come from <b>your</b> Ladder. CardHound does not replace Ladder and does not log in for you.</span></div></li></ol>' +
          '<p class="muted small" style="margin:12px 0 0">You keep your Ladder subscription. CardHound only accepts sold comps you choose to feed in.</p>';
        cta = '<div class="cta-stack"><button class="btn btn-gold" id="cl-next">I have Card Ladder — next</button>' +
          '<button class="btn btn-ghost" id="cl-defer">Continue — name cards; comps wait</button></div>';
      } else if (step === "method") {
        body = stepChips("method") +
          '<p class="muted small" style="margin:0">Choose how you will feed sold comps into CardHound.</p>' +
          '<button type="button" class="tool" id="cl-m-paste" style="margin-top:12px"><span class="srcmono' + (methodPick === "paste" ? " on" : "") + '">A</span><span class="tt"><b>Paste / import sold history</b><span>CSV or paste of sale lines you export or copy from your own Ladder. Identity + sale price + date only.</span></span>' + (methodPick === "paste" ? '<span class="chip gold">Selected</span>' : "") + '</button>' +
          '<button type="button" class="tool" id="cl-m-comp" style="margin-top:8px"><span class="srcmono">B</span><span class="tt"><b>CardHound Companion</b><span>Side panel while you are signed into Ladder in your browser.</span></span><span class="chip gold">Coming soon</span></button>' +
          (methodPick === "companion" ? '<p class="small muted" style="margin:10px 0 0">Companion is labeled Coming soon — it does not pretend live. Pick paste / import to set up a hook now.</p>' : "");
        cta = '<div class="cta-stack"><button class="btn btn-gold" id="cl-next"' + (methodPick === "paste" ? "" : " disabled") + '>' + (methodPick === "paste" ? "Continue with paste / import" : "Select paste / import") + '</button>' +
          '<button class="btn btn-ghost" id="cl-back">Back</button></div>';
      } else if (step === "paste") {
        var prev = parsePreview || (state.ladderHook && state.ladderHook.pendingRows) || [];
        body = stepChips("method") +
          '<p class="muted small" style="margin:0">Paste sold lines or choose a CSV you exported from your own Ladder. CardHound keeps identity, sale price, and date — user-provided only.</p>' +
          '<div class="field" style="margin-top:12px"><label for="cl-paste">Sold history (paste)</label><textarea class="input" id="cl-paste" rows="6" style="height:auto;padding:12px 14px" placeholder="One sale per line, e.g.&#10;2024 Topps Chrome #1 Player — $120 — 2026-09-01">' + esc(pasteText) + '</textarea></div>' +
          '<div class="cta-stack" style="margin-top:8px"><label class="btn btn-ghost" for="cl-csv">' + I("upload") + 'Choose CSV export</label><input class="file-input" id="cl-csv" type="file" accept=".csv,text/csv,text/plain"><button class="btn btn-ghost" id="cl-parse" type="button">Parse on this phone</button></div>' +
          (prev.length ? '<div class="card" style="margin-top:12px"><b style="font-size:14px">' + prev.length + ' valid sale row' + (prev.length === 1 ? "" : "s") + ' ready (pending)</b><div class="small muted" style="margin-top:6px">' + prev.slice(0, 5).map(function (r) { return esc(r.identity) + " · " + money(r.price) + (r.date ? " · " + esc(r.date) : ""); }).join("<br>") + (prev.length > 5 ? "<br>…" : "") + '</div><p class="small muted" style="margin:8px 0 0"><span class="chip">Pending</span> Stored on this phone. Live comps unlock on Confirm only when ≥1 sale matches the exact card.</p></div>' : '<p class="small muted" style="margin:12px 0 0">Needs at least one line with a sale price. Messy paste is ok — rows without a price are dropped.</p>');
        cta = '<div class="cta-stack"><button class="btn btn-gold" id="cl-next">Continue to confirm</button><button class="btn btn-ghost" id="cl-back">Back</button></div>';
      } else {
        var n = ((parsePreview || (state.ladderHook && state.ladderHook.pendingRows) || [])).length;
        body = stepChips("confirm") +
          '<ol class="vsteps" style="margin-top:8px"><li><span class="sn">3</span><div><b>Confirm — comps unlock only after real sales appear</b><span>Setting up the hook does <b>not</b> unlock live prices. After Confirm, live only when ≥1 pasted sale matches that exact set / parallel; otherwise UNPRICED.</span></div></li></ol>' +
          '<div class="bullets" style="margin-top:12px"><div>' + I("shield") + 'No password. No cookies. No scrape.</div><div>' + I("check") + 'Method: paste / import sold history' + (n ? " · " + n + " pending row" + (n === 1 ? "" : "s") : "") + '</div><div>' + I("clock") + 'After confirm: “Ladder hook set up · waiting for sale-by-sale rows.”</div></div>';
        cta = '<div class="cta-stack"><button class="btn btn-gold" id="cl-confirm">' + I("check") + 'Set up Ladder hook</button><button class="btn btn-ghost" id="cl-back">Back</button></div>';
      }
      openSheet('<div class="eyebrow">BYO sold comps</div><h2>Connect Card Ladder</h2>' +
        '<p class="muted small" style="margin:0">Live sold comps come from <b>your</b> Card Ladder. Hook flow only — CardHound never asks for your password and never scrapes.</p>' +
        body +
        '<div class="bullets" style="margin-top:14px"><div>' + I("shield") + 'No password. No cookies. Ever.</div><div>' + I("close") + 'Rejected: scrape, password capture, or fake “connected → live prices.”</div></div>' +
        cta + flowEnd({ leave: true }), function () {
          var defer = document.getElementById("cl-defer");
          if (defer) defer.onclick = function () {
            state.ladderDeferred = true;
            LS.set("ladderDeferred", true);
            closeSheet();
            toast("Comps wait until Card Ladder is linked.");
            if (parseHash().route === "scan") scanScreen(); else go();
          };
          var back = document.getElementById("cl-back");
          if (back) back.onclick = function () {
            if (step === "confirm") step = (methodPick === "paste" ? "paste" : "method");
            else if (step === "paste") step = "method";
            else if (step === "method") step = "account";
            persistDraft();
            render();
          };
          var next = document.getElementById("cl-next");
          if (next) next.onclick = function () {
            if (step === "account") {
              state.ladderHook.accountOk = true;
              step = "method";
            } else if (step === "method") {
              if (methodPick !== "paste") { toast("Pick paste / import — Companion is coming soon."); return; }
              step = "paste";
            } else if (step === "paste") {
              var ta = document.getElementById("cl-paste");
              if (ta) pasteText = ta.value;
              if (!parsePreview || !parsePreview.length) {
                parsePreview = parseLadderSaleLines(pasteText);
              }
              state.ladderHook.pendingText = pasteText;
              state.ladderHook.pendingRows = parsePreview || [];
              step = "confirm";
            }
            persistDraft();
            render();
          };
          var mp = document.getElementById("cl-m-paste");
          if (mp) mp.onclick = function () { methodPick = "paste"; persistDraft(); render(); };
          var mc = document.getElementById("cl-m-comp");
          if (mc) mc.onclick = function () { methodPick = "companion"; persistDraft(); render(); };
          var ta = document.getElementById("cl-paste");
          if (ta) ta.oninput = function () { pasteText = ta.value; };
          var parseBtn = document.getElementById("cl-parse");
          if (parseBtn) parseBtn.onclick = function () {
            var field = document.getElementById("cl-paste");
            if (field) pasteText = field.value;
            parsePreview = parseLadderSaleLines(pasteText);
            state.ladderHook.pendingText = pasteText;
            state.ladderHook.pendingRows = parsePreview;
            saveLadderHook();
            if (!parsePreview.length) toast("No sale rows found yet — need a price on each line.");
            else toast(parsePreview.length + " sale row" + (parsePreview.length === 1 ? "" : "s") + " on this phone (live after Confirm match).");
            render();
          };
          var csv = document.getElementById("cl-csv");
          if (csv) csv.onchange = function () {
            var file = csv.files && csv.files[0]; if (!file) return;
            var rd = new FileReader();
            rd.onload = function () {
              pasteText = String(rd.result || "").slice(0, 200000);
              parsePreview = parseLadderSaleLines(pasteText);
              state.ladderHook.pendingText = pasteText;
              state.ladderHook.pendingRows = parsePreview;
              saveLadderHook();
              toast(parsePreview.length ? (parsePreview.length + " pending row" + (parsePreview.length === 1 ? "" : "s") + " from " + file.name) : ("Read " + file.name + " — no sale prices found yet."));
              render();
            };
            rd.readAsText(file.slice(0, 200000));
          };
          var conf = document.getElementById("cl-confirm");
          if (conf) conf.onclick = function () {
            state.ladderHook.status = "awaiting";
            state.ladderHook.method = "paste";
            state.ladderHook.accountOk = true;
            state.ladderHook.uiStep = "confirm";
            if (parsePreview && parsePreview.length) state.ladderHook.pendingRows = parsePreview;
            if (pasteText) state.ladderHook.pendingText = pasteText;
            saveLadderHook();
            /* Never set state.conn.cardladder — that was the old demo live unlock. */
            if (state.conn && state.conn.cardladder) { delete state.conn.cardladder; saveConn(); }
            state.ladderDeferred = true;
            LS.set("ladderDeferred", true);
            toast("Ladder hook set up · waiting for sale-by-sale rows.");
            render();
          };
        });
    }
    render();
  }
  function connectSheet(id) {
    var s = srcById(id); if (!s) return;
    if (id === "cardladder") {
      ladderConnectSheet();
      return;
    }
    if (id === "feed") {
      openSheet('<div class="eyebrow">Optional</div><h2>CardHound data feed</h2>' +
        '<p class="muted small" style="margin:0">Optional path — not the front-door comps story. Live sold comps come from your Card Ladder when linked.</p>' +
        '<div class="cta-stack"><button class="btn btn-ghost" data-connect="cardladder">' + I("plug") + 'Card Ladder (BYO comps)</button></div>' + flowEnd({ leave: true }));
      return;
    }
    if (s.status === "importonly") { importSheet(); return; }
    if (id === "import" && !isConnected(id)) { importSheet(); return; }
    if (isConnected(id)) {
      var label = id === "import" ? "Collection imported" : s.name + " connected";
      openSheet('<div class="bigcheck">' + I("check") + '</div><h2 style="text-align:center;padding:0">' + esc(label) + '</h2>' +
        '<div class="row" style="justify-content:center;gap:8px;margin:8px 0 12px"><span class="chip gold">' + I("check") + esc(label) + '</span><span class="chip demo">DEMO</span></div>' +
        (state.keys[id] ? '<p class="small muted" style="text-align:center;margin:0 0 6px">Token ending \u2026' + esc(state.keys[id]) + ', stored only on this device.</p>' : "") +
        '<p class="muted small" style="text-align:center;margin:0 0 6px">Simulated. This shared demo always shows sample data with the Sample data badge.</p>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="toscan">' + I("camera") + 'Next: photograph a card</button><button class="btn btn-ghost" id="disc">' + (id === "import" ? "Clear import (demo)" : "Disconnect (demo)") + '</button></div>' + flowEnd({ leave: true }), function () {
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
      var extra = id === "companion" ? '<ol class="vsteps"><li><span class="sn">1</span><div><b>Sign in to Card Ladder in your own browser</b><span>As you normally do. CardHound never sees your password or cookies.</span></div></li><li><span class="sn">2</span><div><b>Open any card page</b><span>Companion recognizes which card it is.</span></div></li><li><span class="sn">3</span><div><b>Open the CardHound side panel</b><span>Deal call, Gem Hunt hits, Auction Watch, watchlist, portfolio. Connect Card Ladder in Settings for sold comps in Confirm.</span></div></li></ol>' : "";
      openSheet(top + '<h2>' + esc(s.name) + '</h2><span class="chip gold" style="margin:4px 0 10px">' + badge + '</span><p class="muted small" style="margin:10px 0 0">' + esc(s.blurb) + '</p>' + extra +
        '<div class="cta-stack"><button class="btn btn-ghost" disabled>' + I("clock") + badge + '</button><button class="btn btn-ghost" data-connect="import">' + I("upload") + 'Import my collection instead</button></div>' + safe);
      return;
    }
    var body = "";
    if (s.method === "apikey") body = '<div class="field"><label for="key">' + esc(s.keyLabel) + '</label><input class="input" id="key" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste your token"></div>' +
      '<p class="small muted" style="margin:8px 0 0">' + esc(s.keyHelp) + '</p><div class="note" style="margin-top:12px">' + I("key") + '<div>Demo: the token is stored only on this device (localStorage) and never sent anywhere. It\'s an API token, never your password.</div></div>';
    else if (s.method === "oauth") body = '<ol class="vsteps"><li><span class="sn">1</span><div><b>Continue to the official eBay sign-in</b><span>You sign in on eBay\'s own page. CardHound never sees your password.</span></div></li><li><span class="sn">2</span><div><b>Approve access</b><span>Watchlist, saved searches and listings. Automatic bidding is pending eBay approval.</span></div></li></ol>';
    var simLabel = s.method === "apikey" ? "Save token (demo)" : (s.method === "oauth" ? "Continue with eBay (simulated)" : "Connect " + s.name + " (demo)");
    openSheet(top + '<h2>Connect your ' + esc(s.name) + '</h2><p class="muted small" style="margin:0">' + esc(s.blurb) + '</p>' + body + safe + unl +
      '<div class="cta-stack"><button class="btn btn-gold" id="sim">' + I(s.method === "apikey" ? "key" : "plug") + simLabel + '</button></div>' +
      flowEnd({ leave: true }), function () {
        document.getElementById("sim").onclick = function () {
          if (s.method === "apikey") { var k = document.getElementById("key").value.trim(); if (k.length < 6) { toast("Paste your token first."); return; } state.keys[id] = k.slice(-4); }
          state.conn[id] = true; saveConn(); connectSheet(id);
        };
      });
  }

  /* MORE / CONNECTIONS / TOOLS */
  function toolLink(href, icon, title, sub) {
    return '<a class="tool" href="' + href + '"><span class="tic">' + I(icon) + '</span><span class="tt"><b>' + title + '</b><span>' + sub + '</span></span>' + I("right") + '</a>';
  }
  function legalLinks() {
    return '<div class="row" style="gap:18px;justify-content:center;margin-top:18px"><a class="link-btn" href="../legal/PRIVACY_POLICY.md">Privacy</a><a class="link-btn" href="../legal/TERMS_OF_SERVICE.md">Terms</a></div>';
  }
  function moreScreen() {
    var itn = intentNow();
    var yours = [["#/intent", "target", "Your intention", itn ? itn.label + " · change" : "Flip, hold, grade, or other"], ["#/sites", "search", "Where you hunt", "eBay, Facebook, Whatnot, and more"], ["#/daily", "report", "Daily report", "Movers and gems, tailored by you"], ["#/ask", "mic", "Ask", "Hunts and questions. Not on Home."], ["#/ledger", "wallet", "Portfolio", "Buys, cost, and value on this phone"], ["#/deals/watch", "eye", "Watchlist", "Cards and listings you are watching"], ["#/deals/snipes", "target", "Auction Watch", "Reminders. You set the max."], ["#/deals", "deals", "For sale", "Asking prices versus sample comps"], ["#/lists/gems", "gem", "Gem Hunt", "Hard-to-find and mislabeled listings"]];
    var tools = [["#/lists/movers", "markets", "Lists", "Movers, highs, picks, searched, gems"], ["#/tool/alerts", "bell", "Alerts", "Under-comp and new-high alerts"], ["#/settings", "sliders", "Settings", "Card Ladder, AI, import, eBay, PSA"], ["#/tool/fees", "calc", "Fee and net", "What you keep after eBay fees"], ["#/tool/roi", "layers", "Grading ROI", "Raw versus graded after fees"], ["#/tool/variant", "list", "Exact variant check", "Parallel, refractor, reprint, slab"], ["#/tool/offer", "handshake", "Best Offer helper", "Suggested offer and walk-away"]];
    if (window.CH_APP && window.CH_APP.moreItemsTop && window.CH_APP.moreItemsTop.length) {
      yours = window.CH_APP.moreItemsTop.map(function (t) { return ["#/" + t[0], t[1], t[2], t[3]]; }).concat(yours);
    }
    view.innerHTML = '<div class="eyebrow">More</div><h1 class="h1" style="font-size:28px">Everything else</h1>' +
      '<p class="lead">Check stays on the first tab. These are one thumb away.</p>' +
      '<h2 class="h3">Your stuff</h2>' + yours.map(function (t) { return toolLink(t[0], t[1], t[2], t[3]); }).join("") +
      '<h2 class="h3" style="margin-top:18px">Tools</h2>' + tools.map(function (t) { return toolLink(t[0], t[1], t[2], t[3]); }).join("") +
      '<div class="card" style="margin-top:14px"><div class="row between"><span class="h3">New high alerts</span><span class="chip">SAMPLE</span></div><p class="small muted">An alert when a sale is an all-time or 90-day high for that exact card.</p><div class="cta-stack"><button class="btn btn-ghost" id="boom-pv" type="button">Preview alert</button><button class="btn btn-ghost" id="boom-st" type="button">Alert settings</button></div></div>' +
      '<div class="sec card"><div class="h3" style="margin-bottom:8px">About this demo</div><p class="small muted" style="margin:0">Data source: <b style="color:var(--text)">' + esc(D.name) + '</b>. Sold prices here are invented SAMPLE data. Live sold comps wait on your Card Ladder hook — this preview does not unlock them. Your AI does deal calls and open-market hunts. Nothing is bought, bid, or offered. A hunt leaves this phone only after you agree.</p></div>' +
      legalLinks() + footer();
    var bp = document.getElementById("boom-pv"); if (bp && BOOM) bp.onclick = function () { BOOM.preview(); };
    var bs = document.getElementById("boom-st"); if (bs && BOOM) bs.onclick = function () { BOOM.settingsSheet(); };
  }
  function dailyScreen() {
    var prefs = CH_DAILY.normalize(LS.get("daily", CH_DAILY.defaults));
    Promise.all([
      D.getMovers({ view: "overall" }),
      D.getNewHighs({ view: "overall" }),
      D.getGems(),
      D.getDeals(),
      D.getSavedSearches ? D.getSavedSearches() : Promise.resolve([])
    ]).then(function (res) {
      var watchNames = res[3].filter(function (d) { return d.watch; }).map(function (d) { return d.card; });
      var report = CH_DAILY.build({ movers: res[0], highs: res[1], gems: res[2], hunts: res[4], watchNames: watchNames }, prefs);
      function rows(list, map) {
        if (!list.length) return '<div class="empty">Nothing in this slice. Change categories or focus.</div>';
        return '<div class="card">' + list.slice(0, 8).map(map).join("") + '</div>';
      }
      function showSection(key, list) {
        if (prefs.sections[key] === false) return false;
        if (list.length) return true;
        if (prefs.focus === "all" || prefs.focus === "watchlist") return true;
        return prefs.focus === key;
      }
      var body = "";
      if (showSection("movers", report.movers)) body += '<h2 class="h3" style="margin-top:16px">Movers</h2>' + rows(report.movers, function (r) {
        return '<div class="lrow daily-row mover-row"><div class="nm"><b>' + esc(r.card) + '</b><span>' + esc(r.grade || "") + '</span></div><span class="num ' + (r.pct >= 0 ? "pill-up" : "pill-down") + '">' + pct(r.pct) + '</span></div>';
      }) + '<a class="btn btn-ghost" href="#/lists/movers" style="margin-top:10px">Open Movers</a>';
      if (showSection("highs", report.highs)) body += '<h2 class="h3" style="margin-top:16px">New highs</h2>' + rows(report.highs, function (h) {
        return '<div class="lrow daily-row"><div class="nm"><b>' + esc(h.card || h.title || "New high") + '</b><span>SAMPLE</span></div></div>';
      });
      if (showSection("gems", report.gems)) body += '<h2 class="h3" style="margin-top:16px">Gem Hunt</h2>' + rows(report.gems, function (g) {
        return '<div class="lrow daily-row"><div class="nm"><b>' + esc(g.card) + '</b><span>' + esc(g.note || g.grade || "") + '</span></div></div>';
      });
      if (prefs.sections.hunts !== false) body += '<h2 class="h3" style="margin-top:16px">Saved hunts</h2>' + rows(report.hunts, function (h) {
        return '<div class="lrow daily-row"><div class="nm"><b>' + esc(h.q || h.name || "Hunt") + '</b></div></div>';
      });
      view.innerHTML = '<div class="eyebrow">Daily report</div><h1 class="h1" style="font-size:28px">Your daily report</h1>' +
        '<p class="lead">Movers first, then the rest of the brief.</p>' +
        '<span class="chip">SAMPLE</span>' + gate("comps") +
        '<div class="card daily-tailor"><h2 class="h3">Tailor this brief</h2><p class="daily-now" id="daily-now">' + esc(CH_DAILY.label(prefs)) + '</p>' +
        '<h2 class="h3">Kind</h2><p class="small muted">Top kinds by what’s selling. Any kind = whole brief.</p>' +
        '<div class="field" style="margin:8px 0 0"><label class="sr-only" for="daily-kind">Kind</label>' +
        kindSelectHTML((prefs.categories && prefs.categories[0]) || "", { id: "daily-kind", emptyLabel: "Any kind", ariaLabel: "Kind" }) +
        '</div>' +
        '<h2 class="h3">Focus</h2><div class="daily-focus" id="daily-focus" role="group" aria-label="Brief focus">' +
        [["all", "All"], ["watchlist", "Watchlist"], ["gems", "Gems"], ["movers", "Movers"]].map(function (f) { return '<button type="button" data-f="' + f[0] + '" class="' + (prefs.focus === f[0] ? "on" : "") + '">' + f[1] + '</button>'; }).join("") + '</div>' +
        '<h2 class="h3">Include</h2>' +
        [["movers", "Movers"], ["highs", "New highs"], ["gems", "Gem Hunt"], ["hunts", "Saved hunts"]].map(function (s) {
          var on = prefs.sections[s[0]] !== false;
          return '<button type="button" class="tool daily-toggle" data-sec="' + s[0] + '" aria-pressed="' + (on ? "true" : "false") + '"><span class="tt"><b>' + s[1] + '</b><span>' + (on ? "On" : "Off") + '</span></span></button>';
        }).join("") + '</div>' + body + microNote() + flowEnd() + footer();
      var dk = document.getElementById("daily-kind");
      if (dk) {
        dk.onchange = function () {
          prefs.categories = dk.value ? [dk.value] : [];
          LS.set("daily", prefs); dailyScreen();
        };
      }
      view.querySelectorAll("#daily-focus button").forEach(function (b) { b.onclick = function () { prefs.focus = b.dataset.f; LS.set("daily", prefs); dailyScreen(); }; });
      view.querySelectorAll("[data-sec]").forEach(function (b) { b.onclick = function () { prefs.sections[b.dataset.sec] = !prefs.sections[b.dataset.sec]; LS.set("daily", prefs); dailyScreen(); }; });
    });
  }
  function statusPill(s) {
    if (s.id === "cardladder") {
      if (ladderCompsLive()) return '<span class="status st-on">Live comps</span>';
      if (ladderHookPhase() === "awaiting") return '<span class="status st-soon">Awaiting sales</span>';
      return '<span class="status st-off">Not linked</span>';
    }
    if (isConnected(s.id)) return '<span class="status st-on">' + (s.id === "import" ? "Imported (demo)" : "Connected (demo)") + '</span>';
    return { available: '<span class="status st-off">Not connected</span>', coming: '<span class="status st-soon">Coming soon</span>', partner: '<span class="status st-soon">Pending partnership</span>', na: '<span class="status st-off">Not available yet</span>', importonly: '<span class="status st-soon">Import only</span>' }[s.status] || "";
  }
  function connectionsScreen() {
    var settings = parseHash().route === "settings";
    var groups = [["Connect now", ["cardladder", "import", "ebay", "psa"]], ["On the way", ["companion"]], ["Import only or not available yet", ["collx", "marketmovers", "pricecharting", "cardhedge", "feed", "tcgplayer", "130point"]]];
    var aiNow = CH_AI.normalize(state.ai);
    var aiWho = aiNow.provider ? CH_AI.byId(aiNow.provider) : null;
    view.innerHTML = '<div class="eyebrow">' + (settings ? "Settings" : "Connections") + '</div><h1 class="h1" style="font-size:28px">' + (settings ? "Settings" : "Bring your own accounts") + '</h1>' +
      '<p class="lead">BYO Card Ladder for sold comps, BYO AI for deal calls. Never a password.</p>' +
      '<button type="button" class="tool" id="ai-settings"><span class="srcmono' + (aiWho ? " on" : "") + '">AI</span><span class="tt"><b>Your AI</b><span>' + esc(aiWho ? aiWho.name + (aiSecret() ? " · …" + CH_AI.maskKey(aiSecret()) : " · add your key") : CH_AI.job.aiShort) + '</span></span></button>' +
      groups.map(function (g) {
        return '<div class="group-h"><h3 class="h3">' + g[0] + '</h3></div>' + g[1].map(function (id) {
          var s = srcById(id), on = s.id === "cardladder" ? (ladderHookPhase() !== "none") : isConnected(id);
          return '<button class="tool" data-connect="' + s.id + '"><span class="srcmono ' + (on ? "on" : "") + '">' + esc(s.mono) + '</span><span class="tt"><b>' + esc(s.name) + '</b><span>' + esc(s.how) + '</span></span>' + statusPill(s) + '</button>';
        }).join("");
      }).join("") +
      flowEnd({ leave: true }) + legalLinks() + footer();
    var aiBtn = document.getElementById("ai-settings");
    if (aiBtn) aiBtn.onclick = aiSheet;
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
  var ROUTES = { start: onboardScreen, intent: function (p) { onboardScreen(p, "intent"); }, sites: function (p) { onboardScreen(p, "sites"); }, hunt: huntScreen, scan: scanScreen, analyze: analyzeScreen, match: matchScreen, report: reportScreen, unpriced: unpricedScreen, markets: marketsScreen, lists: marketsScreen, deals: dealsScreen, more: moreScreen, connections: connectionsScreen, settings: connectionsScreen, tool: toolScreen, daily: dailyScreen };
  BOOM = window.CH_BOOM ? window.CH_BOOM({ D: D, I: I, esc: esc, money: money, toast: toast, openSheet: openSheet, closeSheet: closeSheet, parseHash: parseHash }) : null;
  window.CH_BOOM_UI = BOOM;
  if (window.CH_LEDGER) ROUTES.ledger = window.CH_LEDGER({ view: view, D: D, I: I, esc: esc, money: money, pct: pct, toast: toast, footer: footer, openSheet: openSheet, closeSheet: closeSheet, isConnected: isConnected, gate: gate, parseHash: parseHash, go: go });

  /* Hooks for the voice / prompt assistant (js/voice.js). Add-only: other screens keep working without it. */
  window.CH_APP = { state: state, LS: LS, D: D, I: I, esc: esc, money: money, pct: pct, toast: toast, footer: footer, openSheet: openSheet, closeSheet: closeSheet, parseHash: parseHash, go: go, view: view, gate: gate,
    addSnipe: function (s) { state.snipes.unshift(s); saveSnipes(); },
    setScope: function (list, v, val) { if (state.scopes[list]) state.scopes[list] = { view: v || "overall", value: val || null }; },
    setMoversDir: function (d) { state.moversDir = d === "down" ? "down" : "up"; },
    lastCard: function () { return LS.get("lastCard", null); }, setLastCard: function (c) { LS.set("lastCard", c); },
    submitHunt: submitHunt,
    alertSheet: alertSheet, boom: BOOM, ledger: ROUTES.ledger,
    /* Add-only hooks for wrappers (the native app in ../app): extra routes, extra More items, a photo from a native camera. */
    addRoute: function (name, fn) { if (!ROUTES[name]) ROUTES[name] = fn; },
    setRoute: function (name, fn) { ROUTES[name] = fn; },   /* replace a screen (the private live server uses this for real-price search + report) */
    rerender: function () { go(); },
    moreItemsTop: [],
    setPhoto: function (url) {
      photoGate(function () {
        if (state.photo && state.photo.indexOf("blob:") === 0) URL.revokeObjectURL(state.photo);
        state.photo = url;
        if (parseHash().route === "scan") scanScreen();
      });
    } };
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
  D.meta().then(function (m) { state.meta = m; go(); showLegal(); });
})();
