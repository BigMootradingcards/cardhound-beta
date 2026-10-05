/* CardHound voice / prompt parsing. Pure functions (no DOM), shared by the browser and node tests.
 *   CH_VOICE_PARSE.parseHunt(text, answers)  -> { fields, chips, ambiguities, consumed }
 *   CH_VOICE_PARSE.routeVoiceIntent(text, ctx) -> { intent, fields, confidence, alternatives }
 *   CH_VOICE_PARSE.runHunt(fields, listings, opts) -> { results, expanded, hidden, strictCount }
 *   CH_VOICE_PARSE.profitMath(listing, opts)  -> buy + fees + grading + shipping vs EV by grade
 * Never assumes: when a field is ambiguous it returns an ambiguity with tap options instead of guessing. */
(function (root) {
  "use strict";
  var CATS = { basketball: "Basketball", baseball: "Baseball", football: "Football", hockey: "Hockey", pokemon: "Pokémon", "pokémon": "Pokémon", magic: "Magic", mtg: "Magic" };
  var PLAYERS = [
    [["albert pujols", "pujols"], "Albert Pujols", "Baseball", 2001], [["victor wembanyama", "wembanyama", "wemby"], "Victor Wembanyama", "Basketball", 2023],
    [["luka doncic", "luka", "doncic"], "Luka Doncic", "Basketball", 2018], [["lebron james", "lebron"], "LeBron James", "Basketball", 2003],
    [["kobe bryant", "kobe"], "Kobe Bryant", "Basketball", 1996], [["michael jordan", "jordan"], "Michael Jordan", "Basketball", 1986],
    [["zion williamson", "zion"], "Zion Williamson", "Basketball", 2019], [["anthony edwards", "ant edwards"], "Anthony Edwards", "Basketball", 2020],
    [["shaquille o'neal", "shaquille oneal", "shaq"], "Shaquille O'Neal", "Basketball", 1992], [["allen iverson", "iverson"], "Allen Iverson", "Basketball", 1996],
    [["tim duncan", "duncan"], "Tim Duncan", "Basketball", 1997], [["vince carter"], "Vince Carter", "Basketball", 1998], [["dirk nowitzki", "dirk"], "Dirk Nowitzki", "Basketball", 1998],
    [["kevin garnett", "garnett"], "Kevin Garnett", "Basketball", 1995],
    [["patrick mahomes", "mahomes"], "Patrick Mahomes", "Football", 2017], [["josh allen"], "Josh Allen", "Football", 2018], [["joe burrow", "burrow"], "Joe Burrow", "Football", 2020],
    [["c.j. stroud", "cj stroud", "c j stroud", "stroud"], "C.J. Stroud", "Football", 2023], [["brock purdy", "purdy"], "Brock Purdy", "Football", 2022],
    [["justin herbert", "herbert"], "Justin Herbert", "Football", 2020], [["tom brady", "brady"], "Tom Brady", "Football", 2000], [["peyton manning"], "Peyton Manning", "Football", 1998],
    [["randy moss"], "Randy Moss", "Football", 1998],
    [["mike trout", "trout"], "Mike Trout", "Baseball", 2011], [["shohei ohtani", "ohtani"], "Shohei Ohtani", "Baseball", 2018], [["julio rodriguez", "julio"], "Julio Rodriguez", "Baseball", 2022],
    [["jackson holliday", "holliday"], "Jackson Holliday", "Baseball", 2023], [["derek jeter", "jeter"], "Derek Jeter", "Baseball", 1993], [["ken griffey jr", "griffey"], "Ken Griffey Jr.", "Baseball", 1989],
    [["ronald acuna", "acuna"], "Ronald Acuña Jr.", "Baseball", 2018],
    [["connor mcdavid", "mcdavid"], "Connor McDavid", "Hockey", 2015], [["connor bedard", "bedard"], "Connor Bedard", "Hockey", 2023], [["sidney crosby", "crosby"], "Sidney Crosby", "Hockey", 2005],
    [["wayne gretzky", "gretzky"], "Wayne Gretzky", "Hockey", 1979],
    [["charizard"], "Charizard", "Pokémon", null], [["umbreon"], "Umbreon", "Pokémon", null], [["blastoise"], "Blastoise", "Pokémon", null], [["mew ex", "mew"], "Mew", "Pokémon", null],
    [["pikachu"], "Pikachu", "Pokémon", null], [["lightning bolt"], "Lightning Bolt", "Magic", null], [["underground sea"], "Underground Sea", "Magic", null], [["the one ring"], "The One Ring", "Magic", null]
  ];
  // set aliases -> [set, brand, category?]. "chrome" and "metal" alone are ambiguous (handled below).
  var SETS = [
    ["topps chrome traded", "Topps Chrome Traded", "Topps"], ["topps chrome update", "Topps Chrome Update", "Topps"], ["topps chrome", "Topps Chrome", "Topps"], ["bowman chrome", "Bowman Chrome", "Bowman"],
    ["bowman's best", "Bowman's Best", "Bowman"], ["bowmans best", "Bowman's Best", "Bowman"], ["topps finest", "Topps Finest", "Topps"], ["finest", "Topps Finest", "Topps"],
    ["stadium club", "Stadium Club", "Topps"], ["topps update", "Topps Update", "Topps"], ["national treasures", "National Treasures", "Panini"], ["flawless", "Flawless", "Panini"],
    ["donruss optic", "Donruss Optic", "Panini"], ["optic", "Donruss Optic", "Panini"], ["prizm", "Panini Prizm", "Panini"], ["prism", "Panini Prizm", "Panini"], ["select", "Select", "Panini"], ["mosaic", "Mosaic", "Panini"],
    ["contenders", "Contenders", "Panini"], ["immaculate", "Immaculate", "Panini"], ["hoops", "Hoops", "Panini"],
    ["young guns", "Upper Deck Young Guns", "Upper Deck"], ["sp authentic", "SP Authentic", "Upper Deck"], ["exquisite", "Exquisite", "Upper Deck"],
    ["skybox metal universe", "Skybox Metal Universe", "Skybox"], ["metal universe", "Skybox Metal Universe", "Skybox"], ["fleer metal", "Fleer Metal", "Fleer"],
    ["e-x2001", "Skybox E-X2001", "Skybox"], ["ex2001", "Skybox E-X2001", "Skybox"], ["e-x2000", "Skybox E-X2000", "Skybox"], ["ex2000", "Skybox E-X2000", "Skybox"], ["e-x 2000", "Skybox E-X2000", "Skybox"],
    ["skybox premium", "Skybox Premium", "Skybox"], ["fleer ultra", "Fleer Ultra", "Fleer"], ["flair showcase", "Flair Showcase", "Fleer"], ["fleer tradition", "Fleer Tradition", "Fleer"],
    ["evolving skies", "Evolving Skies", "Pokémon", "Pokémon"], ["scarlet & violet 151", "Scarlet & Violet 151", "Pokémon", "Pokémon"], ["scarlet and violet 151", "Scarlet & Violet 151", "Pokémon", "Pokémon"], ["base set", "Base Set", "Pokémon", "Pokémon"],
    ["alpha", "Alpha", "Wizards", "Magic"]
  ];
  var BRANDS = [["upper deck", "Upper Deck"], ["topps", "Topps"], ["bowman", "Bowman"], ["panini", "Panini"], ["fleer", "Fleer"], ["skybox", "Skybox"], ["donruss", "Donruss"], ["score", "Score"], ["leaf", "Leaf"], ["pinnacle", "Pinnacle"], ["pacific", "Pacific"], ["playoff", "Playoff"]];
  var INSERTS = [
    [["precious metal gems", "pmg", "pmgs"], "Precious Metal Gems (PMG)"], [["essential credentials", "credentials now", "credentials future", "credentials next", "credentials"], "Credentials"],
    [["star rubies", "star ruby"], "Star Rubies"], [["jambalaya"], "Jambalaya"], [["jam session", "jam sessions"], "Jam Session"], [["slam dunk", "dunk inc", "dunk"], "Dunk"],
    [["rookie ticket"], "Rookie Ticket"], [["rated rookie"], "Rated Rookie"], [["downtown"], "Downtown"], [["kaboom"], "Kaboom!"], [["color blast"], "Color Blast"], [["stained glass"], "Stained Glass"],
    [["totally certified"], "Totally Certified"], [["thunderball", "thunder ball"], "Thunderball"], [["fresh foundations"], "Fresh Foundations"], [["sky's the limit", "skys the limit"], "Sky's the Limit"]
  ];
  var COLORS = ["silver", "gold", "red", "blue", "green", "purple", "orange", "black", "pink", "white", "aqua", "sepia", "yellow", "teal", "bronze", "platinum", "emerald", "sapphire", "ruby"];
  var FINISH = ["superfractor", "x-fractor", "xfractor", "refractor", "prizm", "prism", "wave", "mojo", "shimmer", "atomic", "cracked ice", "disco", "hyper", "pulsar", "lazer", "camo", "ice", "medallion", "holo"];
  var NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, twelve: 12, couple: 2, few: 3 };
  function cap(s) { return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }
  function norm(t) { return " " + String(t || "").toLowerCase().replace(/[’']/g, "'").replace(/[“”"]/g, " ").replace(/\s+/g, " ").trim() + " "; }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function has(t, alias) { return new RegExp("(^|[^a-z0-9])" + esc(alias) + "(?=$|[^a-z0-9])").test(t); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  function parseHunt(text, answers) {
    answers = answers || {};
    var t = norm(text), f = {}, amb = [];
    var take = function (re) { var m = t.match(re); if (m) t = t.replace(m[0], " "); return m; };
    // --- seller filters (before % / numbers are consumed elsewhere)
    var sf = {};
    var fb = take(/(?:feedback|positive|seller)\s*(?:of|at least|over|above|>=?|min(?:imum)?)?\s*(\d{2}(?:\.\d+)?)\s*%?/) || take(/(\d{2}(?:\.\d+)?)\s*%\s*\+?\s*(?:positive\s*)?(?:feedback|positive|sellers?)/);
    if (fb) sf.min_feedback_pct = parseFloat(fb[1]);
    if (take(/\btop[- ]rated(?: sellers?)?(?: plus)?\b/) || take(/\btrs\b/)) sf.top_rated = true;
    if (take(/\b(?:u\.?s\.?a?\.?|united states) (?:only|sellers? only|sellers?)\b/) || take(/\bships? from (?:the )?(?:us|u\.s\.|usa)\b/) || take(/\bdomestic(?: only)?\b/)) sf.us_only = true;
    if (take(/\b(?:free )?returns?(?: accepted| allowed| ok)?\b/) || take(/\baccepts returns\b/)) sf.returns = true;
    if (Object.keys(sf).length) f.seller_filters = sf;
    // --- end window
    var ew = take(/\bending (?:in |within )?(?:the )?(?:next )?(\d+|an?|one|two|three|four|five|six|twelve|couple(?: of)?|few)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/);
    if (ew) { var n = /^\d+$/.test(ew[1]) ? +ew[1] : (NUMW[ew[1].replace(" of", "")] || 1), unit = /^(h|hr|hrs|hour|hours)$/.test(ew[2]) ? 60 : 1; f.end_window = { minutes: n * unit, label: "Ending in " + (unit === 60 ? n + (n === 1 ? " hour" : " hours") : n + " min") }; }
    else if (take(/\b(?:ending |that end |ends )?tonight\b/)) f.end_window = { until: "23:59", label: "Ending tonight" };
    else if (take(/\bending today\b/)) f.end_window = { until: "23:59", label: "Ending today" };
    else if (take(/\bending (?:this )?weekend\b/)) f.end_window = { until: "sun 23:59", label: "Ending this weekend" };
    else if (take(/\bending soon\b|\bending shortly\b/)) {
      if (answers.end_window) f.end_window = answers.end_window;
      else amb.push({ field: "end_window", question: "How soon is \"ending soon\"?", options: [{ label: "Next hour", set: { end_window: { minutes: 60, label: "Ending in 1 hour" } } }, { label: "Next 3 hours", set: { end_window: { minutes: 180, label: "Ending in 3 hours" } } }, { label: "Today", set: { end_window: { until: "23:59", label: "Ending today" } } }] });
    }
    // --- listing type
    if (take(/\b(?:auction or (?:buy it now|bin)|(?:buy it now|bin) or auction|either|any listing(?: type)?)\b/)) f.listing_type = "any";
    else if (take(/\b(?:buy it now|buy-it-now|bin|fixed price|buy now)\b/)) f.listing_type = "bin";
    else if (take(/\bauctions?\b|\bbidding\b/)) f.listing_type = "auction";
    // --- budget
    var b = take(/\b(?:under|below|less than|max(?:imum)?(?: of)?|up to|no more than|budget(?: of| is)?|capped? at|at most|for less than|<)\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(k|grand)?(?:\s*(?:bucks|dollars|usd))?/);
    if (!b) b = take(/\$\s*(\d+(?:[.,]\d+)?)\s*(k)?\s*(?:or less|max|tops)?/) || take(/\b(\d+(?:\.\d+)?)\s*(k)?\s*(?:bucks|dollars)\b/);
    if (b) { var v = parseFloat(String(b[1]).replace(/,/g, "")); if (b[2]) v *= 1000; f.budget_max = v; }
    // --- condition notes
    var cn = [], cm;
    while ((cm = take(/\b(\d{2})\s*\/\s*(\d{2})\s*(?:centering|centered)?\b/)) && +cm[1] + +cm[2] === 100) cn.push("Centering " + cm[1] + "/" + cm[2] + " or better");
    [[/\b(?:well[- ]centered|good centering|centered)\b/, "Well centered"], [/\boff[- ]?cent(?:er|re)(?:ed)?\b/, "Off-center OK"], [/\bsharp corners\b|\bclean corners\b/, "Sharp corners"], [/\bclean edges\b/, "Clean edges"],
     [/\bno creases?\b|\bcrease[- ]free\b/, "No creases"], [/\bclean surface\b|\bno scratches\b/, "Clean surface"], [/\bnear mint(?: to mint)?\b|\bnm[- ]?mt\b|\bnm\b/, "Near mint"]].forEach(function (p) { if (take(p[0])) cn.push(p[1]); });
    if (cn.length) f.condition_notes = cn;
    // --- grade
    var g = take(/\b(psa|bgs|beckett|sgc|cgc|csg|tag|hga)\s*(10|[1-9](?:\.5)?)\b/);
    if (g) { f.grade_company = { beckett: "BGS", csg: "CGC" }[g[1]] || g[1].toUpperCase(); f.grade = parseFloat(g[2]); f.raw = false; }
    else if (take(/\bblack label\b/)) { f.grade_company = "BGS"; f.grade = 10; f.raw = false; f.condition_notes = (f.condition_notes || []).concat("Black Label"); }
    else {
      var gm = take(/\bgem(?: mint| mt)?\s*(10)?\b|\b(?:a|graded) (10|9\.5|9)\b|\bpristine\b/);
      var comp = take(/\b(psa|bgs|beckett|sgc|cgc)(?: graded)?\b/);
      if (gm) {
        f.grade = parseFloat(gm[2] || "10"); f.raw = false;
        if (comp) f.grade_company = { beckett: "BGS" }[comp[1]] || comp[1].toUpperCase();
        else if (answers.grade_company) f.grade_company = answers.grade_company;
        else amb.push({ field: "grade_company", question: "A " + f.grade + " from which grader?", options: [{ label: "PSA " + f.grade, set: { grade_company: "PSA" } }, { label: "BGS " + f.grade, set: { grade_company: "BGS" } }, { label: "SGC " + f.grade, set: { grade_company: "SGC" } }, { label: "Any grader", set: { grade_company: "Any" } }] });
      } else if (comp) { f.grade_company = { beckett: "BGS" }[comp[1]] || comp[1].toUpperCase(); f.raw = false; }
      else if (take(/\b(?:raw|ungraded|not graded|unslabbed)\b/)) { f.raw = true; f.grade_company = null; f.grade = null; }
      else if (take(/\bgraded\b|\bslabbed\b/)) { f.raw = false; f.grade_company = "Any"; }
    }
    // --- serial numbered
    var sn = take(/\b(?:1 of 1|one of one|1\/1)\b/);
    if (sn) f.serial_numbered = "/1";
    else { sn = take(/(?:\/|\bout of |\bnumbered (?:to |\/)?|#'?d (?:to )?|\bserial(?:ed)? (?:to |\/)?)\s?(\d{1,4})\b/); if (sn) f.serial_numbered = "/" + +sn[1]; }
    // --- year
    var y = take(/\b(19[5-9]\d|20[0-3]\d)\s*(?:-|\/|to)\s*(\d{2})\b/) || take(/\b(19[5-9]\d|20[0-3]\d)\b/);
    if (y) f.year = y[2] ? y[1] + "-" + y[2] : y[1];
    else { var y2 = take(/\b'?([5-9]\d|0\d|1\d|2\d)\s*-\s*'?([5-9]\d|0\d|1\d|2\d)\b/); if (y2) { var c1 = +y2[1] > 40 ? "19" : "20"; f.year = c1 + y2[1] + "-" + y2[2]; } else { var y3 = take(/\s'(\d{2})\b/); if (y3) f.year = (+y3[1] > 40 ? "19" : "20") + y3[1]; } }
    if (!f.year) { if (take(/\blate (?:19)?90'?s\b|\blate nineties\b/)) f.year_range = [1996, 1999]; else if (take(/\bearly 2000'?s\b|\bearly two thousands\b/)) f.year_range = [2000, 2003]; else if (take(/\b(?:19)?90'?s\b|\bnineties\b/)) f.year_range = [1990, 1999]; }
    // --- card number
    var cnum = take(/#\s?([a-z]{0,4}-?\d{1,4})\b/) || take(/\b(?:card )?(?:number|no\.?) ([a-z]{0,4}-?\d{1,4})\b/) || take(/\b(t\d{2,3}|us\d{2,3}|bcp-?\d{1,3}|g-\d{1,3})\b/);
    if (cnum) f.card_number = cnum[1].toUpperCase();
    // --- player (longest alias first)
    var al = []; PLAYERS.forEach(function (p) { p[0].forEach(function (a) { al.push([a, p]); }); }); al.sort(function (a, b) { return b[0].length - a[0].length; });
    for (var i = 0; i < al.length; i++) if (has(t, al[i][0])) { f.player = al[i][1][1]; f.category = al[i][1][2]; f._rcYear = al[i][1][3]; t = t.replace(new RegExp(esc(al[i][0])), " "); break; }
    // --- category words
    Object.keys(CATS).forEach(function (k) { if (has(t, k)) { if (!f.category) f.category = CATS[k]; t = t.replace(new RegExp("\\b" + esc(k) + "\\b"), " "); } });
    // --- inserts (before sets/colors so "metal gems" isn't read as a set)
    for (var j = 0; j < INSERTS.length && !f.subset_insert; j++) for (var k2 = 0; k2 < INSERTS[j][0].length; k2++) if (has(t, INSERTS[j][0][k2])) { f.subset_insert = INSERTS[j][1]; t = t.replace(INSERTS[j][0][k2], " "); break; }
    if (f.subset_insert === "Rated Rookie") f.rookie = true;
    // --- brand words (may resolve "chrome"/"metal")
    var brandWord = null; BRANDS.forEach(function (bw) { if (!brandWord && has(t, bw[0])) brandWord = bw; });
    for (var s = 0; s < SETS.length; s++) if (has(t, SETS[s][0])) { f.set = SETS[s][1]; f.brand = SETS[s][2]; if (SETS[s][3] && !f.category) f.category = SETS[s][3]; t = t.replace(SETS[s][0], " "); break; }
    if (!f.set && has(t, "chrome")) {
      t = t.replace("chrome", " ");
      if (brandWord && (brandWord[1] === "Topps" || brandWord[1] === "Bowman")) { f.set = brandWord[1] + " Chrome"; f.brand = brandWord[1]; t = t.replace(brandWord[0], " "); }
      else if (answers.set) { f.set = answers.set; f.brand = /bowman/i.test(answers.set) ? "Bowman" : /topps/i.test(answers.set) ? "Topps" : null; }
      else amb.push({ field: "set", question: "Which Chrome?", options: [{ label: "Topps Chrome", set: { set: "Topps Chrome", brand: "Topps" } }, { label: "Bowman Chrome", set: { set: "Bowman Chrome", brand: "Bowman" } }, { label: "Either Chrome", set: { set: "Any Chrome", brand: null } }] });
    }
    if (!f.set && has(t, "metal")) {
      t = t.replace("metal", " ");
      if (brandWord && (brandWord[1] === "Skybox" || brandWord[1] === "Fleer")) { f.set = brandWord[1] === "Skybox" ? "Skybox Metal Universe" : "Fleer Metal"; f.brand = brandWord[1]; t = t.replace(brandWord[0], " "); }
      else if (answers.set) f.set = answers.set;
      else amb.push({ field: "set", question: "Which Metal?", options: [{ label: "Skybox Metal Universe (1996-99)", set: { set: "Skybox Metal Universe", brand: "Skybox" } }, { label: "Fleer Metal (2000-01)", set: { set: "Fleer Metal", brand: "Fleer" } }, { label: "Either", set: { set: "Any Metal", brand: null } }] });
    }
    if (!f.brand && brandWord) { f.brand = brandWord[1]; t = t.replace(brandWord[0], " "); }
    // --- parallel / color
    var colorW = null; COLORS.forEach(function (c) { if (!colorW && has(t, c)) colorW = c; });
    var finW = null; FINISH.forEach(function (x) { if (!finW && has(t, x)) finW = x; });
    if (f.set === "Panini Prizm" && finW === "prizm") finW = null;
    if (has(t, "base") && !colorW && !finW) { f.parallel_color = "Base"; t = t.replace("base", " "); }
    if (finW) t = t.replace(finW, " ");
    if (colorW) t = t.replace(colorW, " ");
    var finName = finW ? ({ "x-fractor": "X-Fractor", xfractor: "X-Fractor", prism: "Prizm", ice: "Ice", "cracked ice": "Cracked Ice" }[finW] || cap(finW)) : null;
    if (finW === "refractor" && !colorW) {
      if (answers.parallel_color) f.parallel_color = answers.parallel_color;
      else if (has(t, "base") || /\bbase\b/.test(norm(text)) && f.parallel_color === "Base") f.parallel_color = "Refractor";
      else amb.push({ field: "parallel_color", question: "Base refractor or a color?", options: [{ label: "Base Refractor", set: { parallel_color: "Refractor" } }, { label: "Gold Refractor", set: { parallel_color: "Gold Refractor" } }, { label: "Orange Refractor", set: { parallel_color: "Orange Refractor" } }, { label: "Any refractor", set: { parallel_color: "Any Refractor" } }] });
    } else if (colorW || finW) {
      var col = colorW ? cap(colorW) : "";
      if (f.set === "Panini Prizm" && colorW && !finW) f.parallel_color = col + " Prizm";
      else if (f.subset_insert && colorW && !finW) f.parallel_color = col;
      else f.parallel_color = (col + " " + (finName || "")).trim();
    }
    if (f.parallel_color === "Base" && /refractor/i.test(norm(text))) f.parallel_color = "Refractor";
    // --- rookie / auto / patch
    if (take(/\b(?:rookies?|rc|rcs|1st bowman|first bowman)\b/)) f.rookie = true;
    if (take(/\brpa\b/)) { f.rookie = true; f.patch = true; f.auto = true; }
    if (take(/\b(?:no auto|non[- ]auto)\b/)) f.auto = false; else if (take(/\b(?:auto(?:graph(?:ed)?)?s?|signed|on[- ]card)\b/)) f.auto = true;
    if (take(/\b(?:patch(?:es)?|jersey|relic|memorabilia|mem)\b/)) f.patch = true;
    if (f.rookie && f.player && !f.year && !f.year_range) {
      if (answers.year) { if (answers.year !== "any") f.year = answers.year; else f.rookie_any_year = true; }
      else { var ry = f._rcYear; amb.push({ field: "year", question: "Rookie from which year?", options: (ry ? [{ label: ry + (f.category === "Basketball" || f.category === "Hockey" ? "-" + String(ry + 1).slice(2) : "") + " (rookie year)", set: { year: String(ry) } }] : []).concat([{ label: "Any year with the RC logo", set: { year: "any" } }]) }); }
    }
    delete f._rcYear;
    // what's left
    var stop = /\b(find|me|a|an|the|for|on|of|with|and|or|in|to|i|want|looking|look|hunt|search|show|get|any|some|cards?|card|listing|listings|please|that|are|is|ending|next|hours|grade|grading|flip|deal|deals|cheap|good|nice|copy|copies|one|just|only|from|sellers?|seller|by|this|can|you)\b/g;
    var left = t.replace(stop, " ").replace(/[^a-z0-9'\- ]/g, " ").replace(/\s+/g, " ").trim();
    if (left && !f.player) f.keywords = left;
    return { fields: f, chips: chipsFor(f), ambiguities: amb.slice(0, 3) };
  }
  var LABEL = { year: "Year", year_range: "Years", brand: "Brand", set: "Set", subset_insert: "Insert", player: "Player", card_number: "Card #", parallel_color: "Parallel", serial_numbered: "Serial", rookie: "Rookie", auto: "Auto", patch: "Patch", grade: "Grade", raw: "Raw", condition_notes: "Condition", budget_max: "Max", listing_type: "Type", end_window: "Ends", seller_filters: "Seller", category: "Category", keywords: "Keywords" };
  function chipsFor(f) {
    var c = [];
    var add = function (k, v) { c.push({ field: k, label: LABEL[k], value: v }); };
    if (f.player) add("player", f.player);
    if (f.year) add("year", f.year); if (f.year_range) add("year_range", f.year_range[0] + "-" + f.year_range[1]);
    if (f.brand) add("brand", f.brand); if (f.set) add("set", f.set); if (f.subset_insert) add("subset_insert", f.subset_insert);
    if (f.card_number) add("card_number", "#" + f.card_number); if (f.parallel_color) add("parallel_color", f.parallel_color); if (f.serial_numbered) add("serial_numbered", f.serial_numbered);
    if (f.rookie) add("rookie", f.rookie_any_year ? "RC (any year)" : "RC"); if (f.auto === true) add("auto", "Auto"); if (f.auto === false) add("auto", "No auto"); if (f.patch) add("patch", "Patch");
    if (f.raw === true) add("raw", "Raw"); else if (f.grade_company || f.grade) add("grade", ((f.grade_company && f.grade_company !== "Any") ? f.grade_company : (f.grade ? "Any grader" : "Any")) + (f.grade ? " " + f.grade : " graded"));
    (f.condition_notes || []).forEach(function (n) { add("condition_notes", n); });
    if (f.budget_max) add("budget_max", "Under " + money(f.budget_max));
    if (f.listing_type) add("listing_type", { auction: "Auction", bin: "Buy It Now", any: "Auction or BIN" }[f.listing_type]);
    if (f.end_window) add("end_window", f.end_window.label);
    var s = f.seller_filters || {};
    if (s.min_feedback_pct) add("seller_filters", s.min_feedback_pct + "%+ feedback"); if (s.top_rated) add("seller_filters", "Top Rated"); if (s.us_only) add("seller_filters", "US only"); if (s.returns) add("seller_filters", "Returns accepted");
    if (f.category && !f.player) add("category", f.category);
    if (f.keywords) add("keywords", f.keywords);
    return c;
  }

  /* ---------- intent router ---------- */
  var LISTS = [["highs", /\b(new highs?|record (?:highs?|sales?)|all[- ]time highs?|90[- ]day highs?|highest sales?)\b/], ["picks", /\b(buy[\s\/,-]*hold[\s\/,-]*(?:or |and )?sell|picks?|what should i buy|what to buy)\b/], ["searched", /\b(most searched|most looked up|searched|popular searches|what are people searching)\b/], ["movers", /\b(movers?|moving|trending|gainers|losers|biggest (?:jumps|drops|moves)|risers|fallers|hot cards|heating up|cooling)\b/]];
  function routeVoiceIntent(text, ctx) {
    ctx = ctx || {};
    var t = norm(text), sc = {}, F = {};
    var bump = function (k, v) { sc[k] = Math.max(sc[k] || 0, v); };
    var p = parseHunt(text), pf = p.fields;
    var cardish = !!(pf.player || pf.set || pf.subset_insert || pf.card_number || (pf.brand && pf.year) || (pf.parallel_color && pf.parallel_color !== "Base"));
    var thisRef = /\b(this|it|that one|this card|this one)\b/.test(t);
    if (/\b(help|what can you do|what do you do|how does this work|commands|options)\b/.test(t)) bump("help", .95);
    if (/\b(should i (?:grade|send|sub(?:mit)?)|worth grading|is (?:it|this) worth (?:grading|sending)|grade (?:it|this|or sell)|send (?:it|this) (?:to|in) (?:psa|bgs|sgc)|grading worth|grade or (?:sell|hold))\b/.test(t)) bump("should_grade", .95);
    LISTS.forEach(function (l) { if (l[1].test(t)) { bump("lists", .9); if (!F.list) F.list = l[0]; } });
    if (F.list === "movers" && /\b(down|losers|dropping|falling|fallers|cooling|drops)\b/.test(t)) F.direction = "down"; else if (F.list === "movers") F.direction = "up";
    if (/\b(remove|delete|take (?:it |this )?off|drop|unwatch|stop watching)\b/.test(t) && /\bwatch ?list|watching\b/.test(t)) bump("watchlist_remove", .95);
    else if (/\b(add|put|save|throw)\b.*\bwatch ?list\b|\bwatch (?:this|it)\b|\bstart watching\b/.test(t)) bump("watchlist_add", .93);
    if (/\b(portfolio|my collection|my cards|my holdings|my stuff)\b/.test(t)) bump("portfolio_summary", /\b(up|down|worth|value|doing|summary|gain|loss|how much|total|performance|perform)\b/.test(t) ? .93 : .7);
    if (/\b(i (?:just )?(?:bought|picked up|got|paid|grabbed|won)|log (?:a |this |my |the )?(?:buy|purchase|card)|add (?:a |this |my )?(?:buy|purchase) |(?:add|put) (?:it |this )?(?:to|in) (?:my )?ledger|record (?:a |my )?(?:buy|purchase))\b/.test(t)) bump("ledger_add", .92);
    if (/\b(auction watch|watch (?:this|the) auction|snipe|sniper|last[- ]second bid|bid on (?:this|it)|set (?:a |my )?max bid|max bid)\b/.test(t)) bump("auction_watch_set", .95);   /* "snipe" kept as a spoken alias (pre-rename) */
    if (/\b(make (?:an |a )?offer|best offer|send (?:an )?offer|offer (?:them|him|her|the seller)?\s*\$?\d|lowball)\b/.test(t)) bump("best_offer", .94);
    if (/\b(buy (?:this|it|that)(?: now)?|purchase (?:this|it)|grab (?:this|it)|check ?out (?:this|it))\b/.test(t) && !/\b(should i buy|find|search|hunt)\b/.test(t)) bump("buy", .93);
    if (/\b(save (?:this |the |my |that )?(?:hunt|search)|gem hunt|save (?:it )?as (?:a )?(?:gem|hunt)|keep (?:hunting|looking) for|alert me when (?:one|a|it)|watch for (?:a|one))\b/.test(t)) bump("gem_hunt_save", .92);
    if (/\b(alerts?|notif(?:y|ications?)|boom)\b/.test(t) && /\b(settings?|turn|on|off|change|set up|setup|manage|mute|enable|disable|how|my)\b/.test(t) && !sc.gem_hunt_save) bump("alerts_settings", .9);
    var huntVerb = /\b(find|hunt|search(?: for)?|look(?:ing)? for|show me|any|listings?|deals? on|on ebay|for sale|i want|get me|need)\b/.test(t);
    if (huntVerb && cardish) bump("card_hunt", .88);
    else if (cardish && (pf.budget_max || pf.listing_type || pf.end_window || pf.seller_filters)) bump("card_hunt", .8);
    if (/\b(how much|what'?s .* worth|worth|price (?:of|on|for)|value (?:of|on)|comps? (?:for|on|of)|look ?up|report (?:on|for)|open (?:the )?report|pull up|check (?:on )?|tell me about|sold for)\b/.test(t)) bump("card_lookup", cardish || thisRef ? .9 : .55);
    else if (cardish && !huntVerb) bump("card_lookup", .7);
    // lists win over hunt for "show me new highs in prizm"
    if (sc.lists && sc.card_hunt && !pf.player) sc.card_hunt = .4;
    if (sc.lists && sc.card_lookup && !pf.player) sc.card_lookup = Math.min(sc.card_lookup, .4);
    if (sc.should_grade) { sc.card_lookup = Math.min(sc.card_lookup || 0, .5); }
    if (sc.auction_watch_set && /\bauction\b/.test(t)) sc.watchlist_add = Math.min(sc.watchlist_add || 0, .5);   /* "watch this auction" = Auction Watch, not the watchlist */
    if (sc.auction_watch_set || sc.best_offer || sc.buy) { sc.card_hunt = Math.min(sc.card_hunt || 0, .5); sc.card_lookup = Math.min(sc.card_lookup || 0, .45); }
    if (sc.portfolio_summary && sc.lists && !/\b(movers?|trending|picks?|searched|highs?)\b/.test(t)) sc.lists = .3;
    if (sc.ledger_add) { sc.card_lookup = Math.min(sc.card_lookup || 0, .45); sc.card_hunt = Math.min(sc.card_hunt || 0, .45); }
    if (sc.watchlist_add || sc.watchlist_remove) { sc.card_hunt = Math.min(sc.card_hunt || 0, .4); sc.card_lookup = Math.min(sc.card_lookup || 0, .45); sc.gem_hunt_save = Math.min(sc.gem_hunt_save || 0, .4); }
    var ranked = Object.keys(sc).map(function (k) { return [k, sc[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var top = ranked[0] || ["unknown", 0];
    // fields per intent
    if (top[0] === "lists") { if (pf.category) F.category = pf.category; if (pf.set) F.set = pf.set; if (/\btoday\b/.test(t)) F.period = "today"; }
    if (top[0] === "portfolio_summary") F.period = /\btoday\b/.test(t) ? "today" : /\b(this|past|last) week\b|\bweekly\b|\b7 days\b/.test(t) ? "week" : /\b(this|past|last) month\b|\b30 days\b/.test(t) ? "month" : /\b(this|past|last) year\b|\bytd\b|\b12 months\b/.test(t) ? "year" : "all";
    if (["auction_watch_set", "best_offer", "buy", "ledger_add"].indexOf(top[0]) > -1 && pf.budget_max) F[top[0] === "ledger_add" ? "price" : top[0] === "best_offer" ? "offer" : "max"] = pf.budget_max;
    if (top[0] === "ledger_add" && !F.price) { var pm = t.match(/\b(?:for|paid)\s*\$?\s*(\d+(?:\.\d+)?)/) || t.match(/\$\s*(\d+(?:\.\d+)?)/); if (pm) F.price = parseFloat(pm[1]); }
    if (top[0] === "best_offer" && !F.offer) { var om = t.match(/\$\s*(\d+(?:\.\d+)?)|\boffer\s*(\d+)/); if (om) F.offer = parseFloat(om[1] || om[2]); }
    if (["card_lookup", "card_hunt", "ledger_add", "watchlist_add", "watchlist_remove", "auction_watch_set", "best_offer", "buy", "gem_hunt_save", "should_grade"].indexOf(top[0]) > -1) {
      F.card = pf; F.target = cardish ? "named" : thisRef || ["should_grade", "watchlist_add", "watchlist_remove", "auction_watch_set", "best_offer", "buy"].indexOf(top[0]) > -1 ? "this" : "none";
      if (F.target === "this") F.needsCard = !ctx.currentCard;
    }
    if (top[0] === "card_hunt") F.ambiguities = p.ambiguities;
    var conf = top[1];
    if (ranked[1] && top[1] - ranked[1][1] < 0.1) conf = Math.min(conf, 0.5);
    var intent = conf >= 0.55 ? top[0] : "unknown";
    var alts = ranked.filter(function (r) { return r[1] >= 0.3; }).slice(0, 3).map(function (r) { return r[0]; });
    if (intent === "unknown" && alts.length < 2) alts = alts.concat(["card_hunt", "lists", "help"].filter(function (x) { return alts.indexOf(x) < 0; })).slice(0, 3);
    return { intent: intent, fields: F, confidence: Math.round(conf * 100) / 100, alternatives: intent === "unknown" ? alts : alts.slice(1) };
  }

  /* ---------- hunt over sample listings ---------- */
  var FEES = { ebayPct: 0.1325, ebayFixed: 0.40, shipOut: 5, taxPct: 0.07, gradeShip: 18 };
  function gradeFee(declared) { return declared < 500 ? 25 : declared < 1000 ? 75 : 150; }
  function netSale(p) { return p * (1 - FEES.ebayPct) - FEES.ebayFixed - FEES.shipOut; }
  function profitMath(L) {
    var buy = L.price, ship = L.shipping || 0, tax = Math.round(L.price * FEES.taxPct * 100) / 100, cost = buy + ship + tax, lines = [], ev, gradeCost = 0, byGrade = [];
    lines.push(["Buy price", buy], ["Shipping in", ship], ["Sales tax (7% sample)", tax]);
    if (L.raw) {
      var o = L.odds || {}, rest = Math.max(0, 1 - (o["10"] || 0) - (o["9"] || 0) - (o["8"] || 0));
      gradeCost = gradeFee(L.comps.psa10 || L.price) + FEES.gradeShip; lines.push(["PSA grading (sample tier)", gradeFee(L.comps.psa10 || L.price)], ["Ship + insure to grader", FEES.gradeShip]);
      byGrade = [["PSA 10", o["10"] || 0, L.comps.psa10], ["PSA 9", o["9"] || 0, L.comps.psa9], ["PSA 8", o["8"] || 0, L.comps.psa8], ["PSA 7 or lower", rest, Math.round(L.comps.raw * 0.8)]];
      ev = byGrade.reduce(function (s, g) { return s + g[1] * netSale(g[2]); }, 0);
    } else {
      var key = "psa" + Math.floor(L.grade); var comp = L.comps[key] || L.comps.psa9;
      byGrade = [[L.grade_company + " " + L.grade, 1, comp]]; ev = netSale(comp);
    }
    var total = cost + gradeCost, net = ev - total;
    return { lines: lines, cost: Math.round(total * 100) / 100, gradeCost: gradeCost, byGrade: byGrade.map(function (g) { return { grade: g[0], odds: g[1], comp: g[2], net: Math.round(netSale(g[2]) * 100) / 100 }; }),
      ev: Math.round(ev * 100) / 100, net: Math.round(net * 100) / 100, roi: total ? Math.round(net / total * 1000) / 10 : 0, rawNet: Math.round(netSale(L.comps.raw) * 100) / 100, fees: FEES, graded: !L.raw };
  }
  function idMatch(f, L) {
    var m = [], miss = [];
    var chk = function (k, ok, label) { (ok ? m : miss).push(label); };
    if (f.player) chk("player", L.player === f.player, f.player);
    if (f.year) chk("year", String(L.year).indexOf(String(f.year).slice(0, 4)) === 0, f.year);
    if (f.year_range) chk("year", +String(L.year).slice(0, 4) >= f.year_range[0] && +String(L.year).slice(0, 4) <= f.year_range[1], f.year_range.join("-"));
    if (f.brand) chk("brand", L.brand === f.brand, f.brand);
    if (f.set) chk("set", f.set === "Any Chrome" ? /chrome/i.test(L.set) : f.set === "Any Metal" ? /metal/i.test(L.set) : L.set === f.set, f.set);
    if (f.subset_insert) chk("subset_insert", L.subset_insert === f.subset_insert, f.subset_insert);
    if (f.card_number) chk("card_number", String(L.card_number).toUpperCase() === f.card_number, "#" + f.card_number);
    if (f.parallel_color) chk("parallel_color", f.parallel_color === "Any Refractor" ? /refractor/i.test(L.parallel_color || "") : (L.parallel_color || "Base") === f.parallel_color, f.parallel_color);
    if (f.serial_numbered) chk("serial_numbered", L.serial_numbered === f.serial_numbered, f.serial_numbered);
    if (f.rookie) chk("rookie", !!L.rookie, "RC");
    if (f.auto != null) chk("auto", !!L.auto === f.auto, f.auto ? "Auto" : "No auto");
    if (f.patch) chk("patch", !!L.patch, "Patch");
    if (f.raw === true) chk("raw", !!L.raw, "Raw");
    else if (f.grade_company || f.grade) chk("grade", !L.raw && (!f.grade_company || f.grade_company === "Any" || L.grade_company === f.grade_company) && (!f.grade || L.grade === f.grade), (f.grade_company && f.grade_company !== "Any" ? f.grade_company : "Graded") + (f.grade ? " " + f.grade : ""));
    if (f.category && !f.player) chk("category", L.category === f.category, f.category);
    if (f.keywords) { var kw = f.keywords.split(" ").filter(function (w) { return w.length > 2; }); if (kw.length) chk("keywords", kw.every(function (w) { return L.title.toLowerCase().indexOf(w) > -1; }), f.keywords); }
    return { ok: !miss.length, matched: m, missed: miss };
  }
  function minutesUntil(until, now) { now = now || new Date(); var d = new Date(now); if (/sun/.test(until)) { d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); } d.setHours(23, 59, 0, 0); return Math.max(0, Math.round((d - now) / 60000)); }
  function listingFilters(f, L, relax, now) {
    var m = [], miss = [];
    var chk = function (ok, label) { (ok ? m : miss).push(label); };
    if (f.budget_max && relax.indexOf("budget_max") < 0) chk(L.price + (L.shipping || 0) <= f.budget_max, "Under $" + f.budget_max);
    if (f.budget_max && relax.indexOf("budget_max") > -1) chk(L.price + (L.shipping || 0) <= f.budget_max * 1.25, "Budget +25%");
    if (f.listing_type && f.listing_type !== "any" && relax.indexOf("listing_type") < 0) chk(L.listing_type === f.listing_type, f.listing_type === "bin" ? "Buy It Now" : "Auction");
    if (f.end_window && relax.indexOf("end_window") < 0) { var lim = f.end_window.minutes || minutesUntil(f.end_window.until, now); chk(L.listing_type === "auction" && L.ends_in_min <= lim, f.end_window.label); }
    var s = f.seller_filters || {};
    if (relax.indexOf("seller_filters") < 0) {
      if (s.min_feedback_pct) chk(L.seller.feedback_pct >= s.min_feedback_pct, s.min_feedback_pct + "%+ feedback");
      if (s.top_rated) chk(!!L.seller.top_rated, "Top Rated"); if (s.us_only) chk(!!L.seller.us, "US only"); if (s.returns) chk(!!L.seller.returns, "Returns");
    }
    return { ok: !miss.length, matched: m, missed: miss };
  }
  function runHunt(f, listings, opts) {
    opts = opts || {};
    var hidden = { lot: 0, sealed: 0, reprint: 0, other: 0 }, cards = [];
    listings.forEach(function (L) { if (L.kind && L.kind !== "card") hidden[hidden[L.kind] != null ? L.kind : "other"]++; else cards.push(L); });
    var exact = cards.map(function (L) { return { L: L, id: idMatch(f, L) }; }).filter(function (x) { return x.id.ok; });
    var order = ["end_window", "seller_filters", "listing_type", "budget_max"], relax = [], pass, expanded = [];
    var run = function () { return exact.map(function (x) { return { L: x.L, id: x.id, lf: listingFilters(f, x.L, relax, opts.now) }; }).filter(function (x) { return x.lf.ok; }); };
    pass = run(); var strictCount = pass.length;
    for (var i = 0; i < order.length && pass.length < (opts.min || 3); i++) {
      var k = order[i]; if (!f[k] || (k === "listing_type" && f[k] === "any")) continue;
      var before = pass.length; relax.push(k); var next = run();
      if (next.length > before) { pass = next; expanded.push(k); } else relax.pop(); /* only keep relaxations that actually add cards */
    }
    var results = pass.map(function (x) {
      var pm = profitMath(x.L);
      var soft = (f.condition_notes || []).map(function (n) { var hit = (x.L.condition_notes || []).some(function (c) { return c.toLowerCase().indexOf(n.toLowerCase().split(" ")[0]) > -1; }); return { note: n, ok: hit }; });
      return { listing: x.L, matched: x.id.matched, filters: x.lf.matched, condition: soft, exact: true, outside: relax.slice(), profit: pm };
    }).sort(function (a, b) { return b.profit.net - a.profit.net; });
    return { results: results, expanded: expanded, hidden: hidden, strictCount: strictCount, exactCount: exact.length };
  }

  var API = { parseHunt: parseHunt, routeVoiceIntent: routeVoiceIntent, runHunt: runHunt, profitMath: profitMath, chipsFor: chipsFor, FEES: FEES };
  root.CH_VOICE_PARSE = API; root.routeVoiceIntent = routeVoiceIntent;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
