/* Alert settings, stored ON THIS PHONE ONLY (localStorage key "ch_alert_settings"). Mixed into every adapter.
 *   getAlertSettings()      -> { newHighs: { on, scope: "watch" | "all", tiers: { ath, d90 } }, haptics, push }
 *   setAlertSettings(patch) -> saved settings (deep-merged)
 * scope "watch" = Watchlist & Portfolio cards only; "all" = Everything. tiers.ath = all-time high (tier 1), tiers.d90 = 90-day high (tier 2).
 * push = the Notification API demo (permission requested by the user; in-app BOOM is the main path). */
(function () {
  var KEY = "ch_alert_settings";
  var DEF = { newHighs: { on: true, scope: "watch", tiers: { ath: true, d90: true } }, haptics: true, push: false };
  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };
  function merge(a, b) { Object.keys(b || {}).forEach(function (k) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { a[k] = merge(a[k] && typeof a[k] === "object" ? a[k] : {}, b[k]); } else a[k] = b[k]; }); return a; }
  function load() { var s = clone(DEF); try { var v = localStorage.getItem(KEY); if (v) merge(s, JSON.parse(v)); } catch (e) {} return s; }
  window.CH_LOCAL_ALERTS = {
    defaults: clone(DEF),
    getAlertSettings: function () { return Promise.resolve(load()); },
    setAlertSettings: function (patch) { var s = merge(load(), patch || {}); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} return Promise.resolve(clone(s)); }
  };
})();
