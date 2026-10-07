/* CardHound personalized hunt (Oct 7 beta).
   The user's own AI (BYO key) searches the live web with its provider-native
   search tool, then returns JSON listings. We keep only items with a real
   listing URL on a known marketplace. When the provider hands back the URLs
   its search actually saw, an item must match one of them or it is dropped.
   No SAMPLE listings here, ever. No scraping. Nothing leaves the phone until
   the user agrees (leaveGate in app.js). */
(function (root) {
  "use strict";
  var MODELS = { chatgpt: "gpt-5-mini", claude: "claude-haiku-4-5", gemini: "gemini-3.8-flash" };

  var INTENTS = [
    { id: "flip", label: "Flip cards", sub: "Make money", alertPct: 25,
      guide: "The user flips cards for profit. Rank by likely profit: asking price clearly under recent sold prices for the exact same card, and margin left after about 13.25% eBay fees plus shipping. Mention margin only if you saw a real recent sale; otherwise say check comps.",
      lead: "Under-comp buys with margin after fees." },
    { id: "hold", label: "Hold / collect", sub: "Cards I love", alertPct: 10,
      guide: "The user collects and holds. Rank by eye appeal (centering, sharp corners, clean surface in the photos), iconic long-term names, key rookies, low print runs, and a fair price.",
      lead: "Eye appeal and names that last." },
    { id: "grade", label: "Grade", sub: "Find grade-up cards", alertPct: 15,
      guide: "The user hunts raw cards to grade. Rank raw cards whose photos show good centering and clean corners and surface, or light surface dirt a pro cleaner could fix. Use may or could language for grade odds. Never promise a grade.",
      lead: "Raw cards with grade-up potential." },
    { id: "other", label: "Other", sub: "Just looking", alertPct: 20,
      guide: "Rank by how well each listing fits the request and by fair price.",
      lead: "Describe it. Your AI hunts it." }
  ];
  function intentById(id) { for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === id) return INTENTS[i]; return null; }

  function q(s) { return encodeURIComponent(String(s || "").trim()); }
  function ddg(site, s) { return "https://duckduckgo.com/?q=" + q("site:" + site + " " + s); }
  /* Where people hunt. access: how CardHound can reach it, honestly. */
  var SITES = [
    { id: "ebay", name: "eBay", mono: "eB", domains: ["ebay.com", "ebay.ca", "ebay.co.uk", "ebay.com.au", "ebay.de"],
      access: "web", line: "Public listings via your AI's web search. Official eBay sign-in: later.",
      search: function (s) { return "https://www.ebay.com/sch/i.html?_nkw=" + q(s); } },
    { id: "fbm", name: "Facebook Marketplace", mono: "FB", domains: ["facebook.com"],
      access: "open", line: "No public search API. We won't scrape. Opens a Marketplace search for you.",
      search: function (s) { return "https://www.facebook.com/marketplace/search/?query=" + q(s); } },
    { id: "fbg", name: "Facebook groups", mono: "FG", domains: [],
      access: "open", line: "Groups are members-only. No connect. Opens a Facebook search for you.",
      search: function (s) { return "https://www.facebook.com/search/posts/?q=" + q(s); } },
    { id: "whatnot", name: "Whatnot", mono: "WN", domains: ["whatnot.com"],
      access: "web", line: "No public API. Public pages via your AI's search, or open Whatnot.",
      search: function (s) { return "https://www.whatnot.com/search?query=" + q(s); } },
    { id: "mercari", name: "Mercari", mono: "ME", domains: ["mercari.com"],
      access: "web", line: "No public API. Public pages via your AI's search, or open Mercari.",
      search: function (s) { return "https://www.mercari.com/search/?keyword=" + q(s); } },
    { id: "comc", name: "COMC", mono: "CO", domains: ["comc.com"],
      access: "web", line: "No public API. Public pages via your AI's search.",
      search: function (s) { return ddg("comc.com", s); } },
    { id: "myslabs", name: "MySlabs", mono: "MS", domains: ["myslabs.com"],
      access: "web", line: "No public API. Public pages via your AI's search.",
      search: function (s) { return ddg("myslabs.com", s); } },
    { id: "fanatics", name: "Fanatics Collect", mono: "FC", domains: ["fanaticscollect.com"],
      access: "web", line: "No public API. Public pages via your AI's search.",
      search: function (s) { return ddg("fanaticscollect.com", s); } },
    { id: "alt", name: "Alt", mono: "AL", domains: ["alt.xyz"],
      access: "web", line: "No public API. Public pages via your AI's search.",
      search: function (s) { return ddg("alt.xyz", s); } }
  ];
  /* Extra marketplaces we accept in results even if not picked. */
  var EXTRA_DOMAINS = ["goldin.co", "ha.com", "pwccmarketplace.com", "tcgplayer.com", "sportlots.com", "beckett.com", "cardmarket.com", "dacardworld.com", "blowoutcards.com", "probstein123.com"];
  var DEFAULT_SITES = ["ebay", "whatnot", "mercari", "comc", "myslabs", "fanatics", "alt"];
  function siteById(id) { for (var i = 0; i < SITES.length; i++) if (SITES[i].id === id) return SITES[i]; return null; }
  function sitesFor(ids) { var out = []; (ids && ids.length ? ids : DEFAULT_SITES).forEach(function (id) { var s = siteById(id); if (s) out.push(s); }); return out; }

  function hostOf(u) { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, ""); } catch (e) { return ""; } }
  function domainMatch(host, d) { return host === d || host.slice(-(d.length + 1)) === "." + d; }
  function knownDomain(host) {
    var all = EXTRA_DOMAINS.slice();
    SITES.forEach(function (s) { all = all.concat(s.domains); });
    for (var i = 0; i < all.length; i++) if (domainMatch(host, all[i])) return all[i];
    return "";
  }
  function sourceName(host) {
    for (var i = 0; i < SITES.length; i++) for (var j = 0; j < SITES[i].domains.length; j++) if (domainMatch(host, SITES[i].domains[j])) return SITES[i].name;
    var d = knownDomain(host); return d ? d : host;
  }
  function ebayId(u) { var m = String(u || "").match(/\/itm\/(?:[^/?#]*\/)?(\d{9,15})/); return m ? m[1] : ""; }
  /* A listing URL: https, known marketplace, not a home/search/category page. Returns canonical URL or "". */
  function listingUrl(raw) {
    var u; try { u = new URL(String(raw || "").trim()); } catch (e) { return ""; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    var host = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    var d = knownDomain(host); if (!d) return "";
    var path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "") return "";
    if (/^ebay\./.test(d)) { var id = ebayId(u.href); return id ? "https://www." + d + "/itm/" + id : ""; }
    if (d === "facebook.com") return /^\/marketplace\/item\/\d+/.test(path) ? "https://www.facebook.com" + path.match(/^\/marketplace\/item\/\d+/)[0] + "/" : "";
    if (/(^|\/)(search|sch|s|results|browse|categories|category|shop|marketplace|login|signin|account)$/i.test(path)) return "";
    if (/\/search(\/|$)/i.test(path)) return "";
    u.hash = "";
    return u.origin.replace("//m.", "//www.") + u.pathname + (u.search && !/^ebay/.test(d) ? u.search : "");
  }
  function urlKey(u) { var id = ebayId(u); if (id) return "ebay:" + id; var h = hostOf(u); try { return h + new URL(u).pathname.replace(/\/+$/, "").toLowerCase(); } catch (e) { return h; } }
  /* EPN tagging only with a real 10-digit campaign id from config. Never invented. */
  function affiliate(url, campid) {
    if (!campid || !/^\d{10}$/.test(String(campid)) || !ebayId(url)) return url;
    return url + (url.indexOf("?") > -1 ? "&" : "?") + "mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=" + campid + "&toolid=10001&mkevt=1";
  }

  /* ---- refinements: "only PSA 9+", "under $200", "no Moss", "raw only" ---- */
  function parseRefine(text) {
    var t = String(text || "").trim(), s = t.toLowerCase(), f = {};
    var m = s.match(/(?:under|below|less than|max|<)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?/);
    if (m) f.maxPrice = parseFloat(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1);
    m = s.match(/(?:over|above|more than|min|at least|>)\s*\$\s*(\d[\d,]*(?:\.\d+)?)/);
    if (m) f.minPrice = parseFloat(m[1].replace(/,/g, ""));
    m = s.match(/\b(psa|bgs|sgc|cgc|tag)\s*(\d+(?:\.5)?)\s*(\+|or (?:better|higher|up)|and up)?/);
    if (m) { f.grader = m[1].toUpperCase(); f.minGrade = parseFloat(m[2]); f.gradeExact = !m[3] && !/\bonly\b/.test(s) ? false : !m[3]; if (m[3] || /\+/.test(s)) f.gradeExact = false; }
    if (/\braw\b/.test(s)) f.raw = true;
    if (/\b(graded|slab|slabbed)\b/.test(s) && !f.grader) f.graded = true;
    m = s.match(/\b(?:no|not|without|exclude|skip)\s+([a-z0-9][a-z0-9 .'-]{1,30})/);
    if (m) f.exclude = m[1].replace(/\s+(please|thanks)$/, "").trim();
    return { text: t, filter: f };
  }
  function gradeOf(item) {
    var src = (item.grade || "") + " " + (item.title || "");
    var m = src.match(/\b(PSA|BGS|SGC|CGC|TAG)\s*(\d+(?:\.5)?)\b/i);
    return m ? { grader: m[1].toUpperCase(), n: parseFloat(m[2]) } : null;
  }
  function total(item) { return (Number(item.price) || 0) + (Number(item.shipping) || 0); }
  function passes(item, f) {
    if (!f) return true;
    var tot = total(item);
    if (f.maxPrice != null && !(tot > 0 && tot <= f.maxPrice)) return false;
    if (f.minPrice != null && !(tot >= f.minPrice)) return false;
    var g = gradeOf(item);
    if (f.grader) { if (!g || g.grader !== f.grader || g.n < f.minGrade) return false; }
    if (f.raw && g) return false;
    if (f.graded && !g) return false;
    if (f.exclude) { var hay = ((item.title || "") + " " + (item.player || "")).toLowerCase(); if (hay.indexOf(f.exclude) > -1) return false; }
    return true;
  }
  function applyChips(items, chips) {
    return (items || []).filter(function (it) { return (chips || []).every(function (c) { return passes(it, c.filter); }); });
  }

  /* ---- prompt ---- */
  var SHAPE = '{"items":[{"title":"","price":0,"shipping":0,"currency":"USD","url":"","image":"","source":"","year":"","set":"","number":"","player":"","variant":"","grade":"","fit":0,"why":""}],"reply":""}';
  function buildPrompt(opts) {
    opts = opts || {};
    var intent = intentById(opts.intent) || intentById("other");
    var sites = sitesFor(opts.sites).filter(function (s) { return s.access === "web"; });
    var chips = (opts.chips || []).map(function (c) { return c.text; }).filter(Boolean);
    return [
      "You are CardHound, a trading card buy-hunter. Use your web search tool now to find REAL listings that are for sale right now.",
      "Request: " + String(opts.query || "").slice(0, 600),
      chips.length ? "Refinements (all must hold): " + chips.join("; ") : "",
      "Goal: " + intent.guide,
      sites.length ? "Search these marketplaces first: " + sites.map(function (s) { return s.name + " (" + s.domains[0] + ")"; }).join(", ") + ". Other public card marketplaces are fine." : "",
      "Rules: Only include a listing if your search results show its exact listing page URL (for eBay an /itm/ URL). Never invent or guess a URL, price, or photo. No search pages, no sold/completed listings, no login-only pages. Copy the price and shipping as listed (shipping 0 if free, null if unknown). image is the listing photo URL only if you saw it, else empty. Fill year, set, card number, player, parallel/variant, and grade (e.g. PSA 9 or Raw) from the title. fit is 0-100 for how well it matches the request and goal. why is under 14 words. Return up to 10 items, best first. If you find none, return an empty items list and say why in reply.",
      "reply: one short friendly sentence (under 25 words) about what you found and one refinement idea.",
      "Answer with ONLY this JSON, no markdown: " + SHAPE
    ].filter(Boolean).join("\n");
  }

  function buildRequest(provider, key, prompt) {
    if (provider === "chatgpt") return {
      url: "https://api.openai.com/v1/responses",
      init: { method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODELS.chatgpt, tools: [{ type: "web_search" }], tool_choice: "auto", include: ["web_search_call.action.sources"], input: prompt }) }
    };
    if (provider === "claude") return {
      url: "https://api.anthropic.com/v1/messages",
      init: { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" },
        body: JSON.stringify({ model: MODELS.claude, max_tokens: 3000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }], messages: [{ role: "user", content: prompt }] }) }
    };
    if (provider === "gemini") return {
      url: "https://generativelanguage.googleapis.com/v1beta/models/" + MODELS.gemini + ":generateContent",
      init: { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }) }
    };
    return null;
  }

  /* Text + URLs the provider's search actually returned (null = provider does not expose them). */
  function readReply(provider, json) {
    json = json || {}; var text = "", seen = [];
    if (provider === "chatgpt") {
      (json.output || []).forEach(function (o) {
        if (o.type === "web_search_call" && o.action && o.action.sources) o.action.sources.forEach(function (s) { if (s && s.url) seen.push(s.url); });
        if (o.type === "message") (o.content || []).forEach(function (c) {
          if (c.text) text += c.text;
          (c.annotations || []).forEach(function (a) { if (a && a.url) seen.push(a.url); });
        });
      });
      if (!text && json.output_text) text = json.output_text;
      return { text: text, seen: seen };
    }
    if (provider === "claude") {
      (json.content || []).forEach(function (b) {
        if (b.type === "text") { text += b.text || ""; (b.citations || []).forEach(function (c) { if (c && c.url) seen.push(c.url); }); }
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach(function (r) { if (r && r.url) seen.push(r.url); });
      });
      return { text: text, seen: seen };
    }
    if (provider === "gemini") {
      var c = json.candidates && json.candidates[0];
      ((c && c.content && c.content.parts) || []).forEach(function (p) { if (p.text) text += p.text; });
      return { text: text, seen: null }; /* grounding chunks are redirect links, not listing URLs */
    }
    return { text: "", seen: null };
  }
  function extractJson(text) {
    var s = String(text || "").replace(/```json|```/g, " ");
    var a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) {
      var ia = s.indexOf("["), ib = s.lastIndexOf("]");
      if (ia > -1 && ib > ia) { try { return { items: JSON.parse(s.slice(ia, ib + 1)) }; } catch (e2) {} }
      return null;
    }
  }
  function num(v) { if (v == null || v === "") return null; if (/free/i.test(String(v))) return 0; var n = parseFloat(String(v).replace(/[^0-9.]/g, "")); return isFinite(n) ? n : null; }
  function str(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n || 140); }
  function cleanItems(rawItems, seen, campid) {
    var seenKeys = null;
    if (seen && seen.length) { seenKeys = {}; seen.forEach(function (u) { seenKeys[urlKey(u)] = true; }); }
    var out = [], dupe = {}, dropped = { noUrl: 0, unseen: 0, noPrice: 0 };
    (rawItems || []).forEach(function (r) {
      if (!r || typeof r !== "object") return;
      var url = listingUrl(r.url);
      if (!url) { dropped.noUrl++; return; }
      var k = urlKey(url);
      if (seenKeys && !seenKeys[k]) { dropped.unseen++; return; }
      if (dupe[k]) return; dupe[k] = true;
      var price = num(r.price);
      if (price == null || price <= 0) { dropped.noPrice++; return; }
      var img = str(r.image, 500); if (!/^https:\/\//.test(img)) img = "";
      out.push({
        id: k, url: url, link: affiliate(url, campid), title: str(r.title, 160) || "Listing", price: price, shipping: num(r.shipping),
        currency: str(r.currency, 4) || "USD", image: img, source: sourceName(hostOf(url)),
        year: str(r.year, 9), set: str(r.set, 60), number: str(r.number, 16).replace(/^#/, ""), player: str(r.player, 60),
        variant: str(r.variant, 60), grade: str(r.grade, 20), fit: Math.max(0, Math.min(100, num(r.fit) || 0)), why: str(r.why, 120),
        checked: !!seenKeys
      });
    });
    out.sort(function (a, b) { return b.fit - a.fit; });
    return { items: out, dropped: dropped };
  }
  function interpret(provider, status, json, campid) {
    if (!status || status < 200 || status >= 300) {
      var msg = json && json.error && (json.error.message || json.error.status) || "";
      return { ok: false, reason: status === 401 || status === 403 ? "key" : (status === 429 ? "quota" : "http"), status: status, detail: str(msg, 200) };
    }
    var rr = readReply(provider, json);
    var parsed = extractJson(rr.text);
    if (!parsed) return { ok: false, reason: rr.text ? "format" : "empty", detail: str(rr.text, 200) };
    var c = cleanItems(parsed.items || [], rr.seen, campid);
    return { ok: true, items: c.items, dropped: c.dropped, reply: str(parsed.reply, 220), verified: !!(rr.seen && rr.seen.length) };
  }
  function run(opts) {
    opts = opts || {};
    var req = buildRequest(opts.provider, opts.key, buildPrompt(opts));
    var fetchFn = opts.fetch || (typeof fetch === "function" ? fetch.bind(root) : null);
    if (!req || !fetchFn) return Promise.resolve({ ok: false, reason: "setup" });
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeout || 90000) : null;
    var init = ctrl ? Object.assign({}, req.init, { signal: ctrl.signal }) : req.init;
    return fetchFn(req.url, init).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (j) { return interpret(opts.provider, res.status, j, opts.campid); });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      var m = String(err && err.message || err || "");
      return { ok: false, reason: /abort/i.test(m) ? "timeout" : "network", detail: str(m, 120) };
    });
  }
  function failLine(r) {
    r = r || {};
    if (r.reason === "key") return "Your AI key was not accepted. Check it under More → Settings.";
    if (r.reason === "quota") return "Your AI account is out of credit or rate-limited. Try again soon.";
    if (r.reason === "timeout") return "The hunt took too long. Try a tighter ask.";
    if (r.reason === "network") return "Couldn't reach your AI. Check your connection.";
    if (r.reason === "format" || r.reason === "empty") return "Your AI answered, but not with listings. Try again or reword.";
    return "Your AI did not accept the hunt" + (r.status ? " (" + r.status + ")" : "") + ".";
  }
  var api = { MODELS: MODELS, INTENTS: INTENTS, intentById: intentById, SITES: SITES, DEFAULT_SITES: DEFAULT_SITES, siteById: siteById, sitesFor: sitesFor,
    listingUrl: listingUrl, affiliate: affiliate, parseRefine: parseRefine, passes: passes, applyChips: applyChips, total: total,
    buildPrompt: buildPrompt, buildRequest: buildRequest, readReply: readReply, extractJson: extractJson, cleanItems: cleanItems,
    interpret: interpret, run: run, failLine: failLine };
  root.CH_HUNT = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
