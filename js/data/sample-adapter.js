/* SampleAdapter: reads window.CARDHOUND_SAMPLE (data/sample.js). Every value is invented sample data. */
(function () {
  var S = function () { return window.CARDHOUND_SAMPLE; };
  var ok = function (v) { return Promise.resolve(JSON.parse(JSON.stringify(v))); };
  CH_ADAPTERS.register("sample", {
    name: "Sample data",
    isSample: true,
    meta: function () { return ok(S().meta); },
    getCardReport: function (id) { return ok(S().reports[id] || S().reports["PUJOLS-01TCT-T247"]); },
    getCandidates: function () { return ok(S().candidates); },
    identifyCard: function (photo) { return ok({ candidates: S().candidates, sample: true }); },
    getMovers: function (scope) { return ok(CH_scopeFilter(S().movers, scope)); },
    getPicks: function (scope) { return ok(CH_scopeFilter(S().picks, scope)); },
    getMostSearched: function (scope) { return ok(CH_scopeFilter(S().searched, scope)); },
    getDeals: function () { return ok(S().deals); },
    getGems: function () { return ok(S().gems); },
    getSavedSearches: function () { return ok(S().savedSearches); },
    getHuntListings: function () { return ok(S().huntListings || []); },
    /* Ledger + Portfolio: stored on this phone only (js/data/local-ledger.js) */
    getLedger: CH_LOCAL_LEDGER.getLedger, addLedgerRow: CH_LOCAL_LEDGER.addLedgerRow, updateLedgerRow: CH_LOCAL_LEDGER.updateLedgerRow,
    resetLedger: CH_LOCAL_LEDGER.resetLedger, getPortfolio: CH_LOCAL_LEDGER.getPortfolio,
    /* New high comps (BOOM alerts): sample sales that already passed the exact-variant check and quality gate */
    getNewHighs: function (scope) { return ok(CH_scopeFilter(S().newHighs || [], scope).map(function (h) { h.pct = Math.round((h.newHigh / h.oldHigh - 1) * 1000) / 10; return h; })); },
    getNewHighRejects: function (scope) { return ok(CH_scopeFilter(S().newHighRejects || [], scope)); },
    getAlertSettings: CH_LOCAL_ALERTS.getAlertSettings, setAlertSettings: CH_LOCAL_ALERTS.setAlertSettings,
    getGemHunts: CH_LOCAL_HUNTS.getGemHunts, saveGemHunt: CH_LOCAL_HUNTS.saveGemHunt, deleteGemHunt: CH_LOCAL_HUNTS.deleteGemHunt,
    getVoiceWatch: CH_LOCAL_HUNTS.getVoiceWatch, addVoiceWatch: CH_LOCAL_HUNTS.addVoiceWatch, removeVoiceWatch: CH_LOCAL_HUNTS.removeVoiceWatch
  });
})();
