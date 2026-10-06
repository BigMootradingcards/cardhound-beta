/* CardHound Ledger + Portfolio (UI demo). Rows are stored on this phone only, through the adapter:
 * D.getLedger(), D.addLedgerRow(), D.updateLedgerRow(), D.getPortfolio(). Every save goes through a confirm step.
 * Columns match the BigmooTradingCards Card Flip Ledger: card / from / cost / status + seller, price, shipping, tax, date, order link. */
window.CH_LEDGER = function (U) {
  "use strict";
  var view = U.view, D = U.D, I = U.I, esc = U.esc, money = U.money;
  var ST = ["bought", "graded", "listed", "sold"], STL = { bought: "Bought", graded: "Graded", listed: "Listed", sold: "Sold" };
  var FROM = ["eBay · Buy It Now", "eBay · Auction", "eBay · Best Offer", "eBay · Auction Watch win", "eBay · Gem Hunt", "Whatnot", "Card show", "Local shop", "Facebook Marketplace", "COMC", "Other"];
  var ui = { filter: "all", open: null, sub: "ledger" };
  var m2 = function (v) { return money(v, true); };
  var num = function (v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };
  var today = function () { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  function fmtDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); if (!m) return esc(s || ""); return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1] + " " + (+m[3]) + ", " + m[1]; }
  function stChip(st) { return '<span class="lst lst-' + st + '">' + STL[st] + '</span>'; }
  function showFrom(f) { return String(f || "").replace(/Sniper/gi, "Auction Watch"); }
  function fromCell(f) { var p = showFrom(f).split(" · "); return '<b>' + esc(p[0]) + '</b>' + (p[1] ? '<span>' + esc(p[1]) + '</span>' : ""); }
  function orderCell(o, sample) {
    if (/^https:\/\//i.test(o || "")) return '<a class="link-btn" href="' + esc(o) + '" target="_blank" rel="noopener noreferrer">Open order ' + I("ext") + '</a>';
    if (!o) return '<span class="dim">None</span>';
    return esc(o) + (sample ? ' <span class="dim">(sample, no link)</span>' : "");
  }
  function rerender() { var y = window.scrollY; screen({ sub: ui.sub }); setTimeout(function () { window.scrollTo(0, y); }, 0); }

  /* ---------- screen ---------- */
  function screen(p) {
    ui.sub = p && p.sub === "portfolio" ? "portfolio" : "ledger";
    var head = '<div class="eyebrow">Portfolio · on this phone</div><h1 class="h1" style="font-size:30px">Your <em>portfolio</em></h1>' +
      '<div class="subtabs scroll-tabs">' + [["ledger", "Buys"], ["portfolio", "Value"]].map(function (t) { return '<button type="button" data-lsub="' + t[0] + '" class="' + (ui.sub === t[0] ? "on" : "") + '">' + t[1] + '</button>'; }).join("") + '</div>';
    (ui.sub === "portfolio" ? D.getPortfolio().then(function (pf) { return portfolioHTML(pf); }) : D.getLedger().then(function (rows) { return ledgerHTML(rows); })).then(function (body) {
      view.innerHTML = head + body + U.footer();
      view.querySelectorAll("[data-lsub]").forEach(function (b) { b.onclick = function () { location.hash = b.dataset.lsub === "portfolio" ? "#/ledger/portfolio" : "#/ledger"; }; });
      bind();
    });
  }
  function ebayPrompt() {
    if (U.isConnected("ebay")) return '<div class="card gold ebay-hero on"><div class="seal on">' + I("check") + '</div><div class="t"><b>eBay connected (demo)</b><span>New eBay buys would log here on their own. This shared demo still shows sample rows.</span></div></div>';
    return '<div class="card gold ebay-hero"><div class="row" style="gap:12px;align-items:flex-start"><span class="srcmono">eB</span><div class="t"><b>Connect eBay to auto-track buys</b><span>Official eBay sign-in. CardHound never sees your eBay password. Each purchase lands here with seller, price, shipping, tax and the order link.</span></div></div>' +
      '<button class="btn btn-gold btn-sm" data-connect="ebay" style="width:100%;margin-top:12px">' + I("plug") + 'Connect eBay</button></div>';
  }
  function autoNote() { return '<div class="note" style="margin-top:10px">' + I("spark") + '<div><b style="color:var(--text)">Logs automatically:</b> Auction Watch wins, Buy and Gem Hunt purchases. Add anything else below.</div></div>'; }
  function ledgerHTML(rows) {
    var cnt = { all: rows.length }; ST.forEach(function (s) { cnt[s] = rows.filter(function (r) { return r.status === s; }).length; });
    var spent = rows.reduce(function (s, r) { return s + r.cost; }, 0), soldSum = rows.filter(function (r) { return r.status === "sold"; }).reduce(function (s, r) { return s + (+r.soldFor || 0); }, 0);
    var list = ui.filter === "all" ? rows : rows.filter(function (r) { return r.status === ui.filter; });
    var table = '<div class="lt"><div class="lt-head"><span>Card</span><span>From</span><span class="r">Cost</span><span class="r">Status</span></div>' +
      (list.length ? list.map(rowHTML).join("") : '<div class="empty">No ' + (ui.filter === "all" ? "" : STL[ui.filter].toLowerCase() + " ") + 'rows yet.</div>') + '</div>';
    return ebayPrompt() + autoNote() +
      '<div class="lacts"><button data-ladd="manual">' + I("plus") + '<span>Manual add</span></button><button data-ladd="csv">' + I("file") + '<span>CSV import</span></button><button data-ladd="receipt">' + I("receipt") + '<span>Receipt photo</span></button></div>' +
      '<div class="kpis" style="margin-top:14px"><div class="kpi"><span>Rows</span><b class="num">' + rows.length + '</b><small>' + rows.filter(function (r) { return r.sample; }).length + ' sample</small></div><div class="kpi"><span>Spent</span><b class="num">' + money(spent) + '</b><small>price + ship + tax</small></div><div class="kpi"><span>Sold</span><b class="num" style="color:var(--gold2)">' + money(soldSum) + '</b><small>' + cnt.sold + ' cards</small></div></div>' +
      '<div class="scopes" id="lfilt">' + ["all"].concat(ST).map(function (s) { return '<button data-f="' + s + '" class="' + (ui.filter === s ? "on" : "") + '">' + (s === "all" ? "All" : STL[s]) + ' · ' + cnt[s] + '</button>'; }).join("") + '</div>' +
      '<div style="height:10px"></div>' + table +
      '<div class="row between" style="margin-top:14px"><button class="btn btn-ghost btn-sm" id="lexport">' + I("download") + 'Export CSV</button><button class="link-btn" id="lreset">Reset sample rows</button></div>' +
      '<div class="note" style="margin-top:12px">' + I("shield") + '<div>Stored on this phone only. Nothing is uploaded. Rows marked <b style="color:var(--gold2)">Sample</b> are invented demo rows.</div></div>';
  }
  function rowHTML(r) {
    var open = ui.open === r.id;
    var tag = r.auto ? '<span class="chip demo gold">AUTO</span>' : r.sample ? '<span class="chip demo">SAMPLE</span>' : '<span class="chip demo ok">YOURS</span>';
    var det = !open ? "" : '<div class="lt-det"><dl class="kv small">' +
      '<dt>Seller</dt><dd>' + (esc(r.seller) || '<span class="dim">None</span>') + '</dd><dt>Price</dt><dd class="num">' + m2(r.price) + '</dd><dt>Shipping</dt><dd class="num">' + m2(r.shipping) + '</dd><dt>Tax</dt><dd class="num">' + m2(r.tax) + '</dd>' +
      '<dt>Cost</dt><dd class="num" style="color:var(--gold2)">' + m2(r.cost) + '</dd><dt>Date</dt><dd>' + fmtDate(r.date) + '</dd><dt>Order link</dt><dd>' + orderCell(r.order, r.sample) + '</dd>' +
      (r.status === "sold" ? '<dt>Sold for</dt><dd class="num">' + m2(r.soldFor) + (r.soldVia ? ' <span class="dim">· ' + esc(r.soldVia) + '</span>' : "") + '</dd>' : (r.value ? '<dt>Value<span class="tag-est">SAMPLE</span></dt><dd class="num">' + m2(r.value) + '</dd>' : "")) +
      '</dl><div class="h3" style="margin:14px 0 8px">Status</div><div class="seg seg-sm lt-st" data-id="' + r.id + '" style="max-width:none">' + ST.map(function (s) { return '<button data-s="' + s + '" class="' + (r.status === s ? "on" : "") + '">' + STL[s] + '</button>'; }).join("") + '</div></div>';
    return '<div class="lt-item' + (open ? " open" : "") + '"><button class="lt-row" data-open="' + r.id + '" aria-expanded="' + open + '"><span class="c"><b>' + esc(r.card) + '</b><span>' + (r.grade ? esc(r.grade) + " · " : "") + fmtDate(r.date) + ' ' + tag + '</span></span><span class="f">' + fromCell(r.from) + '</span><span class="r num">' + money(r.cost) + '</span><span class="r">' + stChip(r.status) + '</span></button>' + det + '</div>';
  }
  function pfChart(vals, cost) {
    var W = 350, H = 170, pt = 14, pb = 22, all = vals.concat(cost);
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all), pad = (mx - mn) * .15 || 10; mn -= pad; mx += pad;
    var X = function (i) { return 6 + i * (W - 12) / (vals.length - 1); }, Y = function (v) { return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); };
    var path = function (a) { return a.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p).toFixed(1); }).join(" "); };
    var d = path(vals), area = d + " L" + X(vals.length - 1).toFixed(1) + " " + (H - pb) + " L6 " + (H - pb) + " Z", lx = X(vals.length - 1), ly = Y(vals[vals.length - 1]);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sample portfolio value over 26 weeks vs cost basis"><defs><linearGradient id="pfa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3bd6a" stop-opacity=".34"/><stop offset="1" stop-color="#e3bd6a" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="pfl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a87a24"/><stop offset=".6" stop-color="#e7c172"/><stop offset="1" stop-color="#fbecc0"/></linearGradient></defs>' +
      [0.25, 0.5, 0.75].map(function (g) { var y = pt + g * (H - pt - pb); return '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.06)" stroke-dasharray="3 5"/>'; }).join("") +
      '<path d="' + area + '" fill="url(#pfa)"/><path d="' + path(cost) + '" fill="none" stroke="#a29d92" stroke-width="1.4" stroke-dasharray="5 5"/><path d="' + d + '" fill="none" stroke="url(#pfl)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lx + '" cy="' + ly + '" r="9" fill="#e3bd6a" fill-opacity=".18"/><circle cx="' + lx + '" cy="' + ly + '" r="4" fill="#fbecc0"/>' +
      '<text x="0" y="' + (H - 6) + '" fill="#6f6b63" font-size="10.5" font-family="Manrope,sans-serif">26 wks ago</text><text x="' + W + '" y="' + (H - 6) + '" fill="#6f6b63" font-size="10.5" text-anchor="end" font-family="Manrope,sans-serif">Now</text></svg>';
  }
  function signed(v) { return '<em class="sg ' + (v >= 0 ? "pill-up" : "pill-down") + '">' + (v >= 0 ? "+" : "") + money(v) + '</em>'; }
  function portfolioHTML(pf) {
    if (!pf.count && !pf.soldCount) return '<div class="card" style="text-align:center;padding:26px 18px"><b>No cards yet</b><p class="muted small">Add buys in Portfolio and they show up here.</p><a class="btn btn-gold btn-sm" href="#/ledger">Open Portfolio</a></div>';
    return '<div class="card gold pf-hero"><div class="row between"><span class="h3" style="color:var(--gold2)">Current value</span><span class="chip demo">SAMPLE</span></div>' +
      '<div class="callword num" style="font-size:44px;margin:6px 0 2px">' + money(pf.value) + '</div>' +
      '<p class="micro-note">SAMPLE · Not advice.</p>' +
      '<div class="small" style="font-weight:700">' + signed(pf.unrealized) + ' <span class="' + (pf.unrealized >= 0 ? "pill-up" : "pill-down") + '">(' + (pf.unrealizedPct >= 0 ? "+" : "\u2212") + Math.abs(pf.unrealizedPct).toFixed(1) + '%)</span> <span class="muted" style="font-weight:600">after fees, if sold today</span></div>' +
      '<div class="chart-wrap" style="margin-top:12px">' + pfChart(pf.series, pf.costSeries) + '</div>' +
      '<div class="row" style="gap:16px;margin-top:4px"><span class="small muted row" style="gap:6px"><i class="lg lg-v"></i>Value (sample)</span><span class="small muted row" style="gap:6px"><i class="lg lg-c"></i>Cost basis</span></div></div>' +
      '<div class="pf-grid"><div class="kpi"><span>Cost basis</span><b class="num">' + money(pf.costBasis) + '</b><small>' + pf.count + ' cards held</small></div><div class="kpi"><span>Current value</span><b class="num">' + money(pf.value) + '</b><small>sample values</small></div>' +
      '<div class="kpi"><span>Gain / loss after fees</span><b class="num">' + signed(pf.unrealized) + '</b><small>unrealized</small></div><div class="kpi"><span>Realized</span><b class="num">' + signed(pf.realized) + '</b><small>' + pf.soldCount + ' sold, after fees</small></div></div>' +
      '<p class="small dim" style="margin:10px 2px 0">After fees = ' + esc(pf.fees.label) + '. Card show and other non-eBay sales count no fees.' + (pf.unvalued ? " " + pf.unvalued + " card" + (pf.unvalued === 1 ? " has" : "s have") + " no sample value yet and count at cost." : "") + '</p>' +
      U.gate("comps") +
      '<div class="sec"><div class="sec-head"><h3 class="h3">Holdings</h3><a class="link-btn" href="#/ledger">Buys ' + I("right") + '</a></div><div class="card">' +
      pf.holdings.map(function (h) { return '<div class="lrow" style="grid-template-columns:1fr auto"><div class="nm"><b>' + esc(h.card) + '</b><span>' + (h.grade ? esc(h.grade) + " · " : "") + STL[h.status] + ' · cost ' + money(h.cost) + (h.valued ? "" : " · at cost") + '</span></div><div class="rt" style="text-align:right;display:block"><b class="num" style="display:block;font-size:14.5px">' + money(h.value) + '</b><span class="small num" style="font-weight:700">' + signed(h.gain) + '</span></div></div>'; }).join("") +
      '</div></div>';
  }

  /* ---------- bindings ---------- */
  function bind() {
    view.querySelectorAll("#lfilt [data-f]").forEach(function (b) { b.onclick = function () { ui.filter = b.dataset.f; rerender(); }; });
    view.querySelectorAll("[data-open]").forEach(function (b) { b.onclick = function () { ui.open = ui.open === b.dataset.open ? null : b.dataset.open; rerender(); }; });
    view.querySelectorAll(".lt-st button").forEach(function (b) {
      b.onclick = function () {
        var id = b.parentNode.dataset.id, s = b.dataset.s;
        if (s === "sold") { D.getLedger().then(function (rows) { soldSheet(rows.filter(function (r) { return r.id === id; })[0]); }); return; }
        D.updateLedgerRow(id, { status: s }).then(function () { U.toast("Status: " + STL[s] + ". Saved on this phone."); rerender(); });
      };
    });
    view.querySelectorAll("[data-ladd]").forEach(function (b) { b.onclick = function () { ({ manual: function () { formSheet({}, {}); }, csv: csvSheet, receipt: receiptSheet })[b.dataset.ladd](); }; });
    var ex = document.getElementById("lexport"); if (ex) ex.onclick = exportCSV;
    var rs = document.getElementById("lreset"); if (rs) rs.onclick = function () {
      U.openSheet('<div class="eyebrow">Reset · confirm</div><h2>Reset to the sample rows?</h2><p class="muted small">This removes rows you added on this phone and restores the sample rows.</p><div class="cta-stack"><button class="btn btn-gold" id="rsok">Reset portfolio sample</button><button class="btn btn-ghost" id="rsno">Keep my rows</button></div>', function () {
        document.getElementById("rsno").onclick = U.closeSheet;
        document.getElementById("rsok").onclick = function () { D.resetLedger().then(function () { U.closeSheet(); ui.open = null; U.toast("Portfolio reset to sample rows."); rerender(); }); };
      });
    };
  }

  /* ---------- add: form -> review -> save ---------- */
  function inp(id, label, v, extra) { return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input' + (extra && extra.num ? " num" : "") + '" id="' + id + '" value="' + esc(v == null ? "" : v) + '"' + (extra && extra.num ? ' inputmode="decimal"' : "") + (extra && extra.type ? ' type="' + extra.type + '"' : "") + (extra && extra.ph ? ' placeholder="' + esc(extra.ph) + '"' : "") + '></div>'; }
  function formSheet(r, opts) {
    r = r || {}; opts = opts || {};
    var from = r.from || "eBay · Buy It Now", st = r.status || "bought";
    U.openSheet('<div class="eyebrow">' + esc(opts.eyebrow || "Portfolio · manual add") + '</div><h2>' + esc(opts.title || "Add a buy") + '</h2>' +
      (opts.note ? '<div class="note" style="margin-top:8px">' + I("spark") + '<div>' + opts.note + '</div></div>' : '<p class="muted small" style="margin:0">Saved on this phone only, after you review it.</p>') +
      (opts.photo ? '<img src="' + opts.photo + '" alt="Your receipt photo" style="width:72px;height:72px;object-fit:cover;border-radius:12px;border:1px solid var(--gold-line);margin-top:12px">' : "") +
      inp("lf-card", "Card", r.card, { ph: "Year, set, #, player, variant" }) +
      '<div class="grid2">' + inp("lf-grade", "Grade", r.grade, { ph: "Raw, PSA 9" }) + '<div class="field"><label for="lf-from">From</label><select class="input" id="lf-from">' + FROM.map(function (f) { return '<option' + (f === from ? " selected" : "") + '>' + esc(f) + '</option>'; }).join("") + '</select></div></div>' +
      inp("lf-seller", "Seller", r.seller, { ph: "Seller or shop" }) +
      '<div class="grid3">' + inp("lf-price", "Price", r.price != null ? r.price : "", { num: 1, ph: "0.00" }) + inp("lf-ship", "Shipping", r.shipping != null ? r.shipping : "", { num: 1, ph: "0.00" }) + inp("lf-tax", "Tax", r.tax != null ? r.tax : "", { num: 1, ph: "0.00" }) + '</div>' +
      '<div class="grid2">' + inp("lf-date", "Date", r.date || today(), { type: "date" }) + '<div class="field"><label>Cost</label><div class="input num" id="lf-cost" style="display:flex;align-items:center;color:var(--gold2);font-weight:800">$0.00</div></div></div>' +
      inp("lf-order", "Order link", r.order, { ph: "https://… or order #" }) +
      '<div class="field"><label>Status</label><div class="seg seg-sm" id="lf-st" style="max-width:none">' + ST.map(function (s) { return '<button type="button" data-s="' + s + '" class="' + (s === st ? "on" : "") + '">' + STL[s] + '</button>'; }).join("") + '</div></div>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="lf-rev">Review before saving</button></div>', function () {
        var cost = function () { document.getElementById("lf-cost").textContent = m2(num(val("lf-price")) + num(val("lf-ship")) + num(val("lf-tax"))); };
        ["lf-price", "lf-ship", "lf-tax"].forEach(function (i) { document.getElementById(i).oninput = cost; }); cost();
        document.querySelectorAll("#lf-st button").forEach(function (b) { b.onclick = function () { st = b.dataset.s; document.querySelectorAll("#lf-st button").forEach(function (o) { o.classList.toggle("on", o === b); }); }; });
        document.getElementById("lf-rev").onclick = function () {
          var row = { card: val("lf-card").trim(), grade: val("lf-grade").trim(), from: val("lf-from"), seller: val("lf-seller").trim(), price: num(val("lf-price")), shipping: num(val("lf-ship")), tax: num(val("lf-tax")), date: val("lf-date"), order: val("lf-order").trim(), status: st };
          if (!row.card) { U.toast("Add the card first."); return; }
          if (!(row.price > 0)) { U.toast("Add the price you paid."); return; }
          reviewSheet([row], function () { formSheet(row, opts); }, opts.source || "manual");
        };
      });
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ""; }
  function reviewSheet(rows, back, source) {
    var total = rows.reduce(function (s, r) { return s + num(r.price) + num(r.shipping) + num(r.tax); }, 0), one = rows.length === 1, r = rows[0];
    var body = one ? '<div class="card" style="margin-top:12px"><b style="font-size:15px">' + esc(r.card) + '</b><div class="small muted" style="margin-top:2px">' + (r.grade ? esc(r.grade) + " · " : "") + esc(r.from) + ' · ' + STL[r.status] + '</div>' +
        '<dl class="kv small" style="margin-top:12px"><dt>Seller</dt><dd>' + (esc(r.seller) || '<span class="dim">None</span>') + '</dd><dt>Price</dt><dd class="num">' + m2(r.price) + '</dd><dt>Shipping</dt><dd class="num">' + m2(r.shipping) + '</dd><dt>Tax</dt><dd class="num">' + m2(r.tax) + '</dd><dt>Date</dt><dd>' + fmtDate(r.date) + '</dd><dt>Order link</dt><dd style="word-break:break-all">' + (esc(r.order) || '<span class="dim">None</span>') + '</dd></dl></div>'
      : '<div class="card" style="margin-top:12px">' + rows.slice(0, 6).map(function (x) { return '<div class="lrow" style="grid-template-columns:1fr auto"><div class="nm"><b>' + esc(x.card) + '</b><span>' + esc(x.from) + ' · ' + STL[x.status] + ' · ' + fmtDate(x.date) + '</span></div><span class="num" style="font-weight:700">' + m2(num(x.price) + num(x.shipping) + num(x.tax)) + '</span></div>'; }).join("") + (rows.length > 6 ? '<div class="small dim" style="padding-top:10px">+ ' + (rows.length - 6) + ' more</div>' : "") + '</div>';
    U.openSheet('<div class="eyebrow">Confirm · before saving</div><h2>' + (one ? "Save this buy?" : "Save " + rows.length + " rows?") + '</h2><p class="muted small" style="margin:0">Check every field. Saved on this phone only.</p>' + body +
      '<div class="card gold" style="margin-top:12px;text-align:center"><div class="small muted">' + (one ? "Cost (price + shipping + tax)" : "Total cost") + '</div><div class="callword num" style="font-size:40px;margin:4px 0 0">' + m2(total) + '</div></div>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="lv-save">' + I("check") + (one ? "Save to portfolio" : "Save " + rows.length + " rows") + '</button><button class="btn btn-ghost" id="lv-back">' + I("left") + 'Edit</button></div>', function () {
        document.getElementById("lv-back").onclick = back;
        document.getElementById("lv-save").onclick = function () {
          D.addLedgerRow(one ? rows[0] : rows).then(function () {
            U.closeSheet(); ui.filter = "all"; ui.open = null;
            U.toast(one ? "Saved to your Portfolio (on this phone)." : rows.length + " rows saved to your Portfolio (on this phone).");
            if (U.parseHash().route === "ledger" && ui.sub === "ledger") rerender(); else location.hash = "#/ledger";
          });
        };
      });
  }

  /* ---------- CSV import ---------- */
  var SAMPLE_CSV = "Item title,Seller,Item price,Shipping,Sales tax,Order date,Order number,Platform,Status\n" +
    "2023 Bowman Chrome Prospects Jackson Holliday Auto,sample-seller-f,74.00,4.99,5.53,2026-09-27,SAMPLE-CSV-2001,eBay,bought\n" +
    "2022 Panini Prizm #353 Brock Purdy RC,sample-seller-g,21.50,3.50,1.75,2026-09-25,SAMPLE-CSV-2002,eBay,listed\n" +
    "\"2023 Scarlet & Violet 151 Mew ex #205\",Sample booth 3,58.00,0,0,2026-09-20,,Card show,bought\n";
  function parseCSV(text) {
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  var MAP = [["date", /(date|when|purchased on)/i], ["order", /(order|link|url|transaction)/i], ["seller", /(seller|shop|store|vendor)/i], ["shipping", /(ship|postage|delivery)/i], ["tax", /tax/i], ["status", /status|stage/i],
    ["from", /(from|source|platform|marketplace|where|channel|bought on)/i], ["grade", /(grade|grader|condition)/i], ["price", /(price|paid|amount|cost|total)/i], ["card", /(card|item|title|description|name|player)/i]];
  function mapHeader(h) {
    var used = {};
    return h.map(function (c) { var name = String(c).trim(); for (var i = 0; i < MAP.length; i++) if (MAP[i][1].test(name) && !used[MAP[i][0]]) { used[MAP[i][0]] = 1; return MAP[i][0]; } return null; });
  }
  function normDate(s) { s = String(s || "").trim(); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); var d = new Date(s); return isNaN(d) ? today() : d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function normStatus(s) { s = String(s || "").toLowerCase(); return /sold/.test(s) ? "sold" : /list/.test(s) ? "listed" : /grad|psa|bgs|sgc|cgc/.test(s) ? "graded" : "bought"; }
  function normFrom(s) { s = String(s || "").trim(); if (!s) return "Other"; if (/ebay/i.test(s)) return /ebay ·/i.test(s) ? s : "eBay · Buy It Now"; return s; }
  function csvToRows(text) {
    var t = parseCSV(text); if (t.length < 2) return { rows: [], skipped: 0, map: [] };
    var hdr = t[0], map = mapHeader(hdr), out = [], skipped = 0;
    t.slice(1).forEach(function (line) {
      var r = {}; map.forEach(function (k, i) { if (k) r[k] = line[i]; });
      var row = { card: String(r.card || "").trim(), grade: String(r.grade || "").trim(), from: normFrom(r.from), seller: String(r.seller || "").trim(), price: num(r.price), shipping: num(r.shipping), tax: num(r.tax), date: normDate(r.date), order: String(r.order || "").trim(), status: normStatus(r.status) };
      if (row.card && row.price > 0) out.push(row); else skipped++;
    });
    return { rows: out, skipped: skipped, map: hdr.map(function (h, i) { return { col: String(h).trim() || "(blank)", to: map[i] }; }) };
  }
  function csvSheet(prefill) {
    U.openSheet('<div class="eyebrow">Portfolio · CSV import</div><h2>Import buys from a CSV</h2><p class="muted small" style="margin:0">eBay purchase history, a flip spreadsheet, or any sheet with card and price columns. Read on this phone; nothing is uploaded.</p>' +
      '<input class="file-input" id="lc-file" type="file" accept=".csv,text/csv"><label class="btn btn-ghost" for="lc-file" style="margin-top:14px">' + I("upload") + 'Choose a CSV file</label>' +
      '<div class="field"><label for="lc-text">Or paste CSV</label><textarea class="input" id="lc-text" rows="5" style="height:auto;padding:12px 14px;line-height:1.4;font-size:12.5px;resize:vertical" placeholder="Item title,Seller,Item price,Shipping,Sales tax,Order date,…">' + esc(prefill || "") + '</textarea></div>' +
      '<button class="link-btn" id="lc-sample" style="margin-top:10px">' + I("spark") + 'Use a sample CSV</button>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="lc-go">Preview import</button></div>', function () {
        var ta = document.getElementById("lc-text"), f = document.getElementById("lc-file");
        f.onchange = function () { var file = f.files && f.files[0]; if (!file) return; var rd = new FileReader(); rd.onload = function () { ta.value = String(rd.result || ""); U.toast("Loaded " + file.name + ". Tap Preview import."); }; rd.readAsText(file); };
        document.getElementById("lc-sample").onclick = function () { ta.value = SAMPLE_CSV; };
        document.getElementById("lc-go").onclick = function () {
          var txt = ta.value; if (!txt.trim()) { U.toast("Choose or paste a CSV first."); return; }
          var res = csvToRows(txt);
          if (!res.rows.length) { U.toast("No rows with a card and a price were found."); return; }
          csvPreview(res, txt);
        };
      });
  }
  var FL = { card: "Card", from: "From", seller: "Seller", price: "Price", shipping: "Shipping", tax: "Tax", date: "Date", order: "Order link", status: "Status", grade: "Grade" };
  function csvPreview(res, txt) {
    U.openSheet('<div class="eyebrow">CSV import · preview</div><h2>' + res.rows.length + ' row' + (res.rows.length === 1 ? "" : "s") + ' ready</h2><p class="muted small" style="margin:0">' + (res.skipped ? res.skipped + " skipped (no card or price). " : "") + 'Columns matched like this:</p>' +
      '<div class="row wrap" style="gap:6px;margin-top:10px">' + res.map.map(function (m) { return '<span class="chip ' + (m.to ? "gold" : "") + '" style="height:24px;font-size:11px">' + esc(m.col) + ' ' + (m.to ? "\u2192 " + FL[m.to] : "\u00b7 ignored") + '</span>'; }).join("") + '</div>' +
      '<div class="cta-stack"><button class="btn btn-gold" id="lp-next">Review and confirm</button><button class="btn btn-ghost" id="lp-back">' + I("left") + 'Back</button></div>', function () {
        document.getElementById("lp-back").onclick = function () { csvSheet(txt); };
        document.getElementById("lp-next").onclick = function () { reviewSheet(res.rows, function () { csvPreview(res, txt); }, "csv"); };
      });
  }

  /* ---------- Receipt photo ---------- */
  function receiptSheet() {
    var photo = null;
    U.openSheet('<div class="eyebrow">Portfolio · receipt photo</div><h2>Snap a receipt or order page</h2><p class="muted small" style="margin:0">A screenshot of the eBay order page works too. The photo stays on this phone.</p>' +
      '<div class="rc-frame" id="rc-frame"><div class="scan-empty"><div class="ring">' + I("receipt") + '</div><b>Receipt or order screenshot</b>Card, seller, price, shipping, tax, date</div></div>' +
      '<input class="file-input" id="rc-file" type="file" accept="image/*" capture="environment">' +
      '<div class="cta-stack"><label class="btn btn-ghost" for="rc-file">' + I("camera") + 'Take or choose a photo</label><button class="btn btn-gold" id="rc-read">' + I("spark") + 'Read it (demo)</button></div>' +
      '<p class="small dim" style="margin-top:10px;text-align:center">This demo can\'t read receipts yet. It fills a sample read for you to check and edit, then you confirm.</p>', function () {
        var f = document.getElementById("rc-file");
        f.onchange = function () { var file = f.files && f.files[0]; if (!file) return; photo = URL.createObjectURL(file); document.getElementById("rc-frame").innerHTML = '<img src="' + photo + '" alt="Your receipt photo">'; };
        document.getElementById("rc-read").onclick = function () {
          formSheet({ card: "2023 Panini Prizm C.J. Stroud RC", grade: "Raw", from: "eBay · Buy It Now", seller: "sample-seller-h", price: 64, shipping: 4.5, tax: 4.8, date: today(), order: "SAMPLE-RECEIPT-3001", status: "bought" },
            { eyebrow: "Receipt photo · sample read", title: "Check the details", photo: photo, source: "receipt", note: '<b style="color:var(--gold2)">Sample read.</b> Not read from your photo. Check and edit every field before saving.' });
        };
      });
  }

  /* ---------- Mark sold ---------- */
  function soldSheet(r) {
    if (!r) return;
    U.openSheet('<div class="eyebrow">Portfolio · mark sold</div><h2>' + esc(r.card) + '</h2><p class="muted small" style="margin:0">Cost ' + m2(r.cost) + '</p>' +
      '<div class="grid2">' + inp("ls-for", "Sold for", r.soldFor || r.listPrice || "", { num: 1, ph: "0.00" }) + '<div class="field"><label for="ls-via">Sold on</label><select class="input" id="ls-via">' + ["eBay", "Whatnot", "Card show", "Facebook Marketplace", "Other"].map(function (x) { return "<option>" + x + "</option>"; }).join("") + '</select></div></div>' +
      inp("ls-date", "Sold date", today(), { type: "date" }) +
      '<div class="cta-stack"><button class="btn btn-gold" id="ls-rev">Review</button></div>', function () {
        document.getElementById("ls-rev").onclick = function () {
          var amt = num(val("ls-for")), via = val("ls-via"), dt = val("ls-date");
          if (!(amt > 0)) { U.toast("Enter the sale price."); return; }
          var fee = /ebay/i.test(via) ? amt * 0.1325 + 0.40 + 5 : 0, profit = amt - fee - r.cost;
          U.openSheet('<div class="eyebrow">Confirm · before saving</div><h2>Mark as sold?</h2><p class="muted small" style="margin:0">' + esc(r.card) + '</p>' +
            '<div class="card" style="margin-top:12px"><dl class="kv small"><dt>Sold for</dt><dd class="num">' + m2(amt) + '</dd><dt>Sold on</dt><dd>' + esc(via) + '</dd><dt>Fees + ship<span class="tag-est">ESTIMATE</span></dt><dd class="num">\u2212' + m2(fee) + '</dd><dt>Cost</dt><dd class="num">\u2212' + m2(r.cost) + '</dd><dt>Profit</dt><dd class="num ' + (profit >= 0 ? "pill-up" : "pill-down") + '">' + m2(profit) + '</dd></dl></div>' +
            '<div class="cta-stack"><button class="btn btn-gold" id="ls-ok">' + I("check") + 'Save as sold</button><button class="btn btn-ghost" id="ls-back">' + I("left") + 'Edit</button></div>', function () {
              document.getElementById("ls-back").onclick = function () { soldSheet(r); };
              document.getElementById("ls-ok").onclick = function () { D.updateLedgerRow(r.id, { status: "sold", soldFor: amt, soldVia: via, soldDate: dt }).then(function () { U.closeSheet(); U.toast("Marked sold. Saved on this phone."); rerender(); }); };
            });
        };
      });
  }

  /* ---------- Export ---------- */
  function exportCSV() {
    D.getLedger().then(function (rows) {
      var q = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var out = [["Card", "From", "Cost", "Status", "Seller", "Price", "Shipping", "Tax", "Date", "Order link", "Grade", "Sold for", "Sample row"]].concat(rows.map(function (r) {
        return [r.card, r.from, r.cost.toFixed(2), STL[r.status], r.seller, (+r.price).toFixed(2), (+r.shipping).toFixed(2), (+r.tax).toFixed(2), r.date, r.order, r.grade, r.soldFor != null ? (+r.soldFor).toFixed(2) : "", r.sample ? "yes" : "no"];
      })).map(function (r) { return r.map(q).join(","); }).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" })); a.download = "cardhound-portfolio.csv";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      U.toast("Exported " + rows.length + " rows to cardhound-portfolio.csv (on this phone).");
    });
  }
  screen.addPrefilled = function (r, opts) { formSheet(r || {}, opts || { eyebrow: "Portfolio · from voice", title: "Review this buy", note: "Filled from what you said. Check every field before saving." }); };
  return screen;
};
