/* STUB: LicensedFeedAdapter (not active; the beta stays on SampleAdapter).
 * For a licensed commercial feed with Card Hedge-style endpoints (requires a commercial/Enterprise agreement,
 * see DATA-FEED-OPTIONS.md section 4). Calls must go through a CardHound server that holds the key; never ship a
 * feed key in this static site.
 *
 * Method mapping (planned):
 *   identifyCard(photo)   -> POST /cards/image-match        (photo ID -> candidates)
 *   getCandidates(text)   -> POST /cards/card-search
 *   getCardReport(id)     -> POST /cards/card-details + /cards/comps + /cards/prices-by-card (per grade)
 *   getMovers(scope)      -> GET  /cards/top-movers?category=...
 *   lookupCert(cert)      -> POST /cards/prices-by-cert
 *   getPicks / getMostSearched -> computed by CardHound from the above plus its own lookup log
 */
(function () {
  var BASE = "/api/feed"; // CardHound proxy (not built). Example only.
  var todo = function (m, ep) { return function () { return Promise.reject(new Error("LicensedFeedAdapter." + m + " not wired (" + ep + ")")); }; };
  CH_ADAPTERS.register("licensed-feed", {
    name: "Licensed feed (planned)", isSample: false, base: BASE,
    meta: todo("meta", "static"),
    identifyCard: todo("identifyCard", "POST /cards/image-match"),
    getCandidates: todo("getCandidates", "POST /cards/card-search"),
    getCardReport: todo("getCardReport", "POST /cards/card-details, /cards/comps, /cards/prices-by-card"),
    getMovers: todo("getMovers", "GET /cards/top-movers"),
    lookupCert: todo("lookupCert", "POST /cards/prices-by-cert"),
    getPicks: todo("getPicks", "computed"), getMostSearched: todo("getMostSearched", "lookup log"),
    getDeals: todo("getDeals", "eBay Browse via user OAuth"), getGems: todo("getGems", "computed"), getHuntListings: todo("getHuntListings", "eBay Browse via user OAuth"), getSavedSearches: todo("getSavedSearches", "eBay user OAuth"),
    // Ledger stays on the phone; a live build would value holdings via prices-by-card. Same local store as the beta.
    getLedger: CH_LOCAL_LEDGER.getLedger, addLedgerRow: CH_LOCAL_LEDGER.addLedgerRow, updateLedgerRow: CH_LOCAL_LEDGER.updateLedgerRow,
    resetLedger: CH_LOCAL_LEDGER.resetLedger, getPortfolio: CH_LOCAL_LEDGER.getPortfolio,
    // New highs: computed by CardHound from per-variant sold history (comps / prices-by-card), after the exact-variant check + quality gate
    getNewHighs: todo("getNewHighs", "POST /cards/comps + /cards/prices-by-card, then CardHound high-water marks"),
    getNewHighRejects: todo("getNewHighRejects", "CardHound quality-gate log"),
    getAlertSettings: CH_LOCAL_ALERTS.getAlertSettings, setAlertSettings: CH_LOCAL_ALERTS.setAlertSettings,
    getGemHunts: CH_LOCAL_HUNTS.getGemHunts, saveGemHunt: CH_LOCAL_HUNTS.saveGemHunt, deleteGemHunt: CH_LOCAL_HUNTS.deleteGemHunt,
    getVoiceWatch: CH_LOCAL_HUNTS.getVoiceWatch, addVoiceWatch: CH_LOCAL_HUNTS.addVoiceWatch, removeVoiceWatch: CH_LOCAL_HUNTS.removeVoiceWatch
  });
})();
