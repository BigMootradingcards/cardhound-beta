/* CH_VAULT — on-device secrets at rest (user AI key, user API tokens).
   AES-GCM 256 with a NON-EXTRACTABLE CryptoKey kept in IndexedDB; ciphertext in localStorage ("ch_vault").
   Secrets never leave this phone except to the provider the user picked, at the moment of a call.
   Legacy plaintext keys (ch_ai_secret, ch_keys) are migrated and deleted on first load.
   If WebCrypto/IndexedDB is unavailable, falls back to plaintext localStorage and says so (mode: "plain"). */
(function (root) {
  "use strict";
  var NAMES = ["ai_secret", "keys", "ai_endpoint"];
  var cache = {}, key = null, mode = "loading";
  function b64(buf) { var s = "", a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(str) { var s = atob(str), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open("ch_vault", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("k"); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(db, k) { return new Promise(function (res, rej) { var q = db.transaction("k").objectStore("k").get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }
  function idbPut(db, k, v) { return new Promise(function (res, rej) { var t = db.transaction("k", "readwrite"); t.objectStore("k").put(v, k); t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; }); }
  function legacy() {
    NAMES.forEach(function (n) {
      try { var v = localStorage.getItem("ch_" + n); if (v != null) { if (cache[n] == null) cache[n] = JSON.parse(v); localStorage.removeItem("ch_" + n); } } catch (e) {}
    });
  }
  var writing = Promise.resolve();
  function persist() {
    if (mode !== "crypto") { NAMES.forEach(function (n) { try { if (cache[n] == null) localStorage.removeItem("ch_" + n); else localStorage.setItem("ch_" + n, JSON.stringify(cache[n])); } catch (e) {} }); return Promise.resolve(); }
    var snapshot = JSON.stringify(cache);
    writing = writing.then(function () {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(snapshot)).then(function (ct) {
        localStorage.setItem("ch_vault", JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) }));
      });
    }).catch(function () {});
    return writing;
  }
  var ready = (function () {
    if (!(root.crypto && crypto.subtle && root.indexedDB)) { mode = "plain"; NAMES.forEach(function (n) { try { var v = localStorage.getItem("ch_" + n); if (v != null) cache[n] = JSON.parse(v); } catch (e) {} }); return Promise.resolve(); }
    return idb().then(function (db) {
      return idbGet(db, "main").then(function (k) {
        if (k) return k;
        return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]).then(function (nk) { return idbPut(db, "main", nk).then(function () { return nk; }); });
      });
    }).then(function (k) {
      key = k; mode = "crypto";
      var blob = null; try { blob = JSON.parse(localStorage.getItem("ch_vault") || "null"); } catch (e) {}
      if (!blob) return null;
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.ct)).then(function (pt) { cache = JSON.parse(new TextDecoder().decode(pt)) || {}; }, function () { cache = {}; });
    }).then(function () {
      var had = NAMES.some(function (n) { return localStorage.getItem("ch_" + n) != null; });
      legacy(); if (had) return persist();
    }).catch(function () { mode = "plain"; legacy(); NAMES.forEach(function (n) { if (cache[n] != null) try { localStorage.setItem("ch_" + n, JSON.stringify(cache[n])); } catch (e) {} }); });
  })();
  var api = {
    names: NAMES, ready: ready, mode: function () { return mode; }, has: function (n) { return NAMES.indexOf(n) > -1; },
    get: function (n, d) { return cache[n] == null ? d : JSON.parse(JSON.stringify(cache[n])); },
    set: function (n, v) { if (v == null || v === "") delete cache[n]; else cache[n] = v; return persist(); },
    clear: function () { cache = {}; return persist(); }
  };
  root.CH_VAULT = api;
})(typeof window !== "undefined" ? window : globalThis);
