# CardHound web demo (static beta)

Plain HTML, CSS and JS. No build step, no backend, no API keys. The only external request is Google Fonts (optional; system fonts take over if it's blocked).
**Every price, sales count, trend, pop figure and odds value is invented SAMPLE data** (`data/sample.js`). No Card Ladder, eBay or other source figures are included.

## Run locally
```
cd /workspace/products/cardhound-app/web && python3 -m http.server 8080
# open http://localhost:8080
```
Opening `index.html` directly from disk also works (classic scripts, hash routing).

## Deploy
**Netlify Drop:** 1) open https://app.netlify.com/drop  2) drag the `web/` folder onto the page  3) share the URL it gives you.
**GitHub Pages:** 1) push the contents of `web/` to a repo (index.html at the root)  2) Settings → Pages → Deploy from branch → `main` / root  3) share `https://<user>.github.io/<repo>/`.

## Layout
| Path | What |
|---|---|
| `index.html` | App shell, top bar with the Sample data badge, bottom tabs |
| `css/app.css` | Black-and-gold design system |
| `data/sample.js` | ALL sample data (swap here or write a new adapter) |
| `js/config.js` | One line picks the data adapter (`"sample"`) |
| `js/data/adapter.js` | Adapter interface + registry |
| `js/data/sample-adapter.js` | SampleAdapter (active) |
| `js/data/file-import-adapter.js` | Stub: Import my collection (CSV, screenshot, cert numbers) |
| `js/data/licensed-feed-adapter.js` | Stub: licensed feed, Card Hedge-style endpoints |
| `js/data/cardladder-user-adapter.js` | Stub: only if Card Ladder grants an official partnership |
| `js/data/local-ledger.js` | Ledger store on this phone only (localStorage `ch_ledger`): getLedger, addLedgerRow, updateLedgerRow, getPortfolio, resetLedger. Mixed into every adapter |
| `js/ledger.js` | Ledger and Portfolio screens and sheets (manual add, CSV import, receipt photo, mark sold, export CSV) |
| `img/` | Sample card art: generic chrome refractor slab render (`sample-card-studio.jpg`, `sample-card.webp`, `sample-card-sm.webp`). Source: `../art-source/` (SVG + HTML, rendered with headless Chrome) |
| `js/data/local-alerts.js` | New-high alert settings on this phone only: getAlertSettings / setAlertSettings |
| `js/boom.js` | BOOM! New High Comp alert, New Highs list, record-sale sheet, alert settings, Notification API demo |
| `js/connections.config.js` | Sources and the source-to-feature gating map |
| `js/icons.js`, `js/app.js` | Line icons; screens and logic |
| `CONNECT-PLAN.md`, `CONNECTIONS.md` | Data path plan and per-source table |
| `screenshots/` | Headless renders at 390×844 (@2x) |

Routes: `#/scan`, `#/analyze`, `#/match`, `#/report`, `#/markets/movers|highs|picks|searched`, `#/deals`, `#/deals/watch|gems|auction-watch`, `#/ledger`, `#/ledger/portfolio`, `#/connections`, `#/more`, `#/tool/fees|roi|variant|offer|alerts`.

**Bottom tabs (Oct 6, 2026):** Scan · Markets · Deals · More only. Report is reached from Scan (not a tab). Ledger lives under More. See `../UX-FLOW-CLEANUP.md`.

## Ledger and Portfolio (UI demo)
- Tab: **Ledger** (also listed under More). Columns match the Card Flip Ledger: card / from / cost / status, plus seller, price, shipping, tax, date and order link (tap a row). Statuses: bought, graded, listed, sold.
- Add a buy: **Manual add**, **CSV import** (real on-device parsing with column matching) or **Receipt photo** (demo: fills a labeled sample read). Every add goes through a confirm step before it saves.
- **Connect eBay to auto-track buys** (official eBay sign-in, simulated). Purchases (including auctions you won bidding yourself) import from eBay once connected. The Sniper is look-only: set your max, open the listing on eBay, get a reminder before it ends. CardHound never bids, never shows a fake "placed" or "won", and never adds a ledger row on its own.
- **Portfolio**: cost basis, current value (sample values), gain/loss after fees (eBay 13.25% + $0.40 + $5 ship, sample fee model), realized gains on sold rows, and a 26-week sample value chart vs cost basis.
- Everything is stored on the phone only (localStorage). Export CSV downloads the rows locally. "Reset sample rows" restores the seed rows.

