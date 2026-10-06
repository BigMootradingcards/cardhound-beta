/* CardHound growth features, shared by every build (live, beta, sample web, native app). All OFF by default.
 *   upsell         FEATURE_UPSELL          friendly Pro upgrade screen (lookup 11 for free users) + soft "Grade it?" teasers
 *   referral       FEATURE_REFERRAL        give a month, get a month (accounts + TEST-MODE promo grants on the API server)
 *   ebay_place_max FEATURE_EBAY_PLACE_MAX  "Place my max on eBay": the user types a max, confirms it, eBay opens. One
 *                                          confirmation per bid. CardHound never bids, never suggests a max, never automates.
 * Flags come from the server / build only (window.CH_LIVE_CFG.features, CARDHOUND_FLAVOR.features, window.CH_FLAGS); a URL
 * can't turn them on. Approved by Maurice, Oct 4, 2026. See out/growth/FEATURE_FLAGS.md. */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function flags() {
    var out = { upsell: false, referral: false, ebay_place_max: false };
    [(window.CH_FLAGS || {}), ((window.CARDHOUND_FLAVOR || {}).features || {}), ((window.CH_LIVE_CFG || {}).features || {})].forEach(function (f) {
      Object.keys(out).forEach(function (k) { if (f[k] === true) out[k] = true; }); });
    return out;
  }
  function on(k) { return !!flags()[k]; }
  function money(v) { v = Number(v); if (!isFinite(v)) return "—"; return "$" + (v % 1 ? v.toFixed(2) : v.toLocaleString("en-US")); }

  /* ---------------- the friendly upgrade screen ---------------- */
  var PRICE = { monthly: 19.99, yearly: 199.99 };
  var SAVE = Math.round((PRICE.monthly * 12 - PRICE.yearly) * 100) / 100;            /* $39.89 a year */
  var WHY = {
    cap: ["You've used today's {n} free lookups", "They come back at midnight ET. Or go Pro and keep checking."],
    grade: ["Should you grade it?", "Pro tells you if grading this exact card is worth the fee."],
    call: ["Buy, sell, hold, or grade?", "The comps are yours. Pro gives you the call."],
    lock: ["{f} is part of Pro", "Try Pro free for 7 days. Cancel anytime."],
    "": ["Get more from every card", "Pro gives you the call, not just the comps."]
  };
  var PERKS = [["infinity", "No daily lookup limit"], ["check", "Buy / Sell / Hold / Grade call"], ["gem", "Grade-it check on every card"],
    ["bell", "Watchlist alerts + Auction Watch reminders"], ["chart", "Profit math, Movers and Hidden Gems"]];
  function upsellHTML(o) {
    o = o || {};
    var w = WHY[o.why] || WHY[""], I = o.I || function () { return ""; }, sel = o.sel || "yearly";
    var title = w[0].replace("{n}", o.freeDaily || 10).replace("{f}", o.feature || "That"), sub = w[1];
    var pr = o.prices || {};
    function plan(k) {
      var y = k === "yearly", p = pr[k] || money(PRICE[k]);
      return '<button type="button" class="up-plan' + (sel === k ? " on" : "") + '" data-up="' + k + '" role="radio" aria-checked="' + (sel === k) + '">' +
        (y ? '<span class="up-save">Save ' + money(SAVE) + '</span>' : "") + '<span class="up-r" aria-hidden="true"></span>' +
        '<span class="up-pn"><b>' + (y ? "Yearly" : "Monthly") + '</b><small>' + (y ? "$16.67/mo, billed yearly" : "Cancel anytime") + '</small></span>' +
        '<span class="up-pp"><b class="num">' + esc(p) + '</b><small>' + (y ? "per year" : "per month") + '</small></span></button>';
    }
    return '<section class="up" aria-labelledby="up-t">' +
      '<button type="button" class="up-x" data-up-close aria-label="Close">' + I("close") + '</button>' +
      '<div class="up-badge">' + I("gem") + '<span>CardHound Pro</span></div>' +
      '<h1 class="up-t" id="up-t">' + esc(title) + '</h1><p class="up-s">' + esc(sub) + '</p>' +
      '<ul class="up-perks">' + PERKS.map(function (p) { return '<li><span class="up-ck">' + I("check") + '</span>' + esc(p[1]) + '</li>'; }).join("") + '</ul>' +
      '<div class="up-plans" role="radiogroup" aria-label="Pick a plan">' + plan("yearly") + plan("monthly") + '</div>' +
      '<p class="up-nudge" id="up-nudge">' + nudge(sel) + '</p>' +
      '<button type="button" class="up-cta" data-up-buy>Start 7-day free trial</button>' +
      '<p class="up-terms" id="up-terms">' + esc(renewLine(pr)) + '</p>' +
      '<p class="up-trial" id="up-trial">' + trialLine(sel, pr) + '</p>' +
      '<div class="up-row"><button type="button" class="up-link" data-up-close>Not now</button><button type="button" class="up-link" data-up-restore>Restore purchases</button></div>' +
      (o.referral ? '<a class="up-ref" href="' + esc(o.inviteHref || "#/invite") + '">' + I("gift") + '<span><b>Give a month, get a month</b><small>Invite a friend. You both get a free month of Pro.</small></span>' + I("right") + '</a>' : "") +
      '<p class="up-fine">' + esc(o.fine || "Free for 7 days, then the plan you pick. Renews automatically until you cancel in your app store settings, at least 24 hours before the trial or period ends.") + '</p>' +
      (o.legal ? '<p class="up-legal"><a href="' + esc(o.legal.terms) + '">Terms</a> · <a href="' + esc(o.legal.privacy) + '">Privacy</a></p>' : "") +
      (o.note ? '<p class="up-note">' + esc(o.note) + '</p>' : "") + '</section>';
  }
  function nudge(k) { return k === "yearly" ? "Yearly saves you " + money(SAVE) + " a year vs monthly." : "Switch to yearly and save " + money(SAVE) + " a year."; }
  /* Apple-style price + renewal line, shown right under every subscribe button (pre-release legal check, Oct 6 2026).
   * The store's own price strings win when the store is connected. */
  function renewLine(pr) { pr = pr || {};
    return (pr.monthly || money(PRICE.monthly)) + "/month or " + (pr.yearly || money(PRICE.yearly)) + "/year after a 7-day free trial. " +
      "Auto-renews until canceled. Cancel anytime in Settings at least 24 hours before renewal."; }
  /* Settings > Manage subscription. iOS opens Apple's subscriptions page; Android opens Google Play's; the web shows a note. */
  var MANAGE = { ios: "https://apps.apple.com/account/subscriptions", android: "https://play.google.com/store/account/subscriptions" };
  function manageSubURL(platform) { return MANAGE[platform] || ""; }
  function manageSub(o) { o = o || {}; var url = manageSubURL(o.platform);
    if (url) { (o.open || function (u) { window.open(u, "_blank"); })(url); return url; }
    (o.toast || function (m) { window.alert(m); })("Subscriptions are bought in the CardHound app on iPhone or Android. Manage or cancel yours there: Settings > Manage subscription. Nothing to manage on the web yet.");
    return ""; }
  function trialLine(k, pr) { pr = pr || {}; return "Free for 7 days, then " + (pr[k] || money(PRICE[k])) + (k === "monthly" ? "/mo" : "/yr") + ". Cancel anytime before the trial ends and you won't be charged."; }
  /* wire the screen: o.onBuy(plan), o.onRestore(), o.onClose() */
  function upsellBind(root, o) {
    o = o || {}; var sel = o.sel || "yearly";
    root.querySelectorAll("[data-up]").forEach(function (b) { b.onclick = function () { sel = b.dataset.up;
      root.querySelectorAll("[data-up]").forEach(function (x) { var y = x === b; x.classList.toggle("on", y); x.setAttribute("aria-checked", y); });
      var n = root.querySelector("#up-nudge"), t = root.querySelector("#up-trial"); if (n) n.textContent = nudge(sel); if (t) t.textContent = trialLine(sel, o.prices); }; });
    root.querySelectorAll("[data-up-close]").forEach(function (b) { b.onclick = function () { (o.onClose || function () { history.back(); })(); }; });
    var buy = root.querySelector("[data-up-buy]"); if (buy) buy.onclick = function () { (o.onBuy || function () {})(sel, buy); };
    var rs = root.querySelector("[data-up-restore]"); if (rs) rs.onclick = function () { (o.onRestore || function () {})(rs); };
    return { plan: function () { return sel; } };
  }
  /* a soft "Grade it?" teaser for Pro-only spots (free users) */
  function teaser(o) {
    o = o || {}; var I = o.I || function () { return ""; };
    return '<a class="up-tease" href="' + esc(o.href || "#/pro") + '" data-pro="grade"><span class="up-ti">' + I("gem") + '</span><span class="up-tt"><b>' + esc(o.title || "Grade it?") + '</b><small>' +
      esc(o.sub || "Pro checks if grading this card is worth the fee.") + '</small></span><span class="up-tb">Try Pro free</span></a>';
  }

  /* ---------------- give a month, get a month ---------------- */
  function inviteHTML(d, o) {
    o = o || {}; var I = o.I || function () { return ""; };
    if (!d) return '<section class="rf"><div class="rf-load">Loading your invite…</div></section>';
    var got = (d.free_months || []).length;
    return '<section class="rf" aria-labelledby="rf-t"><div class="up-badge">' + I("gift") + '<span>Invite friends</span></div>' +
      '<h1 class="up-t" id="rf-t">Give a month, get a month</h1><p class="up-s">When a friend you invite starts CardHound Pro, you both get a free month.</p>' +
      '<div class="rf-code"><small>Your invite code</small><b class="num" id="rf-code">' + esc(d.code) + '</b>' +
      '<div class="rf-btns"><button type="button" class="up-cta rf-share" data-rf-share>' + I("share") + 'Share invite</button><button type="button" class="up-link" data-rf-copy>Copy link</button></div></div>' +
      '<div class="rf-stats"><div><b class="num">' + (d.joined || 0) + '</b><small>joined</small></div><div><b class="num">' + (d.waiting || 0) + '</b><small>waiting on Pro</small></div><div><b class="num">' + (d.months_earned || 0) + '</b><small>months earned</small></div></div>' +
      (got ? '<p class="rf-got">' + I("check") + 'You have ' + got + ' free month' + (got > 1 ? "s" : "") + ' of Pro on your account.</p>' : "") +
      (d.can_enter_code ? '<form class="rf-enter" data-rf-form><label for="rf-in">Got a friend\'s code?</label><div class="rf-row"><input id="rf-in" class="input" maxlength="12" autocomplete="off" autocapitalize="characters" placeholder="8-letter code"><button class="up-link rf-apply" type="submit">Apply</button></div><p class="rf-msg" id="rf-msg" role="status"></p></form>' :
        d.referred_by_someone ? '<p class="rf-note">' + I("check") + (d.my_referral_status === "rewarded" ? "Your friend's code worked: your free month is on." : "Friend's code applied. Your free month starts when your Pro trial turns paid.") + '</p>' : "") +
      '<ul class="rf-rules">' + (d.rules || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") + '</ul>' +
      (d.mode === "test" ? '<p class="up-note">Test mode: free months are test grants. No store or payment is touched.</p>' : "") + '</section>';
  }
  function inviteBind(root, d, o) {
    o = o || {}; var toast = o.toast || function () {};
    var sh = root.querySelector("[data-rf-share]"), cp = root.querySelector("[data-rf-copy]"), f = root.querySelector("[data-rf-form]");
    function copy() { var t = d.link; return (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("Invite link copied."); }, function () { toast(t); }); }
    if (sh) sh.onclick = function () { if (navigator.share) navigator.share({ title: "CardHound", text: d.share_text, url: d.link }).catch(function () {}); else copy(); };
    if (cp) cp.onclick = copy;
    if (f) f.onsubmit = function (e) { e.preventDefault(); var v = root.querySelector("#rf-in").value, m = root.querySelector("#rf-msg");
      if (!v.trim()) { m.textContent = "Type the code your friend sent you."; return; }
      m.textContent = "Checking…"; (o.onClaim || function () { return Promise.reject(new Error("Not available")); })(v).then(function (r) { m.textContent = r.message || "Code applied."; m.className = "rf-msg ok"; if (o.onDone) setTimeout(o.onDone, 900); },
        function (er) { m.textContent = (er && er.message) || "That code didn't work."; m.className = "rf-msg bad"; }); };
  }

  /* ---------------- Place my max on eBay ---------------- */
  /* o: { U (openSheet/closeSheet/toast), I, card, grade, url (the eBay auction page: the EPN affiliate link when we have one, else the
   *      eBay search for live auctions of this exact card), itemTitle, currentBid, endsAt, onSave(max) (optional reminder) }
   * Step 1: type your max (blank: CardHound never suggests one). Step 2: confirm it. Then eBay opens and you place the bid there. */
  function placeMax(o) {
    o = o || {}; var U = o.U || {}, I = o.I || function () { return ""; }, toast = U.toast || function () {};
    var open = U.openSheet, close = U.closeSheet || function () {};
    if (!open) return;
    var item = o.itemTitle ? esc(o.itemTitle) : esc(o.card || "this card") + (o.grade ? " · " + esc(o.grade === "RAW" ? "Raw" : o.grade) : "");
    function step1(v) {
      open('<div class="pm"><div class="eyebrow">Place my max on eBay</div><h2>' + item + '</h2>' +
        (o.currentBid != null ? '<p class="small muted pm-cur">Current bid on eBay: <b class="num">' + money(o.currentBid) + '</b></p>' : "") +
        '<label class="pm-l" for="pm-in">Your max bid</label><div class="pm-inw"><span>$</span><input id="pm-in" class="pm-in" type="number" inputmode="decimal" min="1" max="100000" step="0.01" placeholder="Type your max" value="' + (v ? esc(v) : "") + '"></div>' +
        '<p class="pm-err" id="pm-err" role="alert"></p>' +
        '<p class="small muted">eBay bids for you up to your max, and only as much as it takes to win. You confirm the bid on eBay. CardHound never bids for you.</p>' +
        '<div class="cta-stack"><button class="btn btn-gold" id="pm-next" type="button">Review my max</button><button class="btn btn-ghost" id="pm-cancel" type="button">Cancel</button></div></div>', function () {
        var inp = document.getElementById("pm-in"); setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
        document.getElementById("pm-cancel").onclick = close;
        document.getElementById("pm-next").onclick = function () {
          var x = Math.round(parseFloat(inp.value) * 100) / 100, er = document.getElementById("pm-err");
          if (!(x > 0)) { er.textContent = "Type your max bid first."; return; }
          if (x > 100000) { er.textContent = "That's over $100,000. Check the number."; return; }
          if (o.currentBid != null && x <= Number(o.currentBid)) { er.textContent = "That's not above the current bid (" + money(o.currentBid) + "), so eBay won't take it."; return; }
          step2(x);
        };
      });
    }
    function step2(x) {
      open('<div class="pm"><div class="eyebrow">Confirm your max</div><h2 class="pm-big num">' + money(x) + '</h2><p class="pm-for">max bid on ' + item + '</p>' +
        '<ol class="pm-steps"><li>' + (o.isSearch ? "eBay opens live auctions for this exact card. Pick yours." : "eBay opens this auction.") + '</li><li>Tap <b>Place bid</b> and enter <b class="num">' + money(x) + '</b> (we copy it for you).</li><li>eBay asks you to confirm. That\'s your bid.</li></ol>' +
        (o.onSave ? '<label class="pm-rem"><input type="checkbox" id="pm-rem"> Save a reminder for this max</label>' : "") +
        '<div class="cta-stack"><button class="btn btn-gold" id="pm-go" type="button">' + I("ext") + 'Yes, open eBay</button><button class="btn btn-ghost" id="pm-edit" type="button">Change my max</button></div>' +
        '<p class="small dim">One confirmation per bid. CardHound doesn\'t place, schedule or change bids.</p></div>', function () {
        document.getElementById("pm-edit").onclick = function () { step1(x); };
        document.getElementById("pm-go").onclick = function () {
          var w = window.open(o.url, "_blank", "noopener,noreferrer");
          try { if (navigator.clipboard) navigator.clipboard.writeText(String(x)).catch(function () {}); } catch (e) {}
          var rem = document.getElementById("pm-rem"); if (rem && rem.checked && o.onSave) o.onSave(x);
          close(); toast(w === null && !/^https:/.test(o.url) ? "Couldn't open eBay." : "eBay is open. Enter " + money(x) + " and confirm there.");
          if (o.onOpened) o.onOpened(x);
        };
      });
    }
    step1(o.max > 0 ? o.max : "");   /* only a number the user typed themselves; never a computed one */
  }

  window.CHGrowth = { flags: flags, on: on, upsellHTML: upsellHTML, upsellBind: upsellBind, teaser: teaser, inviteHTML: inviteHTML, inviteBind: inviteBind,
    placeMax: placeMax, prices: PRICE, yearlySave: SAVE, esc: esc, renewLine: renewLine, manageSubURL: manageSubURL, manageSub: manageSub };
})();
