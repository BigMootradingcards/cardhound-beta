/* Daily report tailoring. Sample rows in, filtered sections out. No invented prices. */
(function (root) {
  "use strict";
  var FOCI = ["all", "watchlist", "gems", "movers"];
  var FOCUS_LABEL = { all: "All", watchlist: "Watchlist", gems: "Gems", movers: "Movers" };
  var DEFAULTS = { categories: [], focus: "all", sections: { movers: true, highs: true, gems: true, hunts: true } };
  function normalize(p) {
    p = p || {};
    var s = p.sections || {};
    var focus = FOCI.indexOf(p.focus) > -1 ? p.focus : "all";
    return {
      categories: Array.isArray(p.categories) ? p.categories.filter(Boolean).slice() : [],
      focus: focus,
      sections: {
        movers: s.movers !== false,
        highs: s.highs !== false,
        gems: s.gems !== false,
        hunts: s.hunts !== false
      }
    };
  }
  function byCat(rows, cats) {
    if (!cats.length) return (rows || []).slice();
    return (rows || []).filter(function (r) { return !r.category || cats.indexOf(r.category) > -1; });
  }
  function textHit(card, needles) {
    var c = String(card || "").toLowerCase();
    return (needles || []).some(function (n) {
      n = String(n || "").toLowerCase().trim();
      return n.length > 2 && c.indexOf(n) > -1;
    });
  }
  function label(prefs) {
    var p = normalize(prefs);
    var cat = p.categories.length ? p.categories.join(", ") : "Every category";
    return cat + " · " + (FOCUS_LABEL[p.focus] || "All") + " · SAMPLE";
  }
  function build(data, prefs) {
    var p = normalize(prefs);
    data = data || {};
    var movers = byCat(data.movers, p.categories);
    var highs = byCat(data.highs, p.categories);
    var gems = byCat(data.gems, p.categories);
    var hunts = (data.hunts || []).slice();
    if (p.focus === "watchlist") {
      var needles = data.watchNames || [];
      var keep = function (r) { return textHit(r.card || r.q || r.name || "", needles); };
      movers = movers.filter(keep);
      highs = highs.filter(keep);
      gems = gems.filter(keep);
    } else if (p.focus === "gems") {
      movers = [];
      highs = [];
    } else if (p.focus === "movers") {
      gems = [];
      highs = [];
    }
    return {
      prefs: p,
      movers: p.sections.movers ? movers : [],
      highs: p.sections.highs ? highs : [],
      gems: p.sections.gems ? gems : [],
      hunts: p.sections.hunts ? hunts : [],
      sample: true
    };
  }
  var api = { defaults: DEFAULTS, normalize: normalize, build: build, label: label, focusLabel: FOCUS_LABEL };
  root.CH_DAILY = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