## Sample card art
The "Try a sample card" image is a generic studio render of a CHROME BASE card (matches the Base Pujols sample report): clean chrome sheen, minimal rainbow, chrome edge, slab label "CHROME TRADED · BASE · No. T247", marked SAMPLE in an acrylic slab. (The earlier refractor version's generator is kept as `../art-source/build_refractor_v1.py`.) No real player, no brand logos, no seller photos. To re-render: `cd ../art-source && python3 build.py && node render.js slab && node render.js studio` (needs puppeteer-core + Chrome), then export to `img/` (see the PIL one-liner in the build notes).

## BOOM! New High Comp alerts (sample data)
- Fires when a card's newest sold price is its **all-time high** for that exact variant + grade (tier 1) or its **90-day high** (tier 2). Only sales that pass the exact-variant check and quality gate count (no outliers, no mis-variants); a "Not counted" list shows sample rejects.
- In-app broadcast-style BOOM graphic: gold wipe-in band, ray burst, shockwave rings, letter-by-letter BOOM!, count-up from old high to new high, % jump, date, tier badge, links to the card report and the record sale. Optional haptics (`navigator.vibrate`, only after a user tap). Auto-dismiss after 14s.
- Filming: **Preview BOOM alert** in More, in Markets → New Highs, in the New-high alert settings (Preview all-time / Preview 90-day) and in Tools → Price alerts. It also auto-fires once on the first Markets visit (flag `ch_boom_auto`; clear site data to see it again).
- **New Highs** tab in Markets (Overall / Category / Set, plus All / All-time / 90-day).
- Settings: alerts on/off, scope (Watchlist & Portfolio / Everything), tiers, haptics. Phone notifications are an opt-in Notification API demo (asks permission, labeled demo); in-app is the main path.
- Adapter: `getNewHighs(scope)`, `getNewHighRejects(scope)`, `getAlertSettings()`, `setAlertSettings(patch)`. Sample data: `newHighs` and `newHighRejects` in `data/sample.js`. The Pujols PSA 9 entry ($585, Sep 30, 90-day high) matches its sample report.

## Voice / prompt search (#/ask)
- Files: `js/voice-parse.js` (pure parser, router, hunt and profit math; also loads in node), `js/voice.js` (UI), `js/data/local-hunts.js` (saved Gem Hunts and voice watchlist adds, on this phone only), sample listings in `data/sample.js` (`huntListings`).
- Mic uses the browser's SpeechRecognition (needs HTTPS). If it's missing, the mic falls back to typing. Spoken replies are off by default (speaker toggle).
- Parsed fields: year / year_range, brand, set, subset_insert, player, card_number, parallel_color, serial_numbered, rookie, auto, patch, grade_company + grade or raw, condition_notes, budget_max, listing_type (auction | bin | any), end_window, seller_filters { min_feedback_pct, top_rated, us_only, returns }, category, keywords.
- Ambiguous words get a follow-up question instead of a guess: chrome, metal, refractor with no color, rookie with no year, a grade with no grader, and "ending soon".
- Cards only (lots, sealed product and reprints are hidden). Exact variant only. If fewer than 3 cards match, it widens listing filters only, and says which ones.
- Snipe / Buy / Offer always end on a confirm card: the exact amount, a checkbox, then "Confirm (simulated)". Nothing is bid, bought or sent.
- Tests: `node ../tests/voice/test_voice.js`

<!-- mass-user-smoke touch 2026-10-06 13:51:08 EDT (non-critical; preview only) -->

<!-- mass-user-smoke touch 2026-10-06 13:52:24 EDT (non-critical; preview only) -->
