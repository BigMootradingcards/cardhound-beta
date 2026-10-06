# Kind dropdown (Oct 6, 2026)

Maurice lock: **one native dropdown** of top ~20 kinds by cards sold / what’s selling — not a searchable kind wall. Disney, Marvel, Football, Pokémon, Star Wars, etc.

## Behavior
- Confirm override form: single native `<select id="o-kind">` of TOP_KINDS + empty **Any kind**. Selecting a kind still narrows the Set picker when category is known.
- Markets scope “Kind” tab: same simple `<select id="scope-kind">` (no search chips).
- Daily brief: same simple `<select id="daily-kind">` (Any kind = whole brief; one kind filters).
- Removed: `o-kind-q` search input, `kindpick` listbox wall, `bindKindPick`.

## TOP_KINDS (locked)
Disney, Marvel, Football, Basketball, Baseball, Hockey, Pokémon, Magic, Yu-Gi-Oh!, Lorcana, One Piece, Star Wars, Simpsons, WWE, Soccer, Golf, Racing, Garbage Pail Kids, Digimon, Flesh and Blood.

## Trees
- `cardhound-ux-preview/web/js/app.js` (+ existing `select.input` CSS)
- Synced → `cardhound-friends-beta-ship` (same files)
- Pages → https://bigmootradingcards.github.io/cardhound-beta/
