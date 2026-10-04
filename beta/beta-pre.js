/* CardHound friends beta: loaded before live.js. Talks to the CardHound API (cardhound_api) with a per-friend invite
 * token, maps the live layer's /api/live/* calls onto the API, and turns "in line" (HTTP 202) into a friendly wait.
 * No secrets live here: the API base is public, the token is the friend's own session. Prices are SAMPLE until the
 * server says otherwise (data.sample in every reply). */
(function () {
  "use strict";
  var meta = document.querySelector('meta[name="ch-api"]');
  var API = String(window.CH_BETA_API || (meta && meta.content) || "https://cardhound-api.onrender.com").replace(/\/+$/, "");
  var TK = "ch_beta_token", WK = "ch_beta_who";
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function who() { try { return JSON.parse(get(WK) || "null"); } catch (e) { return null; } }
  function setSession(tok, w) { set(TK, tok || null); set(WK, tok && w ? JSON.stringify(w) : null); }
  window.CH_LIVE_CFG = { live: true, beta: true, label: "Sample prices (made up for the beta)", thinN: 5 };
  try { sessionStorage.removeItem("ch_plan_preview"); } catch (e) {}          /* the beta is always Pro: no free-plan preview */
  var realFetch = window.fetch.bind(window);
  var B = window.CH_BETA = { api: API, token: function () { return get(TK) || ""; }, who: who, setSession: setSession, data: null, queue: null };

  function J(status, obj) { return new Response(JSON.stringify(obj), { status: status, headers: { "Content-Type": "application/json" } }); }
  function apiFetch(path, opt) {
    opt = opt || {}; var h = {}, k; for (k in (opt.headers || {})) h[k] = opt.headers[k];
    var t = B.token(); if (t) h.Authorization = "Bearer " + t;
    return realFetch(API + path, { method: opt.method || "GET", body: opt.body, headers: h, credentials: "omit", mode: "cors", cache: "no-store" });
  }
  B.fetch = apiFetch;
  B.json = function (path, opt) {
    return apiFetch(path, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
      if (r.status === 401) { signedOut(); }
      if (!r.ok) { var e = new Error(msg(j, r.status)); e.status = r.status; e.code = j.error && j.error.code; throw e; } return j; }); });
  };
  function msg(j, st) {
    var e = j && j.error; if (typeof e === "string") return e; if (e && e.message) return e.message;
    return st === 0 ? "Can't reach CardHound right now. Check your connection." : "Something went wrong (" + st + "). Try again.";
  }
  function signedOut() { setSession(null); if (!/^#\/welcome/.test(location.hash)) location.hash = "#/welcome"; }
  B.signedOut = signedOut;

  /* ---------- invite login: typed code or one-tap ?code= link ---------- */
  B.login = function (code) {
    return realFetch(API + "/v1/beta/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code }), credentials: "omit", mode: "cors" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(msg(j, r.status)); e.code = j.error && j.error.code; throw e; }
        setSession(j.token, j.beta); return j.beta; }); });
  };
  var qs = new URLSearchParams(location.search), code = qs.get("code");
  if (code) {                                                    /* never leave the code in the address bar or history */
    qs.delete("code"); var clean = location.pathname + (qs.toString() ? "?" + qs : "") + "#/welcome";
    try { history.replaceState(null, "", clean); } catch (e) {}
    B.pendingCode = code;
  }
  if (!B.token() && !/^#\/welcome/.test(location.hash)) { try { history.replaceState(null, "", location.pathname + location.search + "#/welcome"); } catch (e) { location.hash = "#/welcome"; } }

  /* ---------- the lookup queue: 202 "In line, about N seconds" -> wait, then retry with the ticket ---------- */
  var qEl = null, qTimer = null;
  function showQueue(p) {
    if (!qEl) { qEl = document.createElement("div"); qEl.className = "bt-q"; qEl.setAttribute("role", "status"); qEl.setAttribute("aria-live", "polite"); document.body.appendChild(qEl); }
    var left = Math.max(1, p.wait_seconds | 0), pos = p.position | 0;
    function draw() {
      qEl.innerHTML = '<span class="bt-qd" aria-hidden="true"><i></i><i></i><i></i></span><span class="bt-qt"><b>In line, about ' + left + ' second' + (left === 1 ? "" : "s") + '</b>' +
        '<small>' + (pos > 1 ? (pos - 1) + " lookup" + (pos > 2 ? "s" : "") + " ahead of you · " : "") + "Lots of friends checking at once. Your card is next up, no need to tap again.</small></span>";
    }
    draw(); qEl.hidden = false; document.body.classList.add("bt-queued");
    var ld = document.querySelector(".lv-load b"); if (ld) ld.textContent = "In line, about " + left + " seconds…";
    clearInterval(qTimer); qTimer = setInterval(function () { if (left > 1) { left--; draw(); var l2 = document.querySelector(".lv-load b"); if (l2) l2.textContent = "In line, about " + left + " seconds…"; } }, 1000);
    B.queue = p;
  }
  function hideQueue() { clearInterval(qTimer); if (qEl) qEl.hidden = true; document.body.classList.remove("bt-queued"); B.queue = null; }
  B.showQueue = showQueue; B.hideQueue = hideQueue;
  /* Render's free plan sleeps after 15 idle minutes; the first request can take up to a minute to wake it */
  function slowNote(pr) {
    var t = setTimeout(function () { var l = document.querySelector(".lv-load b"); if (l && !B.queue) l.textContent = "Waking up CardHound… the first check can take up to a minute"; }, 6000);
    return pr.then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
  B.slowNote = slowNote;
  function queued(make) {
    var t0 = Date.now();
    function round(ticket) {
      return make(ticket).then(function (r) {
        if (r.status !== 202) { hideQueue(); return r; }
        return r.json().then(function (p) {
          if (Date.now() - t0 > 6 * 60 * 1000) { hideQueue(); return J(503, { error: "CardHound is very busy right now. Try again in a few minutes." }); }
          showQueue(p);
          var wait = Math.min(15, Math.max(2, p.retry_after || p.wait_seconds || 3)) * 1000;
          return new Promise(function (res) { setTimeout(res, wait); }).then(function () { return round(p.ticket); });
        });
      }, function (er) { hideQueue(); throw er; });
    }
    return slowNote(round(null));
  }

  /* ---------- /api/live/* -> the CardHound API ---------- */
  function adapt(r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (r.status === 401) { signedOut(); return J(403, { error: "Enter your invite code to keep going." }); }
      if (!r.ok) return J(r.status, { error: msg(j, r.status) });
      if (j.data) { B.data = j.data; window.CH_LIVE_CFG.thinN = j.data.sample ? 5 : 12; }
      return J(200, j);
    });
  }
  function body(o) { try { return JSON.parse(o.body || "{}"); } catch (e) { return {}; } }
  function route(url, o) {
    var u = new URL(url, location.href), p = u.pathname.replace(/^.*?(\/api\/live\/|\/legal\/)/, "$1");
    if (p === "/api/live/ask") { var a = body(o);
      return queued(function (tk) { return apiFetch("/v1/voice/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: a.text, session: a.session || undefined, ticket: tk || undefined }) }); }).then(adapt); }
    if (p === "/api/live/photo") { var s = u.searchParams.get("session"), ct = (o.headers || {})["Content-Type"] || "image/jpeg";
      return queued(function (tk) { var q = []; if (s) q.push("session=" + encodeURIComponent(s)); if (tk) q.push("ticket=" + encodeURIComponent(tk));
        return apiFetch("/v1/photo/match" + (q.length ? "?" + q.join("&") : ""), { method: "POST", headers: { "Content-Type": ct }, body: o.body }); }).then(adapt); }
    if (p === "/api/live/watch") { var w = body(o), c = w.card || {};
      return apiFetch("/v1/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: c.card_id, grade: w.grade || c.grade || null }) })
        .then(function (r) { return r.ok ? J(200, { status: "added to your watchlist", card: c }) : adapt(r); }); }
    if (p === "/api/live/confirm") { var cf = body(o);
      return apiFetch("/v1/voice/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: cf.token }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok ? J(200, j.confirm || j) : J(r.status, { error: msg(j, r.status) }); }); }); }
    if (p === "/api/live/usage") return apiFetch("/v1/beta/status").then(function (r) { return r.json(); }).then(function (j) { return J(200, { usage: j.queue || {}, live: j.data || {} }); });
    if (p === "/api/live/comps") return Promise.resolve(J(200, {}));
    return Promise.resolve(J(404, { error: "Not in the beta yet." }));
  }
  window.fetch = function (input, opt) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (/^\/(api\/live\/|legal\/)/.test(url)) return route(url, opt || {}).catch(function (e) { return J(503, { error: "Can't reach CardHound right now. Check your connection." }); });
    return realFetch(input, opt);
  };

  /* ---------- screens the live layer must not own in the beta (paywall, settings, legal, connections) ---------- */
  var OWN = { pro: 1, about: 1, legal: 1, connections: 1 };
  (window.CH_APP_PLUGINS = window.CH_APP_PLUGINS || []).push(function (U) {
    var set0 = U.setRoute, add0 = U.addRoute;
    B.setRoute = set0; B.addRoute = add0; B.reportHooks = [];
    U.setRoute = function (name, fn) {
      if (OWN[name]) return;                                                     /* beta.js sets these */
      if (name === "report") { var f = fn; fn = function (p) { f(p); B.reportHooks.forEach(function (h) { try { h(p); } catch (e) { if (window.console) console.error(e); } }); }; }
      set0(name, fn);
    };
    U.addRoute = function (name, fn) { if (OWN[name]) return; add0(name, fn); };
  });
})();
