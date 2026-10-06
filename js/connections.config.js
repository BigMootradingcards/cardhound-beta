/* CardHound connections and feature gating: ONE config file.
 * Decision (BigM00, DATA-FEED-OPTIONS.md, Oct 4 2026): bring-your-own only for eBay (official OAuth) and PSA
 * (user-generated API token). Everything else is import-only, not available yet, or pending a partnership.
 * NEVER collect passwords, cookies or session tokens. No scraping.
 *
 * status: "available"  -> Not connected / Connected (demo)
 *         "coming"     -> Coming soon
 *         "partner"    -> Pending partnership
 *         "na"         -> Not available yet
 *         "importonly" -> Import only (opens Import my collection)
 *         "feed"       -> CardHound's own licensed data (internal, coming soon)
 */
window.CH_SOURCES = [
  { id: "import", name: "Import my collection", mono: "IN", method: "import", status: "available",
    how: "CSV, screenshot or cert numbers", blurb: "Bring your cards in. CardHound keeps the card details plus your cost and purchase date, then prices them with its own data." },
  { id: "ebay", name: "eBay", mono: "eB", method: "oauth", status: "available",
    how: "Official eBay sign-in (OAuth)", blurb: "Your watchlist, saved searches, live listings vs comps, deal alerts and end-of-auction reminders." },
  { id: "psa", name: "PSA", mono: "PSA", method: "apikey", status: "available", keyLabel: "PSA Public API access token",
    keyHelp: "Generate it yourself while signed in at psacard.com/publicapi, then paste only the token.",
    how: "Your own PSA API token", blurb: "Cert lookup, population and gem rate for your slabs." },
  { id: "companion", name: "CardHound Companion", mono: "CC", method: "extension", status: "coming",
    how: "Browser extension", blurb: "When you're signed in to Card Ladder in your own browser, Companion recognizes the card on the page and opens a CardHound side panel: our call, Gem Hunt hits, Auction Watch, add to watchlist, add to portfolio. Comps stay on your Card Ladder subscription." },
  { id: "cardladder", name: "Card Ladder", mono: "CL", method: "user", status: "available",
    how: "Sold comps only", blurb: "Raw sold prices when you need comps. Not for finding cards to buy. Your AI reads these for the deal call and the chart, and hunts the open market on its own. This preview keeps SAMPLE prices either way." },
  { id: "pricecharting", name: "PriceCharting", mono: "PC", method: "none", status: "na", how: "Needs a commercial license", blurb: "Their API terms need a written commercial license, so user keys can't be used in CardHound." },
  { id: "cardhedge", name: "Card Hedge", mono: "HG", method: "none", status: "na", how: "Needs an Enterprise plan", blurb: "Commercial use needs Card Hedge's Enterprise plan. Planned as CardHound's own licensed feed instead." },
  { id: "tcgplayer", name: "TCGplayer", mono: "TCG", method: "none", status: "na", how: "API closed to new developers", blurb: "TCGplayer isn't granting new API access, and its keys can't be shared." },
  { id: "marketmovers", name: "Market Movers", mono: "MM", method: "import", status: "importonly", how: "Import only", blurb: "No connect method. Import a list of your cards; value columns are dropped." },
  { id: "130point", name: "130point", mono: "130", method: "none", status: "na", how: "No public API", blurb: "130point has no public API or connect method." },
  { id: "collx", name: "CollX", mono: "CX", method: "import", status: "importonly", how: "Import only (CollX CSV export)", blurb: "Import your CollX CSV export. CardHound keeps card details and your cost; CollX values are dropped." },
  { id: "feed", name: "CardHound data", mono: "CH", method: "feed", status: "feed", hidden: true, how: "Licensed feed", blurb: "CardHound's own licensed comps (coming soon)." }
];
window.CH_FEATURES = {
  comps:      { label: "sold comps from your Card Ladder subscription", sources: ["cardladder"] },
  trend:      { label: "price history from your Card Ladder subscription", sources: ["cardladder"] },
  movers:     { label: "Live daily movers", sources: ["feed"] },
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
