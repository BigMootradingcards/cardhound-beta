/* CardHound knowledge pack: hobby operating knowledge injected into the prompts sent with the user's own AI key.
   Tiered to keep tokens lean: CORE always; deeper sections only for the matching task/goal.
   Data only — never user-visible, no brand names of AI providers, nothing about any specific person.
   Security fences and output schemas stay in the calling prompt builders (hunt.js, plans.js, insights.js, app.js). */
(function (root) {
  "use strict";
  var S = {};
  S.core = "CARD RULES (always): " +
    "1) Exact card only: year, set, card #, player, parallel/variant, serial (/xx), auto/relic, and grader+grade (or Raw) must all match. Topps, Topps Chrome, Finest, Update and Bowman Chrome are different sets; base is not a refractor or parallel; PSA 9 is not PSA 10; PSA is not BGS/SGC/CGC; raw is not slabbed. " +
    "2) If any of these is unclear, the card is UNPRICED: say what is missing, never borrow a nearby card's price. " +
    "3) Never invent a price, sale, URL, pop count, gem rate or grade. Label any estimate as an estimate. Never promise a grade. " +
    "4) Sold comps (what cards actually sold for) come from the user's Card Ladder data; asking/BIN prices and active auctions are NOT comps. Card Ladder is for sold comps, not for finding cards to buy; eBay and other marketplaces are where cards are for sale. " +
    "5) A raw sale whose title or photo shows a slab is not a raw comp: drop it. One-off outliers (far from the rest) do not go in averages; call them 'Excluded: one-off'. " +
    "6) Don't say 'no raw sales' unless you checked both a player search and a set + card # search. " +
    "7) Every card you mention comes with its listing link. Plain words, short.";
  S.vocab = "HOBBY TERMS: RC = rookie card; 'true rookie' = the first-year base RC (not pre-rookie or later-year RC logo). SP/SSP = short print/super short print. Numbered /99, /25, 1/1 = serial print run. Auto, patch, relic, RPA (rookie patch auto). " +
    "Parallels/inserts: Refractor, X-Fractor, Atomic, Prizm colors (Silver, Gold /10, Black 1/1, Green, Blue, Red, Mojo, Shimmer, Wave), Cracked Ice (Green Cracked Ice = Green Ice), Optic Holo, Select tiers (Concourse/Premier/Courtside), late-90s/2000s inserts like Precious Metal Gems (PMG), Credentials, Star Rubies, Gold Medallion, Chrome Refractors. " +
    "Grading: PSA 1-10, BGS 1-10 with four subgrades (centering, corners, edges, surface; Black Label = all 10s; Pristine 10), SGC, CGC; 'gem' = 10 (BGS 9.5 Gem Mint). " +
    "Pokémon: holo, reverse holo, non-holo; 1st Edition, Unlimited, Shadowless (Base Set); Japanese vs English are different cards; promo, full art, alt art, SIR/SAR (special illustration rare), secret rare; PSA/CGC/BGS slabs. " +
    "Mislabels = hidden gems: sellers misspell names (Wembanyama/Wemby, Doncic/Dončić), say 'refractor' for base or the reverse, omit the card #, or lump a parallel as base. Check the photo and back, not just the title.";
  S.search = "TURNING ASKS INTO SEARCHES: Read a vague goal ('cheap rookies to flip', 'cards worth grading') and build 2-4 concrete searches yourself: likely players/kinds from the user's context, a sensible set/year, parallel words, and price cap. " +
    "Search tools: OR-groups with exclusions, e.g. 2025 finest refractor (player1,player2) -psa -bgs -sgc -cgc for raw-only multi-player sweeps; add -lot -reprint -custom -digital to cut junk; try common misspellings. " +
    "Include active auctions as well as Buy It Now: for an auction give the listing link, current bid as price, and end time. Prefer listings with clear front/back photos.";
  S.grade = "GRADING TOOLS (use when the goal is grading or the user asks): " +
    "Double-it check: (raw price + grading fee) x 2 should be at or under a recent PSA 10 sold comp, and a PSA 9 sold comp should still cover raw + fee (the downside). If comps are missing, say the check can't be done. " +
    "Gem rate (share of submissions that grade 10) matters, but CardHound has no gem-rate data: never state a gem rate; suggest the user check a population report. " +
    "Inspection flags from photos: centering (PSA 10 allows about 55/45 front, 75/25 back), corners, edges, surface; Chrome/refractor cards often show surface lines, paper cards corner/edge wear; new Topps football/basketball often has soft bottom corners. Say 'may' or 'could', never promise. " +
    "Crack-and-resub: a BGS 9.5 (subgrades 9.5+, maybe a 9 on centering) or SGC 10 can sometimes cross to a PSA 10; flag it only when a PSA 10 comp is far above the slab price, as a possibility.";
  S.deal = "DEAL TOOLS: A buy is good when the all-in price (price + shipping) is well under the exact card's recent sold comp; a common target is about 65% of comp after fees and shipping. Selling fees on eBay are roughly 13.25% plus shipping. " +
    "Fair max bid = what still leaves the user's margin after fees, from real comps only; if no comp, say no max can be set. " +
    "Season timing: rookie prices often rise into the season debut and dip mid-season (NBA often around December); baseball demand fades in fall; grading turnaround can be months, so grading into a playoff run is a strategy, not a promise. " +
    "Exits: liquid players sell fastest; illiquid cards may need patience.";
  S.scam = "SCAM FLAGS: price far below comps plus 'accepts any offer', stock photos, no back photo, new or zero-feedback seller, off-platform payment (ask for buyer-protected payment), slab photos that don't match the cert, 'reprint/RP/custom' in small print. Mention a flag in why, plainly.";
  S.calls = "BUY/HOLD/SELL/GRADE CALLS: Make a call only with an exact-card comp AND a price (listing price or the user's cost); otherwise say what's missing. Give one plain reason (e.g. 'asking 30% under the last three PSA 9 sales'). Label it 'Not advice'.";
  S.brief = "BRIEF FOCUS: Prefer hobby news that moves prices: new releases and checklists, grading company price/turnaround changes, injuries and trades of collected players, rookie debuts, playoff races, Pokémon set releases. Facts with sources only.";

  var TASKS = {
    hunt: ["core", "vocab", "search", "scam"],
    help: ["core", "search"],
    params: ["search"],
    plan: ["core", "vocab", "search"],
    ask: ["core", "vocab", "calls", "deal"],
    brief: ["brief"]
  };
  var GOAL = { flip: ["deal"], grade: ["grade", "deal"], hold: [], other: [] };
  function pack(task, opts) {
    opts = opts || {};
    var keys = (TASKS[task] || ["core"]).slice();
    if (task === "hunt" || task === "plan" || task === "ask") (GOAL[opts.intent] || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    if (task === "ask" && /grad|psa|bgs|sgc|cgc|crack|gem/i.test(String(opts.text || ""))) if (keys.indexOf("grade") < 0) keys.push("grade");
    if (task === "params") return "Query tips: card words only; OR-groups like (player1,player2) work; raw-only means exclude psa bgs sgc cgc; skip lot, reprint, custom.";
    return keys.map(function (k) { return S[k]; }).join("\n");
  }
  var api = { pack: pack, SECTIONS: S, TASKS: TASKS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CH_KNOW = api;
})(typeof window !== "undefined" ? window : globalThis);
