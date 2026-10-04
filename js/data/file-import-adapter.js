/* STUB: FileImportAdapter ("Import my collection"; not active).
 * Accepts a CSV, a screenshot (read on-device), or PSA/BGS/SGC/CGC cert numbers.
 * KEEP only card identity (player/subject, year, set, number, variant, category, grade, cert, quantity) plus the
 * user's own cost and purchase date. DROP every value column (Card Ladder "Estimated Value"/CL value, Ladder ID,
 * CollX value, market/FMV/price columns). Cards are then priced with CardHound's own data.
 * Data stays on the device (localStorage/IndexedDB) in the demo. No passwords, no cookies, no scraping.
 * The UI-side column classifier lives in js/app.js (classifyCols).
 */
(function () {
  var todo = function (m) { return function () { return Promise.reject(new Error("FileImportAdapter." + m + " not built yet")); }; };
  CH_ADAPTERS.register("file-import", {
    name: "Imported collection (planned)", isSample: false,
    importCSV: todo("importCSV"), importScreenshot: todo("importScreenshot"), importCerts: todo("importCerts"), getCollection: todo("getCollection"),
    meta: todo("meta"), getCardReport: todo("getCardReport"), getCandidates: todo("getCandidates"), identifyCard: todo("identifyCard"),
    getMovers: todo("getMovers"), getPicks: todo("getPicks"), getMostSearched: todo("getMostSearched"),
    getDeals: todo("getDeals"), getGems: todo("getGems"), getHuntListings: todo("getHuntListings"), getSavedSearches: todo("getSavedSearches"),
    getLedger: CH_LOCAL_LEDGER.getLedger, addLedgerRow: CH_LOCAL_LEDGER.addLedgerRow, updateLedgerRow: CH_LOCAL_LEDGER.updateLedgerRow,
    resetLedger: CH_LOCAL_LEDGER.resetLedger, getPortfolio: CH_LOCAL_LEDGER.getPortfolio,
    getNewHighs: todo("getNewHighs"), getNewHighRejects: todo("getNewHighRejects"),
    getAlertSettings: CH_LOCAL_ALERTS.getAlertSettings, setAlertSettings: CH_LOCAL_ALERTS.setAlertSettings,
    getGemHunts: CH_LOCAL_HUNTS.getGemHunts, saveGemHunt: CH_LOCAL_HUNTS.saveGemHunt, deleteGemHunt: CH_LOCAL_HUNTS.deleteGemHunt,
    getVoiceWatch: CH_LOCAL_HUNTS.getVoiceWatch, addVoiceWatch: CH_LOCAL_HUNTS.addVoiceWatch, removeVoiceWatch: CH_LOCAL_HUNTS.removeVoiceWatch
  });
})();
