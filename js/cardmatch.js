/* CH_MATCH: exact-card matching for listing titles and sold-comp lines.
   Fields: year (season start), set (product line + insert), card number, parallel, serial (/99), grader + grade (+ qualifier, subs),
   auto, RC, reprint. Any conflict = mismatch. Anything we can't read on a field the target needs = unpriced (never a guess). */
(function (root) {
  "use strict";
  /* Longest first. Values are canonical product lines. */
  var LINES = [
    ["topps chrome update", "topps chrome update"], ["topps chrome traded", "topps chrome traded"], ["topps chrome", "topps chrome"],
    ["bowman chrome", "bowman chrome"], ["bowman's best", "bowmans best"], ["bowmans best", "bowmans best"], ["topps finest", "finest"], ["finest", "finest"],
    ["stadium club", "stadium club"], ["topps update", "topps update"], ["topps traded", "topps traded"], ["fleer ultra", "fleer ultra"], ["ultra", "fleer ultra"],
    ["contenders optic", "contenders optic"], ["donruss optic", "donruss optic"], ["panini prizm", "prizm"], ["prizm", "prizm"], ["chronicles", "chronicles"], ["flair showcase", "flair showcase"], ["collector's edge", "collectors edge"],
    ["collector's edge", "collectors edge"], ["collectors edge", "collectors edge"], ["upper deck", "upper deck"], ["select", "select"], ["mosaic", "mosaic"],
    ["donruss", "donruss"], ["bowman", "bowman"], ["fleer", "fleer"], ["topps", "topps"]
  ];
  var INSERTS = ["beam team", "season's best", "seasons best", "scoring kings", "sticker", "all-star", "destiny", "crystalized", "building blocks", "classics", "in action", "rated rookie", "future stars"];
  var MONTHS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/;
  function low(s) { return " " + String(s || "").toLowerCase().replace(/[`’]/g, "'").replace(/[_|,;:()\[\]]/g, " ").replace(/\s+/g, " ") + " "; }
  function parse(title) {
    var t = low(title), o = { raw: String(title || "") };
    var q0 = String(title || "").toLowerCase().match(/\((oc|mc|st|pd|of|mk)\)/);
    /* abbreviations */
    t = t.replace(/ tc /g, " topps chrome ").replace(/ bc /g, " bowman chrome ").replace(/ tcu /g, " topps chrome update ")
      .replace(/ refs? /g, " refractor ").replace(/ x-?fractors? /g, " xfractor ").replace(/ refractors /g, " refractor ")
      .replace(/ rookie card /g, " rc ").replace(/ rookie /g, " rc ").replace(/ \(rc\) /g, " rc ")
      .replace(/ (psa|bgs|sgc|cgc|bvg)(\d)/g, " $1 $2").replace(/ beckett /g, " bgs ");
    var y = t.match(/ (19[4-9]\d|20[0-4]\d)(?:-(\d{2}))? /); o.year = y ? y[1] : ""; o.season = !!(y && y[2]);
    if (!y) { var y2 = t.match(/ (\d{2})-(\d{2}) /); if (y2) { o.year = (+y2[1] > 40 ? "19" : "20") + y2[1]; o.season = true; } }
    o.set = ""; for (var i = 0; i < LINES.length; i++) { if (t.indexOf(" " + LINES[i][0] + " ") > -1) { o.set = LINES[i][1]; break; } }
    if (!o.set && / topps /.test(t)) o.set = "topps";
    o.insert = ""; INSERTS.forEach(function (x) { if (!o.insert && t.indexOf(" " + x + " ") > -1) o.insert = x.replace("'", "").replace("seasons", "seasons"); });
    o.insert = o.insert.replace("season's", "seasons");
    var n = t.match(/ #\s?([a-z]{0,4}-?\d{1,4}[a-z]?) /) || t.match(/ no\.? ?(\d{1,4}) /) || t.match(/ (bt\d{1,3}|sb\d{1,3}|cnb\d{1,3}|t\d{2,3}) /);
    o.number = n ? n[1].toUpperCase().replace(/-/g, "") : "";
    var ser = t.match(/(?:^|[\s#])(?:\d{1,4})?\/(\d{1,4})\b/); o.serial = ser && !/\d\/\d{2,4} /.test(t.slice(Math.max(0, t.indexOf(ser[0]) - 3))) ? ser[1] : (ser ? ser[1] : "");
    if (/ (?:\d{1,2})\/(\d{1,2})\/(\d{2,4}) /.test(t)) o.serial = "";
    var par = "base";
    if (/ xfractor /.test(t)) par = "xfractor";
    else if (/ (gold|orange|red|blue|green|purple|black|atomic|prism|pink) refractor /.test(t)) par = t.match(/ (gold|orange|red|blue|green|purple|black|atomic|prism|pink) refractor /)[1] + " refractor";
    else if (/ refractor /.test(t)) par = "refractor";
    else if (/ members only /.test(t)) par = "members only";
    else if (/ (silver|gold|hyper|mojo|shimmer|wave) (prizm|parallel) /.test(t)) par = t.match(/ (silver|gold|hyper|mojo|shimmer|wave) (prizm|parallel) /)[1];
    else if (/ row [012] /.test(t)) par = t.match(/ (row [012]) /)[1];
    else if (o.set === "prizm" && / (silver|gold|hyper|mojo|shimmer|wave|red|blue|green) /.test(t)) par = t.match(/ (silver|gold|hyper|mojo|shimmer|wave|red|blue|green) /)[1];
    else if (/ no protectors? /.test(t)) par = "no protectors";
    o.parallel = par;
    var g = t.match(/ (psa|bgs|sgc|cgc|bvg) (10|[1-9](?:\.5)?) /);
    if (!g && / bgs /.test(t)) { var g2 = t.match(/ grade (10|[1-9](?:\.5)?) /); if (g2) g = [0, "bgs", g2[1]]; }
    o.grader = g ? (g[1] === "bvg" ? "bgs" : g[1]) : (/ (psa|bgs|sgc|cgc) /.test(t) ? "?" : "raw");
    o.grade = g ? g[2] : "";
    o.qual = q0 ? q0[1] : "";
    var subs = t.match(/ (\d{1,2}(?:\.5)?\/\d{1,2}(?:\.5)?\/\d{1,2}(?:\.5)?\/\d{1,2}(?:\.5)?) /); o.subs = subs ? subs[1] : "";
    o.auto = / (auto|autograph|autographed|signed|on-card auto) /.test(t);
    o.rc = / rc /.test(t);
    o.reprint = / (reprint|rp|reprints) /.test(t);
    return o;
  }
  function gradeStr(o) { return o.grader === "raw" ? "raw" : o.grader + " " + o.grade; }
  function numEq(a, b) {
    if (a === b) return true;
    var da = a.replace(/^[A-Z]+/, ""), db = b.replace(/^[A-Z]+/, "");
    return da === db && (da === a || db === b); /* "BT21" ~ "21" when one side has no prefix */
  }
  /* want/got: parsed objects (or partial structured). opts.ignoreGrade for comps grouped by grade elsewhere. */
  function compare(want, got, opts) {
    opts = opts || {};
    var bad = [], unk = [], flags = [];
    function f(name, w, g, eq) { if (!w) return; if (!g) { unk.push(name); return; } if (!(eq ? eq(w, g) : w === g)) bad.push(name + ": " + w + " vs " + g); }
    if (want.year && got.year && want.year !== got.year && ((want.season && !got.season && +got.year === +want.year + 1) || (got.season && !want.season && +want.year === +got.year + 1))) unk.push("year (season vs single year)");
    else f("year", want.year, got.year);
    f("set", want.set, got.set);
    if (want.insert || got.insert) { if (want.insert !== got.insert) bad.push("insert: " + (want.insert || "none") + " vs " + (got.insert || "none")); }
    f("number", want.number, got.number, numEq);
    if ((want.parallel || "base") !== (got.parallel || "base")) bad.push("parallel: " + (want.parallel || "base") + " vs " + (got.parallel || "base"));
    if ((want.serial || "") !== (got.serial || "")) { if (!want.serial || !got.serial) (want.serial ? unk : bad).push("serial: /" + (want.serial || "none") + " vs /" + (got.serial || "none")); else bad.push("serial: /" + want.serial + " vs /" + got.serial); }
    if (!!want.auto !== !!got.auto) bad.push("auto: " + (want.auto ? "auto" : "no auto") + " vs " + (got.auto ? "auto" : "no auto"));
    if (got.reprint && !want.reprint) bad.push("reprint");
    if (!opts.ignoreGrade) {
      if (got.grader === "?" || want.grader === "?") unk.push("grade");
      else if (gradeStr(want) !== gradeStr(got)) bad.push("grade: " + gradeStr(want) + " vs " + gradeStr(got));
      if ((want.qual || "") !== (got.qual || "")) bad.push("qualifier: " + (want.qual || "none") + " vs " + (got.qual || "none"));
      if (want.subs && got.subs && want.subs !== got.subs) bad.push("subs: " + want.subs + " vs " + got.subs);
      if (want.subs && !got.subs) unk.push("subs");
    }
    if (want.rc && !got.rc) flags.push("RC not stated");
    var verdict = bad.length ? "mismatch" : unk.length ? "unpriced" : "match";
    return { verdict: verdict, bad: bad, unknown: unk, flags: flags };
  }
  function matchTitles(wantTitle, gotTitle, opts) { return compare(parse(wantTitle), parse(gotTitle), opts); }
  /* Structured card (year/set/number/variant/player) → want spec. */
  function fromCard(c) {
    var p = parse([c.year, c.set, c.number ? "#" + String(c.number).replace(/^#/, "") : "", c.player, c.variant, c.grade].filter(Boolean).join(" "));
    if (c.serial) p.serial = String(c.serial).replace(/^\//, "");
    if (c.auto != null) p.auto = !!c.auto;
    return p;
  }
  var api = { parse: parse, compare: compare, matchTitles: matchTitles, fromCard: fromCard, gradeStr: gradeStr };
  root.CH_MATCH = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
