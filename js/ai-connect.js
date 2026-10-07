/* One AI slot.
   AI job: read sold comps and call deal, overpaying, or underpaying, with a
   chart for that card. Also hunt the open market from the user's prompts
   (listings, deals, promos, hard-to-find cards), daily or on their schedule.
   Card Ladder job: raw sold comps only. Not a buy finder.
   Step 2: the user pastes their own key. It stays on this phone until a hunt
   is sent. OAuth is not wired.
   Step 3: one hunt call to the provider with that key. A reply is live only
   when the provider returns text. All supported providers accept a browser call from github.io
   (CORS verified Oct 7); a bad key comes back as an HTTP error. Later: a scheduled hunt and a live
   deal call on comps. */
(function (root) {
  "use strict";
  var JOB = {
    ai: "Reads sold comps and calls deal, overpaying, or underpaying, with a chart to track that card. Also hunts the open market for what you search: listings, deals, promos, hard-to-find cards, daily or on the schedule you set.",
    aiShort: "Deal call and chart, plus open-market buy hunts.",
    ladder: "Sold comps only. Not for finding cards to buy.",
    ladderShort: "Sold comps only. Not a buy finder."
  };
  /* Provider names are NEVER shown to users (Maurice, Oct 7): every display name is "Your AI".
     The provider is detected from the key format or the optional endpoint. Ids are internal routing only.
     (Sponsored-slot placeholder: a future sponsored AI could be listed here — code comment only, no UI.) */
  var PROVIDERS = [
    { id: "chatgpt", name: "Your AI", mono: "AI", blurb: "" },
    { id: "claude", name: "Your AI", mono: "AI", blurb: "" },
    { id: "gemini", name: "Your AI", mono: "AI", blurb: "" },
    { id: "custom", name: "Your AI", mono: "AI", blurb: "" }
  ];
  /* Key / endpoint -> internal provider id. null = can't tell (ask for the endpoint). */
  function detect(key, endpoint) {
    var e = String(endpoint || "").trim().toLowerCase();
    if (e) {
      if (/(^|\.)openai\.com/.test(hostOf(e))) return "chatgpt";
      if (/(^|\.)anthropic\.com/.test(hostOf(e))) return "claude";
      if (/generativelanguage\.googleapis\.com/.test(hostOf(e))) return "gemini";
      if (/^https:\/\//.test(e)) return "custom";
      return null;
    }
    var k = String(key || "").trim();
    if (/^sk-ant-/.test(k)) return "claude";
    if (/^AIza[0-9A-Za-z_\-]{20,}$/.test(k)) return "gemini";
    if (/^sk-/.test(k)) return "chatgpt";
    return null;
  }
  function hostOf(u) { try { return new URL(u).hostname; } catch (x) { return ""; } }
  /* Custom endpoint (OpenAI-compatible chat completions). Model from ?model= on the endpoint, else a sensible default. */
  function customTarget(endpoint) {
    var u; try { u = new URL(String(endpoint || "").trim()); } catch (x) { return null; }
    if (u.protocol !== "https:") return null;
    var model = u.searchParams.get("model") || (/perplexity/.test(u.hostname) ? "sonar" : "default");
    u.searchParams.delete("model");
    var path = u.pathname.replace(/\/+$/, "");
    if (!/\/chat\/completions$/.test(path)) path += "/chat/completions";
    return { url: u.origin + path + (u.search || ""), model: model };
  }
  function byId(id) {
    for (var i = 0; i < PROVIDERS.length; i++) if (PROVIDERS[i].id === id) return PROVIDERS[i];
    return null;
  }
  function normalize(raw) {
    raw = raw || {};
    var known = byId(raw.provider);
    var provider = known ? known.id : null;
    return { provider: provider, skipped: !provider && !!raw.skipped };
  }
  function connected(raw) { return !!normalize(raw).provider; }
  function settled(raw) { var s = normalize(raw); return !!(s.provider || s.skipped); }
  function acceptKey(raw) {
    var key = String(raw || "").replace(/\s+/g, "");
    if (key.length < 8) return null;
    return key;
  }
  function maskKey(key) {
    key = String(key || "");
    if (key.length < 4) return "";
    return key.slice(-4);
  }
  var HUNT_NOTE = "This is a buy hunt, not a sold-price feed. Name the card if you can (year, set, number, player, variant). If you cannot, say what is missing. Say deal, overpaying, or underpaying only when you know a real sold price. Otherwise say you cannot call the price. Name where to look for listings, deals, promos, or hard-to-find copies. Do not invent a sold price. Card Ladder is the sold-comp source. Under 80 words.";
  function huntPrompt(text) {
    return HUNT_NOTE + " User asked: " + String(text || "").slice(0, 1500);
  }
  function readText(provider, json) {
    json = json || {};
    if (provider === "chatgpt" || provider === "custom") {
      var msg = json.choices && json.choices[0] && json.choices[0].message;
      return msg && msg.content ? String(msg.content) : "";
    }
    if (provider === "claude") {
      var blocks = json.content || [];
      return blocks.map(function (b) { return b && b.text ? b.text : ""; }).join(" ");
    }
    if (provider === "gemini") {
      var parts = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts || [];
      return parts.map(function (p) { return p && p.text ? p.text : ""; }).join(" ");
    }
    return "";
  }
  function buildRequest(provider, key, text, image, opts) {
    opts = opts || {};
    var prompt = opts.raw ? String(text || "") : huntPrompt(text);
    if (provider === "custom") {
      var tg = customTarget(opts.endpoint);
      if (!tg) return null;
      return { url: tg.url, init: { method: "POST", headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: tg.model, messages: [{ role: "user", content: prompt }] }) } };
    }
    if (provider === "chatgpt") {
      var content = [{ type: "text", text: prompt }];
      if (image && image.data) content.push({ type: "image_url", image_url: { url: "data:" + (image.mime || "image/jpeg") + ";base64," + image.data } });
      return {
        url: "https://api.openai.com/v1/chat/completions",
        init: {
          method: "POST",
          headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-5-mini", messages: [{ role: "user", content: content }] })
        }
      };
    }
    if (provider === "claude") {
      var parts = [];
      if (image && image.data) parts.push({ type: "image", source: { type: "base64", media_type: image.mime || "image/jpeg", data: image.data } });
      parts.push({ type: "text", text: prompt });
      return {
        url: "https://api.anthropic.com/v1/messages",
        init: {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
            "content-type": "application/json"
          },
          body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 400, messages: [{ role: "user", content: parts }] })
        }
      };
    }
    if (provider === "gemini") {
      var gparts = [{ text: prompt }];
      if (image && image.data) gparts.push({ inline_data: { mime_type: image.mime || "image/jpeg", data: image.data } });
      return {
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents: [{ parts: gparts }] })
        }
      };
    }
    return null;
  }
  function interpret(provider, outcome) {
    outcome = outcome || {};
    if (!byId(provider)) return { live: false, reason: "skipped" };
    if (outcome.error === "blocked") return { live: false, reason: "blocked", provider: provider };
    if (outcome.error) return { live: false, reason: "network", provider: provider };
    if (!outcome.status || outcome.status < 200 || outcome.status >= 300) return { live: false, reason: "http", provider: provider };
    var text = readText(provider, outcome.json).replace(/\s+/g, " ").trim();
    if (!text) return { live: false, reason: "empty", provider: provider };
    return { live: true, text: text.slice(0, 1200), provider: provider };
  }
  function sampleLine(result) {
    result = result || {};
    var known = byId(result.provider);
    var name = known ? known.name : "";
    if (result.status === "live") return "A reply came back from your AI. Sold prices on this page stay SAMPLE.";
    if (result.reason === "http") return "Your AI key didn't work. Still SAMPLE.";
    if (result.reason === "blocked") return "Couldn't reach your AI. Still SAMPLE.";
    if (result.status === "pending") return "Asking your AI. Still SAMPLE until a reply returns.";
    if (result.reason === "skipped") return "AI is skipped. Still SAMPLE.";
    if (result.reason === "no-key") return "No key on this phone. Still SAMPLE.";
    if (result.reason === "held") return "You kept this on the phone. Still SAMPLE.";
    if (result.reason === "blocked") return "The browser blocked the " + (name ? name + " " : "") + "call. Still SAMPLE.";
    if (result.reason === "http") return (name || "The AI") + " did not accept the call. Still SAMPLE.";
    if (result.reason === "empty") return (name || "The AI") + " returned nothing. Still SAMPLE.";
    if (result.reason === "photo") return "The photo stayed on this phone. Still SAMPLE.";
    return "The call did not return. Still SAMPLE.";
  }
  function huntLine(result) { return sampleLine(result); }
  function ask(opts) {
    opts = opts || {};
    var provider = byId(opts.provider);
    var key = acceptKey(opts.key);
    if (!provider) return Promise.resolve({ live: false, reason: "skipped" });
    if (!key) return Promise.resolve({ live: false, reason: "no-key", provider: provider.id });
    var text = String(opts.text || "").trim();
    var image = opts.image && opts.image.data ? opts.image : null;
    if (image && String(image.data).length > 1800000) image = null;
    if (!text && !image) return Promise.resolve({ live: false, reason: "photo", provider: provider.id });
    if (!text) text = "Name this card from the photo.";
    var req = buildRequest(provider.id, key, text, image, { raw: !!opts.raw, endpoint: opts.endpoint });
    var fetchFn = opts.fetch || (typeof fetch === "function" ? fetch : null);
    if (!req || !fetchFn) return Promise.resolve({ live: false, reason: "network", provider: provider.id });
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    var init = req.init;
    if (ctrl) init = Object.assign({}, init, { signal: ctrl.signal });
    return fetchFn(req.url, init).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res || !res.ok) return interpret(provider.id, { status: res && res.status });
      return res.json().then(function (json) {
        return interpret(provider.id, { status: res.status, json: json });
      }, function () { return interpret(provider.id, { status: res.status, json: {} }); });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      var msg = String(err && err.message || err || "");
      var blocked = /failed to fetch|networkerror|load failed|cors/i.test(msg);
      var aborted = /abort/i.test(msg);
      return interpret(provider.id, { error: blocked ? "blocked" : (aborted ? "network" : "network") });
    });
  }
  var api = {
    job: JOB, providers: PROVIDERS, byId: byId, normalize: normalize, connected: connected, settled: settled,
    detect: detect, customTarget: customTarget, acceptKey: acceptKey, maskKey: maskKey, readText: readText, interpret: interpret, sampleLine: sampleLine,
    huntLine: huntLine, buildRequest: buildRequest, ask: ask
  };
  root.CH_AI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
