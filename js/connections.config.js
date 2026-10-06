/* CardHound connections and feature gating: ONE config file.
 * Product model (Oct 6 2026 lock): BYO Card Ladder + BYO AI.
 * Users hook their Card Ladder for sold comps and their AI for deal calls,
 * charts, and open-market hunts. CardHound makes finding and comping cards
 * massively more efficient once both are plugged in.
 * NEVER collect passwords, cookies or session tokens.
 *
 * status: "available"  -> Not connected / Connected (demo)
 *         "coming"     -> Coming soon
 *         "partner"    -> Pending partnership
 *         "na"         -> Not available yet
 *         "importonly" -> Import only (opens Import my collection)
 *         "feed"       -> Optional server feed (not the front-door comps path)
 */
window.CH_SOURCES = [
  { id: "import", name: "Import my collection", mono: "IN", method: "import", status: "available",
    how: "CSV, screenshot or cert numbers", blurb: "Bring your cards in. CardHound keeps the card details plus your cost and purchase date, then prices them with comps from your Card Ladder." },
  { id: "ebay", name: "eBay", mono: "eB", method: "oauth", status: "available",
    how: "Official eBay sign-in (OAuth)", blurb: "Your watchlist, saved searches, live listings vs comps, deal alerts and end-of-auction reminders." },
  { id: "psa", name: "PSA", mono: "PSA", method: "apikey", status: "available", keyLabel: "PSA Public API access token",
    keyHelp: "Generate it yourself while signed in at psacard.com/publicapi, then paste only the token.",
    how: "Your own PSA API token", blurb: "Cert lookup, population and gem rate for your slabs." },
  { id: "cardladder", name: "Card Ladder", mono: "CL", method: "user", status: "available",
    how: "Sold comps only · BYO hook", blurb: "Hook your Card Ladder for sold comps: paste/import sold history you export, or Companion (coming soon). Not for finding cards to buy. No password, no scrape. Hook setup does not unlock live prices — SAMPLE until real sale-by-sale rows appear." },
  { id: "companion", name: "CardHound Companion", mono: "CC", method: "extension", status: "coming",
    how: "Browser extension", blurb: "Coming soon. When you are signed in to Card Ladder in your own browser, Companion recognizes the card on the page and opens a CardHound side panel: deal call, Gem Hunt hits, Auction Watch, watchlist, portfolio. Connect Card Ladder in Settings for sold comps in Confirm." },
  { id: "pricecharting", name: "PriceCharting", mono: "PC", method: "none", status: "na", how: "Needs a commercial license", blurb: "Their API terms need a written commercial license, so user keys can't be used in CardHound." },
  { id: "cardhedge", name: "Card Hedge", mono: "HG", method: "none", status: "na", how: "Optional server feed", blurb: "Optional upstream feed — not the front-door comps path. Sold comps come from your Card Ladder." },
  { id: "tcgplayer", name: "TCGplayer", mono: "TCG", method: "none", status: "na", how: "API closed to new developers", blurb: "TCGplayer isn't granting new API access, and its keys can't be shared." },
  { id: "marketmovers", name: "Market Movers", mono: "MM", method: "import", status: "importonly", how: "Import only", blurb: "No connect method. Import a list of your cards; value columns are dropped." },
  { id: "130point", name: "130point", mono: "130", method: "none", status: "na", how: "No connect method", blurb: "130point has no connect method for CardHound." },
  { id: "collx", name: "CollX", mono: "CX", method: "import", status: "importonly", how: "Import only (CollX CSV export)", blurb: "Import your CollX CSV export. CardHound keeps card details and your cost; CollX values are dropped." },
  { id: "feed", name: "CardHound data", mono: "CH", method: "feed", status: "feed",
    how: "Optional server feed", blurb: "Optional licensed feed path — not the front-door story. Connect Card Ladder for sold comps. This static build may still show SAMPLE under the hood." }
];
window.CH_FEATURES = {
  comps:      { label: "sold comps from your Card Ladder", sources: ["cardladder"] },
  trend:      { label: "price history from your Card Ladder", sources: ["cardladder"] },
  movers:     { label: "daily movers from your Card Ladder", sources: ["cardladder"] },
  tcg:        { label: "Live TCG prices", sources: ["feed"] },
  pop:        { label: "live pop and gem rate", sources: ["psa"] },
  cert:       { label: "PSA cert lookup", sources: ["psa"] },
  watchlist:  { label: "your eBay watchlist", sources: ["ebay"] },
  listings:   { label: "live listings vs comps", sources: ["ebay"] },
  saved:      { label: "your saved searches", sources: ["ebay"] },
  alerts:     { label: "deal alerts", sources: ["ebay"] },
  sniper:     { label: "end-of-auction reminders", sources: ["ebay"] },
  bestoffer:  { label: "the Best Offer helper", sources: ["ebay"] },
  collection: { label: "your collection", sources: ["import"] },
  ledger:     { label: "auto-tracked eBay buys in your Portfolio", sources: ["ebay"] }
};
