# CardHound connect plan (data path)

Status: plan only. The shared beta runs on **SampleAdapter** with the Sample data badge, whether or not anything is "connected". Every connection in the demo is simulated and stored only in the browser's localStorage.
Decision source: BigM00's research in `../DATA-FEED-OPTIONS.md` (Oct 4, 2026). That file is research, not legal advice; a lawyer reviews before the paid launch.

## Ground rules
- Never collect passwords, cookies or session tokens. Never scrape. Never log in on a user's behalf.
- Card Ladder has no official API, OAuth or partner program. Its Terms allow personal, non-commercial use only and ban gathering Content with "any ... manual or automatic device". So CardHound does **not** read, sync or redistribute Card Ladder prices.
- Bring-your-own connections only where the vendor offers an official method for third-party apps: **eBay (OAuth)** and **PSA (user-generated API token)**.

## 1. Import my collection (replaces "Connect Card Ladder") — UI built, import logic stubbed
Inputs: a CSV, a screenshot of the user's own collection page, or PSA/BGS/SGC/CGC cert numbers.
- **Keep:** card identity (player/subject, year, set, number, variant/parallel, category, grade, cert, quantity) plus the user's own **cost** and **purchase date**.
- **Drop:** every value column, including Card Ladder "Estimated Value"/CL value and Ladder ID, CollX value, and any market/FMV/price column. The demo's CSV preview shows the kept and dropped columns (`classifyCols` in `js/app.js`).
- Cards are then priced with **CardHound's own data** (licensed feed or self-collected), never with the imported values.
- Screenshots: read on the device for identity only; images are not kept. (Demo: preview only, reading is "coming soon".)
- Cert numbers: PSA certs resolve through the user's own PSA token; BGS/SGC/CGC are coming soon.
- Adapter: `js/data/file-import-adapter.js` (stub).

## 2. eBay (official OAuth) — UI built, simulated
- Authorization-code grant on eBay's own sign-in page. Planned scopes: read-only for watchlist, saved searches and listings; `buy.offer.auction` only if the Buy Offer API is approved.
- Unlocks: watchlist, saved searches, live listings vs comps, deal alerts, Best Offer helper, Sniper reminders.
- **Sniper v1 (no approval needed):** the user sets their max, confirms the exact amount, then taps **Set my max on eBay** (deep link to the listing; the user bids on eBay with eBay's own proxy bidding). CardHound adds an end-of-auction reminder with a countdown.
- **Auto last-second bid: coming soon, pending eBay approval.** Route: the user's own eBay OAuth plus Buy Offer API `placeProxyBid`, which is Limited Release and needs eBay business-unit approval. Ask eBay in writing whether timed calls are allowed. The legacy Trading API `PlaceOffer` explicitly prohibits sniping and is closed to new applicants. Never password-based bidding; never an AI agent placing bids.

## 3. PSA (user-pasted token) — UI built, simulated
- The user generates a token while signed in at psacard.com/publicapi and pastes only the token. Demo: stored only on this device (localStorage), never sent.
- Unlocks: cert lookup, pop and gem rate. Production: call PSA from a CardHound server and don't keep tokens in the browser long-term.

## 4. CardHound Companion (browser extension) — tile only, "Coming soon"
- Works when the user is signed in to Card Ladder **in their own browser**. It recognizes which card is on the page and opens a CardHound side panel with our call, Gem Hunt hits, Sniper, add to watchlist and add to portfolio.
- It reads the card **identity** only, shows **CardHound's own** data, and **never sends Card Ladder prices or values to CardHound**. Click-to-run, no background crawling, no auto-navigation, nothing stored from the page. Build it site-agnostic (eBay, PSA and other pages too).
- Technical shape: Manifest V3, a content script that reads identity fields from the open page, and a side panel (`chrome.sidePanel`) that calls CardHound. Messaging via `chrome.runtime` only, with no page data persisted.
- ⚠️ **LEGAL REVIEW REQUIRED BEFORE LAUNCH.** Even identity-only reading is a gray zone under Card Ladder's "manual or automatic device ... gather Content" clause. Ship only with Card Ladder's written consent or a lawyer's sign-off.

## 5. Card Ladder (official) — tile only, "Pending partnership"
Only via a written agreement with Card Ladder/Collectors. Until then, use Import my collection. Stub: `js/data/cardladder-user-adapter.js`.

## 6. Licensed feed — adapter stubbed
`js/data/licensed-feed-adapter.js` maps the app's adapter methods to Card Hedge-style endpoints (card-search, image-match, comps, prices-by-card, top-movers, cert). Commercial use needs an Enterprise or commercial license (see DATA-FEED-OPTIONS §4). Keys stay on a CardHound server, never in this static site. Switch adapters with one line in `js/config.js`.

## Not built (by design)
Reading Card Ladder Sales History tables, syncing Card Ladder values, server-side logins, cookie or session reuse, and any automated bidding without eBay approval.
