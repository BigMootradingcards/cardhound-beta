/* CardHound friends beta screens: Welcome + Add to Home Screen, "Was this right?" on every report, Free during beta,
 * About the beta, and the admin view (slot 0 only). Loaded after live.js, before js/app.js. */
(function () {
  "use strict";
  var B = window.CH_BETA;
  if (!B) return;
  var THUMB_UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10.5v9H4.5v-9zM7 10.5l4-6.5c1.4 0 2.3 1.1 2 2.5l-.7 3.2h5.4c1.2 0 2.1 1.1 1.8 2.3l-1.6 6.3c-.2.8-.9 1.2-1.7 1.2H7"/></svg>';
  var THUMB_DN = '<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:scaleY(-1)"><path d="M7 10.5v9H4.5v-9zM7 10.5l4-6.5c1.4 0 2.3 1.1 2 2.5l-.7 3.2h5.4c1.2 0 2.1 1.1 1.8 2.3l-1.6 6.3c-.2.8-.9 1.2-1.7 1.2H7"/></svg>';
  var SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M8.5 10.5H6v10h12v-10h-2.5"/></svg>';
  var ADDSQ = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/></svg>';

  (window.CH_APP_PLUGINS = window.CH_APP_PLUGINS || []).push(function (U) {
    var I = U.I, esc = U.esc, view = U.view, toast = U.toast;
    function last() { try { return (JSON.parse(sessionStorage.getItem("ch_live_last") || "null") || {}).cur || null; } catch (e) { return null; } }
    function standalone() { return window.navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches); }
    function hi() { var w = B.who(); return w && w.name ? w.name : null; }

    /* ---------- Welcome + How to add to Home Screen ---------- */
    function welcome() {
      var w = B.who(), signed = !!B.token();
      var h = '<section class="bt-wel"><div class="bt-logo"><span class="mono" aria-hidden="true">CH</span><span class="bt-name">CardHound</span><span class="bt-chip">Beta</span></div>';
      if (signed) h += '<h1 class="bt-h">You\'re in' + (w && w.name ? ', <em>' + esc(w.name) + '</em>' : "") + '.</h1><p class="bt-sub">Thanks for testing CardHound this week.</p>' +
        '<a class="btn btn-gold bt-go" href="#/scan">' + I("search") + 'Start checking comps</a>';
      else h += '<h1 class="bt-h">Welcome to the <em>beta</em>.</h1><p class="bt-sub">Enter the invite code Maurice sent you.</p>' +
        '<form class="bt-code card" id="bt-f" autocomplete="off"><label for="bt-in">Invite code</label><input id="bt-in" class="lv-in" autocapitalize="characters" autocorrect="off" spellcheck="false" inputmode="text" placeholder="XXXX-XXXX-XXXX-XXXX" maxlength="40" aria-describedby="bt-err">' +
        '<button class="btn btn-gold" type="submit" id="bt-sub">' + I("key") + 'Join the beta</button><p class="bt-err" id="bt-err" role="alert" hidden></p><p class="small dim">Dashes and capitals don\'t matter.</p></form>';
      h += '<div class="card bt-what"><div class="eyebrow">What you can do</div><ul class="bt-list">' +
        '<li><span>' + I("camera") + '</span><div><b>Check a comp</b><small>Scan a card or type it: year, set, number, player, grade.</small></div></li>' +
        '<li><span>' + I("target") + '</span><div><b>Get the call</b><small>Buy, Hold or Sell, with the sold comps right under it.</small></div></li>' +
        '<li><span class="bt-tu">' + THUMB_UP + '</span><div><b>Tell us if it was right</b><small>Thumbs up or down on every report. A short note helps a lot.</small></div></li></ul>' +
        '<div class="bt-sample"><span class="badge-sample"><i></i>Sample prices</span><p>Every price in the beta is <b>made-up sample data</b> for testing the app. Don\'t buy or sell on it. Real prices come later. Pro features are free during the beta.</p></div></div>';
      h += '<div class="card bt-a2hs" id="bt-a2hs"><div class="eyebrow">Put it on your Home Screen</div>' + (standalone() ? '<p class="small">You\'re already running CardHound from your Home Screen. Nice.</p>' :
        '<ol class="bt-steps"><li><span class="bt-n">1</span><div>In <b>Safari</b>, tap the <b>Share</b> button <span class="bt-ico">' + SHARE + '</span> at the bottom of the screen.</div></li>' +
        '<li><span class="bt-n">2</span><div>Scroll down and tap <b>Add to Home Screen</b> <span class="bt-ico">' + ADDSQ + '</span>.</div></li>' +
        '<li><span class="bt-n">3</span><div>Tap <b>Add</b>. Open <b>CardHound</b> from your Home Screen.</div></li>' +
        '<li><span class="bt-n">4</span><div>The first time it opens, enter your code once more (or tap your invite link again). iPhone keeps Home Screen apps separate from Safari.</div></li></ol>') + '</div>' +
        '<p class="small dim bt-priv">What we keep: your searches and thumbs, saved under your friend slot name only. No email, no real name, no location. <a href="#/legal">More</a></p></section>';
      view.innerHTML = h;
      var f = document.getElementById("bt-f");
      if (f) {
        var inp = document.getElementById("bt-in"), err = document.getElementById("bt-err"), sb = document.getElementById("bt-sub");
        var go = function (code) {
          err.hidden = true; sb.disabled = true; sb.textContent = "Checking…";
          var slow = setTimeout(function () { sb.textContent = "Waking up CardHound (up to a minute)…"; }, 6000);
          B.login(code).then(function (b) { clearTimeout(slow); toast("Welcome, " + (b && b.name ? b.name : "friend") + "!"); welcome(); },
            function (e) { clearTimeout(slow); sb.disabled = false; sb.innerHTML = I("key") + "Join the beta"; err.textContent = e.message; err.hidden = false; });
        };
        f.onsubmit = function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v) { inp.focus(); return; } go(v); };
        if (B.pendingCode) { var c = B.pendingCode; B.pendingCode = null; inp.value = c.toUpperCase(); go(c); }
      } else if (B.pendingCode) { var c2 = B.pendingCode; B.pendingCode = null; B.login(c2).then(function () { welcome(); }, function () {}); }
    }

    /* ---------- "Was this right?" on every report ---------- */
    var FK = "ch_beta_votes";
    function votes() { try { return JSON.parse(localStorage.getItem(FK) || "{}"); } catch (e) { return {}; } }
    function curGrade(r) { var on = document.querySelector(".lv-gt.on"); return (on && on.dataset.g) || r.grade || null; }
    B.reportHooks.push(function () {
      var r = last(); if (!r || !r.card_id || !document.querySelector(".lv-id")) return;
      var anchor = document.querySelector(".lv-cc") || document.querySelector(".lv-id");
      var box = document.createElement("section"); box.className = "bt-fb card"; box.setAttribute("aria-label", "Was this right?");
      function key() { return r.card_id + "|" + (curGrade(r) || ""); }
      function draw(vote) {
        var done = votes()[key()];
        if (done && !vote) { box.innerHTML = '<div class="bt-fbr"><b>Thanks for the ' + (done === "up" ? "thumbs up" : "feedback") + '.</b><button class="link-btn" id="bt-again">Change</button></div>'; box.querySelector("#bt-again").onclick = function () { var v = votes(); delete v[key()]; try { localStorage.setItem(FK, JSON.stringify(v)); } catch (e) {} draw(); }; return; }
        box.innerHTML = '<div class="bt-fbr"><b>Was this right?</b><span class="bt-th"><button class="bt-t up' + (vote === "up" ? " on" : "") + '" data-v="up" aria-label="Yes, this was right" aria-pressed="' + (vote === "up") + '">' + THUMB_UP + '</button>' +
          '<button class="bt-t dn' + (vote === "down" ? " on" : "") + '" data-v="down" aria-label="No, something was off" aria-pressed="' + (vote === "down") + '">' + THUMB_DN + '</button></span></div>' +
          (vote ? '<div class="bt-note"><textarea id="bt-nt" maxlength="280" rows="2" placeholder="' + (vote === "down" ? "What was off? Wrong card, grade, price… (optional)" : "Anything to add? (optional)") + '"></textarea>' +
            '<div class="bt-nr"><small id="bt-cnt">0/280</small><button class="btn btn-gold btn-sm" id="bt-send">Send</button></div></div>' : "");
        box.querySelectorAll(".bt-t").forEach(function (b) { b.onclick = function () { draw(b.dataset.v); }; });
        var nt = box.querySelector("#bt-nt");
        if (nt) { nt.oninput = function () { box.querySelector("#bt-cnt").textContent = nt.value.length + "/280"; };
          box.querySelector("#bt-send").onclick = function () { var sb = this; sb.disabled = true; sb.textContent = "Sending…";
            B.json("/v1/beta/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vote: vote, card_id: r.card_id, card_name: r.name, grade: curGrade(r), note: nt.value }) })
              .then(function () { var v = votes(); v[key()] = vote; try { localStorage.setItem(FK, JSON.stringify(v)); } catch (e) {} toast("Thanks! Maurice will see it."); draw(); },
                function (e) { clearTimeout(slow); sb.disabled = false; sb.textContent = "Send"; toast(e.message); }); }; }
      }
      draw(); anchor.insertAdjacentElement("afterend", box);
      document.querySelectorAll(".lv-gt").forEach(function (t) { t.addEventListener("click", function () { setTimeout(function () { draw(); }, 0); }); });
    });

    /* ---------- Free during beta (replaces the paywall) ---------- */
    function pro() {
      var ben = ["The call: Buy, Sell or Hold", "Sold comps by grade, newest first", "Movers, Hidden Gems, New Highs", "Watchlist and Sniper reminders", "Portfolio and Ledger"];
      view.innerHTML = '<section class="pl-pw bt-pro"><div class="pl-glow" aria-hidden="true"></div><div class="pl-crest">' + I("gem") + '</div><div class="pl-ey">CardHound Pro</div>' +
        '<h1 class="pl-h">Free during <em>the beta</em>.</h1><p class="bt-sub">You get every Pro feature while you test. No payments, no card, nothing to cancel.</p>' +
        '<ul class="pl-ben">' + ben.map(function (b) { return '<li><span class="pl-ck">' + I("check") + '</span><b>' + b + '</b></li>'; }).join("") + '</ul>' +
        '<a class="btn btn-gold" href="#/scan">' + I("search") + 'Check a comp</a><p class="small dim" style="margin-top:12px">Beta prices are sample data.</p></section>';
    }

    /* ---------- About the beta ---------- */
    function about() {
      var w = B.who() || {};
      view.innerHTML = '<div class="lv-head"><div class="eyebrow">Settings</div><h1 class="h1" style="font-size:30px">About the <em>beta</em></h1></div>' +
        '<div class="card"><dl class="kv small"><dt>You</dt><dd>' + esc(w.name || "Not signed in") + '</dd><dt>Prices</dt><dd><span class="badge-sample"><i></i>Sample prices</span> made up for testing</dd>' +
        '<dt>Plan</dt><dd>Pro, free during the beta</dd><dt>Lookups</dt><dd id="bt-qs">checking…</dd><dt>Repeats</dt><dd id="bt-cache">Cached, so repeat checks are instant</dd><dt>The call</dt><dd>Needs ' + (window.CH_LIVE_CFG.thinN || 12) + '+ sales in 30 days' + (window.CH_LIVE_CFG.thinN < 12 ? " (lowered for thin sample data)" : "") + '</dd></dl></div>' +
        '<div class="cta-stack"><a class="btn btn-ghost" href="#/welcome">' + I("download") + 'How to add to Home Screen</a>' + (w.admin ? '<a class="btn btn-gold" href="#/admin">' + I("list") + 'Beta admin</a>' : "") +
        '<button class="btn btn-ghost" id="bt-out">' + I("lock") + 'Sign out</button></div><p class="small dim" style="margin-top:12px">CardHound never bids, buys or messages anyone. Estimates and opinions, not financial advice.</p>';
      B.json("/v1/beta/status").then(function (j) { var q = j.queue || {}, el = document.getElementById("bt-qs"), c = document.getElementById("bt-cache");
        if (el) el.textContent = (q.per_minute || 8) + " a minute for everyone · " + (q.waiting ? q.waiting + " in line now" : "no line right now");
        if (c && j.cache_ttl_hours) c.textContent = "Cached " + j.cache_ttl_hours + " h, so repeat checks are instant"; }, function () {});
      document.getElementById("bt-out").onclick = function () { B.fetch("/v1/auth/logout", { method: "POST" }).catch(function () {}).then(function () { B.setSession(null); location.hash = "#/welcome"; }); };
    }
    function legal() {
      view.innerHTML = '<div class="lv-head"><div class="eyebrow">Beta</div><h1 class="h1" style="font-size:30px">What we <em>keep</em></h1></div><div class="card pl-legal">' +
        '<p><b>Your invite.</b> Your code signs you in as a friend slot (for example "Friend 2"). We don\'t ask for your name, email or phone.</p>' +
        '<p><b>Searches.</b> What you search, the card it matched and when, saved under your slot name, so Maurice can see what to fix.</p>' +
        '<p><b>Thumbs.</b> Your thumbs up or down and the optional note, with the card and grade.</p>' +
        '<p><b>Photos.</b> Used to find the card, then not kept.</p><p><b>Prices.</b> Sample data made up for testing. Not real sales, not advice.</p>' +
        '<p>Maurice can turn off any invite. Ask him to delete your slot\'s data any time.</p></div>';
    }

    /* ---------- admin (slot 0 only; the server checks too) ---------- */
    function admin() {
      var w = B.who() || {};
      if (!w.admin) { location.replace("#/about"); return; }
      view.innerHTML = '<div class="lv-head"><div class="eyebrow">Maurice only</div><h1 class="h1" style="font-size:30px">Beta <em>admin</em></h1></div><div id="bt-adm"><div class="card lv-load"><div class="lv-spin"></div><div><b>Loading…</b></div></div></div>';
      var box = document.getElementById("bt-adm");
      Promise.all([B.json("/v1/beta/admin/summary"), B.json("/v1/beta/admin/searches"), B.json("/v1/beta/admin/feedback")]).then(function (res) {
        var s = res[0], se = res[1].rows || [], fb = res[2].rows || [];
        var h = '<div class="bt-kpis"><div><b class="num">' + s.searches + '</b><small>searches</small></div><div><b class="num up">' + s.feedback.up + '</b><small>thumbs up</small></div><div><b class="num down">' + s.feedback.down + '</b><small>thumbs down</small></div><div><b class="num">' + s.cache_rows + '</b><small>cached comps</small></div></div>';
        h += '<div class="card"><div class="eyebrow">Invites</div><table class="bt-tbl"><thead><tr><th>Slot</th><th>Name</th><th>Status</th><th></th></tr></thead><tbody>' + s.invites.map(function (i) {
          return '<tr><td>' + i.slot + '</td><td>' + esc(i.name) + '</td><td>' + (!i.active ? '<span class="sig sig-bad sig-xs">Off</span>' : i.locked ? '<span class="sig sig-warn sig-xs">Locked 15m</span>' : i.used ? '<span class="sig sig-good sig-xs">Joined</span>' : '<span class="chip">Not yet</span>') + '</td>' +
            '<td class="bt-acts"><button class="link-btn" data-ren="' + i.slot + '">Rename</button>' + (i.slot ? '<button class="link-btn" data-rev="' + i.slot + '" data-on="' + (i.active ? 1 : 0) + '">' + (i.active ? "Turn off" : "Turn on") + '</button>' : "") + '</td></tr>'; }).join("") + '</tbody></table></div>';
        function tbl(title, kind, cols, rows) {
          return '<div class="card"><div class="bt-th2"><div class="eyebrow">' + title + '</div><button class="btn btn-ghost btn-xs" data-csv="' + kind + '">' + I("download") + 'CSV</button></div>' +
            (rows.length ? '<div class="bt-scroll"><table class="bt-tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join("") + '</tr></thead><tbody>' +
              rows.slice(0, 100).map(function (r) { return '<tr>' + cols.map(function (c) { var v = r[c[0]]; if (c[0] === "vote") v = v === "up" ? "👍" : "👎"; return '<td>' + esc(v == null ? "" : v) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>' : '<p class="small dim">Nothing yet.</p>') + '</div>';
        }
        h += tbl("Thumbs", "feedback", [["at_et", "When (ET)"], ["slot_name", "Friend"], ["vote", ""], ["card_name", "Card"], ["grade", "Grade"], ["note", "Note"]], fb);
        h += tbl("Searches", "searches", [["at_et", "When (ET)"], ["slot_name", "Friend"], ["query", "Search"], ["matched_name", "Matched"], ["grade", "Grade"], ["from_cache", "Cached"]], se);
        box.innerHTML = h;
        box.querySelectorAll("[data-ren]").forEach(function (b) { b.onclick = function () { var n = prompt("New name for slot " + b.dataset.ren, ""); if (!n) return;
          B.json("/v1/beta/admin/invites/" + b.dataset.ren, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }) }).then(admin, function (e) { toast(e.message); }); }; });
        box.querySelectorAll("[data-rev]").forEach(function (b) { b.onclick = function () { var off = b.dataset.on === "1"; if (off && !confirm("Turn off slot " + b.dataset.rev + "? They get signed out right away.")) return;
          B.json("/v1/beta/admin/invites/" + b.dataset.rev, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revoked: off }) }).then(admin, function (e) { toast(e.message); }); }; });
        box.querySelectorAll("[data-csv]").forEach(function (b) { b.onclick = function () { B.fetch("/v1/beta/admin/" + b.dataset.csv + ".csv").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); }).then(function (bl) {
          var a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "cardhound-beta-" + b.dataset.csv + ".csv"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }, function (e) { toast(e.message); }); }; });
      }, function (e) { box.innerHTML = '<div class="sig-box bad">' + I("shield") + '<div>' + esc(e.message) + '</div></div>'; });
    }

    B.addRoute("welcome", welcome); B.addRoute("admin", admin);
    B.setRoute("pro", pro); B.setRoute("about", about); B.setRoute("legal", legal); B.setRoute("connections", about);

    /* brand: "CardHound" + Beta chip; the top pill says Sample prices */
    var wm = document.querySelector(".brand .wordmark"); if (wm && !document.querySelector(".brand .bt-chip")) wm.insertAdjacentHTML("afterend", '<span class="bt-chip">Beta</span>');
    var sb = document.getElementById("btn-settings"); if (sb) sb.addEventListener("click", function (e) { e.preventDefault(); e.stopImmediatePropagation(); location.hash = "#/about"; }, true);
    function mark() { var r = (U.parseHash().route || "scan"); document.body.classList.toggle("bt-onwel", r === "welcome"); if (!B.token() && r !== "welcome" && r !== "legal") location.replace("#/welcome"); }
    window.addEventListener("hashchange", mark); setTimeout(mark, 0);
  });
})();
