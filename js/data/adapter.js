/* CardHound data adapter interface.
 * The app only ever talks to window.CH_DATA. Every method returns a Promise.
 *
 *   getCardReport(id)         -> report object (see data/sample.js "reports")
 *   getCandidates(photo)      -> top match candidates for a photo
 *   identifyCard(photo)       -> { candidates, sample: true|false }
 *   getMovers(scope)          -> rows; scope = { view: "overall"|"category"|"set", value: "Baseball" | "Panini Prizm" }
 *   getPicks(scope)           -> Buy / Hold / Sell rows
 *   getMostSearched(scope)    -> Most Searched rows
 *   getDeals() / getGems() / getSavedSearches()
 *   getHuntListings() -> listings for voice/prompt hunts (see data/sample.js huntListings for the fields)
 *   getGemHunts() / saveGemHunt(h) / deleteGemHunt(id), getVoiceWatch() / addVoiceWatch(card) / removeVoiceWatch(card): local, js/data/local-hunts.js
 *   meta()                    -> labels, categories, sets
 *   getLedger() / addLedgerRow(row|rows) / updateLedgerRow(id, patch) / getPortfolio() / resetLedger()
 *                             -> the user's Ledger and Portfolio, stored on this phone only (js/data/local-ledger.js)
 *   getNewHighs(scope)        -> new high comps: { card, grade, tier: "ath"|"90d", oldHigh, newHigh, pct, date, sale } (exact-variant + quality gate passed)
 *   getNewHighRejects(scope)  -> sales that were NOT counted (mis-variant, outlier, failed quality gate)
 *   getAlertSettings() / setAlertSettings(patch) -> new-high alert settings, on this phone only (js/data/local-alerts.js)
 *
 * Adapters register with CH_ADAPTERS.register(name, impl). js/config.js picks one by name.
 */
(function () {
  var registry = {};
  window.CH_ADAPTERS = {
    register: function (name, impl) { registry[name] = impl; },
    get: function (name) { return registry[name]; },
    list: function () { return Object.keys(registry); }
  };
  window.CH_scopeFilter = function (rows, scope) {
    if (!scope || scope.view === "overall" || !scope.value) return rows.slice();
    var key = scope.view === "category" ? "category" : "set";
    return rows.filter(function (r) { return r[key] === scope.value; });
  };
})();
