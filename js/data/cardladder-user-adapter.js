/* BYO Card Ladder user hook (step 2+3). Live sale-by-sale when pasted rows match the confirmed card (ladderCompsLive).
 * Users feed sold comps they export or paste from their own Ladder (identity + sale price + date).
 * CardHound does not scrape, does not collect passwords / cookies / session tokens, and does not
 * treat “hook set up” alone as live prices. SAMPLE stays until ladderCompsLive() (≥1 matched sale).
 * Reject scrape / password / cookie methods — engineering constraint, not a product pitch.
 */
(function () {
  var byoMsg = "BYO user hook — awaiting user-provided sold rows (no scrape, no password)";
  var scrapeMsg = "rejected: CardHound does not scrape Card Ladder or collect passwords/cookies";
  var no = function (m) {
    return function () { return Promise.reject(new Error("CardLadderUserAdapter." + m + ": " + byoMsg)); };
  };
  var rejectScrape = function (m) {
    return function () { return Promise.reject(new Error("CardLadderUserAdapter." + m + ": " + scrapeMsg)); };
  };
  CH_ADAPTERS.register("cardladder-user", {
    name: "Card Ladder (BYO user hook)",
    isSample: true, /* adapter itself is not a live feed; app flips live via ladderCompsLive() */
    meta: no("meta"),
    getCardReport: no("getCardReport"),
    getCandidates: no("getCandidates"),
    identifyCard: no("identifyCard"),
    getMovers: no("getMovers"),
    getPicks: no("getPicks"),
    getMostSearched: no("getMostSearched"),
    getDeals: no("getDeals"),
    getGems: no("getGems"),
    getSavedSearches: no("getSavedSearches"),
    /* Explicit rejects — never wire these */
    connectWithPassword: rejectScrape("connectWithPassword"),
    captureSession: rejectScrape("captureSession"),
    scrapeSalesHistory: rejectScrape("scrapeSalesHistory")
  });
})();
