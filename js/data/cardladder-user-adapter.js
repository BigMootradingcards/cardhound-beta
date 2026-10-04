/* STUB: CardLadderUserAdapter (NOT PLANNED without Card Ladder's written consent).
 * Decision (DATA-FEED-OPTIONS.md, Oct 4 2026): Card Ladder has no official API or OAuth, and its Terms ban
 * gathering Content with any "manual or automatic device". CardHound will NOT read or sync Card Ladder prices.
 * This adapter stays empty unless an official partnership ("Connect Card Ladder (official)", Pending partnership)
 * provides a sanctioned API. Never collect passwords, cookies or session tokens.
 */
(function () {
  var no = function (m) { return function () { return Promise.reject(new Error("CardLadderUserAdapter." + m + ": pending an official partnership")); }; };
  CH_ADAPTERS.register("cardladder-user", {
    name: "Card Ladder official (pending partnership)", isSample: false,
    meta: no("meta"), getCardReport: no("getCardReport"), getCandidates: no("getCandidates"), identifyCard: no("identifyCard"),
    getMovers: no("getMovers"), getPicks: no("getPicks"), getMostSearched: no("getMostSearched"),
    getDeals: no("getDeals"), getGems: no("getGems"), getSavedSearches: no("getSavedSearches")
  });
})();
