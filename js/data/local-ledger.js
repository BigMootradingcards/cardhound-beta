/* Local Ledger store: the user's buys live ON THIS PHONE ONLY (localStorage key "ch_ledger"). Nothing is uploaded.
 * Adapters mix this in, so every adapter exposes the same ledger methods:
 *   getLedger()               -> rows [{ id, card, grade, from, seller, price, shipping, tax, cost, date, order, status, value, soldFor, soldVia, sample, auto }]
 *   addLedgerRow(row | rows)  -> saved row(s). Callers must show a confirm step before calling (manual, CSV, receipt).
 *   updateLedgerRow(id, patch)-> saved row (status changes: bought | graded | listed | sold)
 *   getPortfolio()            -> { costBasis, value, unrealized, realized, ... , series, costSeries, holdings, fees }
 *   resetLedger()             -> back to the sample rows
 * First run seeds the SAMPLE rows from data/sample.js (flagged sample: true). A live adapter would value holdings with
 * CardHound's own licensed data; the sample adapter uses invented sample values.
 */
(function () {
  var KEY = "ch_ledger", STATUSES = ["bought", "graded", "listed", "sold"];
  var S = function () { return window.CARDHOUND_SAMPLE || {}; };
  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };
  var r2 = function (n) { return Math.round((+n || 0) * 100) / 100; };
  /* Oct 7 beta: no sample rows. Portfolio = the user's own cards and real costs only. Old sample seeds are purged once. */
  function seed() { return []; }
  function load() {
    try {
      var v = localStorage.getItem(KEY);
      if (v) { var rows = JSON.parse(v), real = rows.filter(function (r) { return !r.sample; }); if (real.length !== rows.length) save(real); return real; }
    } catch (e) {}
    return [];
  }
  /* Value = most recent setguard-matched sale from the user's own pasted Card Ladder history, same grade. Else null ("needs comps"). */
  function gradeKey(g) { var m = String(g || "").match(/\b(PSA|BGS|SGC|CGC|TAG)\s*(\d+(?:\.5)?)/i); return m ? m[1].toUpperCase() + " " + m[2] : "RAW"; }
  function ladderValue(row) {
    var LH = window.CH_LADDER_HOOK; if (!LH || !LH.matchLiveSales || !LH.structureIdentity) return null;
    var hook = {}; try { hook = JSON.parse(localStorage.getItem("ch_ladderHook") || "{}") || {}; } catch (e) {}
    var pending = Array.isArray(hook.pendingRows) ? hook.pendingRows : [];
    if (!pending.length) return null;
    var id = LH.structureIdentity(row.card, {});
    if (!id.set || !id.number) return null;
    var want = gradeKey(row.grade), sales = LH.matchLiveSales(pending, id).filter(function (x) { return gradeKey(x.grade) === want; });
    return sales.length ? { price: r2(sales[0].price), date: sales[0].date || "", n: sales.length } : null;
  }
  function save(rows) { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch (e) {} }
  function norm(r) {
    var x = {
      id: r.id || ("L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      card: String(r.card || "").trim(), grade: String(r.grade || "").trim(), from: String(r.from || "Other").trim(),
      seller: String(r.seller || "").trim(), price: r2(r.price), shipping: r2(r.shipping), tax: r2(r.tax),
      date: r.date || new Date().toISOString().slice(0, 10), order: String(r.order || "").trim(),
      status: STATUSES.indexOf(String(r.status || "").toLowerCase()) > -1 ? String(r.status).toLowerCase() : "bought",
      value: r.value != null && r.value !== "" ? r2(r.value) : null, soldFor: r.soldFor != null && r.soldFor !== "" ? r2(r.soldFor) : null,
      soldVia: r.soldVia || null, sample: !!r.sample, auto: !!r.auto, category: r.category || ""
    };
    x.cost = r2(x.price + x.shipping + x.tax);
    return x;
  }
  function withCost(rows) { return rows.map(function (r) { var x = clone(r); x.cost = r2((+x.price || 0) + (+x.shipping || 0) + (+x.tax || 0)); return x; }); }
  function netAfterFees(gross, via, F) { return via && !/ebay/i.test(via) ? gross : gross * (1 - F.ebayPct) - F.ebayFixed - F.shipToBuyer; }
  window.CH_LOCAL_LEDGER = {
    statuses: STATUSES,
    getLedger: function () { return Promise.resolve(withCost(load()).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; })); },
    addLedgerRow: function (row) {
      var many = Array.isArray(row), list = (many ? row : [row]).map(norm).filter(function (r) { return r.card && r.price >= 0; });
      var rows = load(); rows = list.concat(rows); save(rows);
      return Promise.resolve(many ? list : list[0]);
    },
    updateLedgerRow: function (id, patch) {
      var rows = load(), hit = null;
      rows.forEach(function (r) { if (r.id === id) { Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); hit = r; } });
      save(rows); return Promise.resolve(hit && withCost([hit])[0]);
    },
    resetLedger: function () { var s = seed(); save(s); return Promise.resolve(withCost(s)); },
    getPortfolio: function () {
      var F = S().portfolioFees || { ebayPct: 0.1325, ebayFixed: 0.4, shipToBuyer: 5, label: "" };
      if (!F.label) F.label = "13.25% eBay fee + $0.40 + $5 shipping";
      var rows = withCost(load()), held = rows.filter(function (r) { return r.status !== "sold"; }), sold = rows.filter(function (r) { return r.status === "sold"; });
      var holdings = held.map(function (r) {
        var lv = ladderValue(r), net = lv ? netAfterFees(lv.price, "eBay", F) : null;
        return { id: r.id, card: r.card, grade: r.grade, status: r.status, cost: r.cost, value: lv ? lv.price : null, valued: !!lv, lastSale: lv, net: net == null ? null : r2(net), gain: net == null ? null : r2(net - r.cost) };
      });
      var valued = holdings.filter(function (h) { return h.valued; });
      var costBasis = r2(holdings.reduce(function (s, h) { return s + h.cost; }, 0));
      var valuedCost = r2(valued.reduce(function (s, h) { return s + h.cost; }, 0));
      var value = r2(valued.reduce(function (s, h) { return s + h.value; }, 0));
      var netValue = valued.reduce(function (s, h) { return s + h.net; }, 0);
      var realized = r2(sold.reduce(function (s, r) { return s + netAfterFees(+r.soldFor || 0, r.soldVia || "eBay", F) - r.cost; }, 0));
      return Promise.resolve({
        sample: false, count: holdings.length, soldCount: sold.length, costBasis: costBasis, valuedCost: valuedCost, value: value, valuedCount: valued.length,
        unrealized: r2(netValue - valuedCost), unrealizedPct: valuedCost ? (netValue - valuedCost) / valuedCost * 100 : 0,
        realized: realized, holdings: holdings.sort(function (a, b) { return (b.value || 0) - (a.value || 0); }), unvalued: holdings.length - valued.length, fees: F
      });
    }
  };
})();
