/* BYO Ladder sold-history parse + exact-card match (step 3).
 * User-provided rows only. No scrape. Live only when ≥1 setguard-kept sale matches the confirmed card.
 * Depends on CH_SETGUARD (load setguard.js first).
 */
(function (root) {
  "use strict";
  var SG = root.CH_SETGUARD;

  function splitCSVLine(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (q) {
        if (ch === '"') {
          if (line.charAt(i + 1) === '"') { cur += '"'; i++; }
          else q = false;
        } else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return String(s || "").trim(); });
  }

  function headerMap(cols) {
    var map = {};
    cols.forEach(function (c, i) {
      var k = String(c || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (/^(date|saledate|solddate)$/.test(k)) map.date = i;
      else if (/^(price|saleprice|soldprice|amount|sold)$/.test(k)) map.price = i;
      else if (/^(title|card|identity|description|name|item)$/.test(k)) map.title = i;
      else if (/^(grade|condition)$/.test(k)) map.grade = i;
      else if (/^(year)$/.test(k)) map.year = i;
      else if (/^(set|product|series)$/.test(k)) map.set = i;
      else if (/^(number|cardnumber|cardno|#)$/.test(k)) map.number = i;
      else if (/^(player|subject|athlete)$/.test(k)) map.player = i;
      else if (/^(parallel|variant|finish)$/.test(k)) map.variant = i;
    });
    return map;
  }

  function parsePrice(s) {
    var str = String(s || "");
    /* Prefer explicit money: $189 or 189.00 — never treat a bare year (2001) as price. */
    var m = str.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
    if (!m) m = str.match(/(?:^|[\s,;\|\—\–\-])([\d,]+\.\d{2})(?:$|[\s,;\|\—\–\-])/);
    if (!m) {
      /* CSV price column may be bare integer — only when the whole cell is numeric */
      if (/^\s*\$?\s*[\d,]+(?:\.\d{1,2})?\s*$/.test(str)) {
        m = str.match(/([\d,]+(?:\.\d{1,2})?)/);
      }
    }
    if (!m) return null;
    var n = parseFloat(m[1].replace(/,/g, ""));
    if (!(n > 0) || n > 1e7) return null;
    /* Reject 4-digit years mistaken as dollars when $ was absent and value looks like a year */
    if (n >= 1900 && n <= 2100 && Number.isInteger(n) && str.indexOf("$") < 0 && !/\.\d{2}/.test(m[0])) return null;
    return n;
  }

  function parseDate(s) {
    var m = String(s || "").match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{0,4})/i);
    return m ? m[1] : "";
  }

  function parseGrade(s) {
    var m = String(s || "").match(/\b((?:PSA|BGS|SGC|CGC)\s*\d+(?:\.\d)?(?:\s*PR)?|Raw(?:\s*\([^)]+\))?)\b/i);
    return m ? m[1].replace(/\s+/g, " ").trim() : "";
  }

  function structureIdentity(text, extras) {
    extras = extras || {};
    var parsed = SG && typeof SG.parseCardLine === "function"
      ? SG.parseCardLine(text, extras.variant || "")
      : { year: "", set: "", number: "", player: "", variant: "", name: text };
    if (extras.year) parsed.year = extras.year;
    if (extras.set) parsed.set = extras.set;
    if (extras.number) parsed.number = String(extras.number).replace(/^#/, "");
    if (extras.player) parsed.player = extras.player;
    if (extras.variant) parsed.variant = extras.variant;
    if (!parsed.variant && extras.variant === "") {
      /* leave empty — setguard treats missing variant carefully on the card side */
    }
    if (!parsed.variant) {
      var vGuess = String(text || "").match(/\b(Base(?:\s*\([^)]*\))?|Refractor|X-Fractor|Gold(?:\s*\/\d+)?|Silver|Prizm|Mojo|Shimmer|Wave|Atomic|Green(?:\s+Ice)?|Blue|Orange|Pink|Black|Red(?:\s*\/\d+)?)\b/i);
      if (vGuess) parsed.variant = vGuess[1];
    }
    if (!parsed.variant) parsed.variant = "Base";
    if (parsed.player) {
      parsed.player = String(parsed.player)
        .replace(/\b(Base|Refractor|Raw)\b/ig, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    return parsed;
  }

  function rowFromParts(opts) {
    var price = opts.price;
    if (!(price > 0)) return null;
    var identity = opts.identity || opts.title || "";
    var structured = structureIdentity(identity, {
      year: opts.year, set: opts.set, number: opts.number, player: opts.player, variant: opts.variant
    });
    if (!identity || identity.length < 3) {
      identity = [structured.year, structured.set, structured.number ? "#" + structured.number : "", structured.player]
        .filter(Boolean).join(" ") || "Sold row";
    }
    var grade = opts.grade || parseGrade(opts.raw || identity) || "Raw";
    return {
      identity: identity,
      title: identity,
      price: price,
      date: opts.date || "",
      raw: opts.raw || identity,
      year: structured.year || "",
      set: structured.set || "",
      number: structured.number || "",
      player: structured.player || "",
      variant: structured.variant || "Base",
      grade: grade,
      source: "ladder-hook"
    };
  }

  /** Parse user paste / CSV into structured pending sale rows. Drops unpriced lines. */
  function parseLadderSaleLines(text) {
    var rows = [];
    var lines = String(text || "").split(/\r?\n/).map(function (l) { return String(l).trim(); }).filter(Boolean);
    if (!lines.length) return rows;

    var firstCols = splitCSVLine(lines[0]);
    var looksHeader = firstCols.length >= 2 && firstCols.some(function (c) {
      return /^(date|price|sale|sold|title|card|grade)/i.test(String(c).replace(/[^a-z0-9]+/gi, "")) ||
        /date|price|title|card/i.test(c);
    }) && !parsePrice(lines[0]);

    if (looksHeader && firstCols.length >= 2) {
      var map = headerMap(firstCols);
      for (var i = 1; i < lines.length; i++) {
        var cols = splitCSVLine(lines[i]);
        if (!cols.length) continue;
        var price = map.price != null ? parsePrice(cols[map.price]) : null;
        if (price == null) {
          for (var j = 0; j < cols.length && price == null; j++) price = parsePrice(cols[j]);
        }
        if (price == null) continue;
        var title = map.title != null ? cols[map.title] : "";
        if (!title) {
          title = cols.filter(function (c, idx) {
            return idx !== map.price && idx !== map.date && idx !== map.grade && String(c).length > 3;
          }).join(" ");
        }
        var date = map.date != null ? (cols[map.date] || "") : parseDate(lines[i]);
        var grade = map.grade != null ? (cols[map.grade] || "") : parseGrade(lines[i]);
        var built = rowFromParts({
          identity: title,
          price: price,
          date: date || parseDate(title),
          grade: grade,
          year: map.year != null ? cols[map.year] : "",
          set: map.set != null ? cols[map.set] : "",
          number: map.number != null ? cols[map.number] : "",
          player: map.player != null ? cols[map.player] : "",
          variant: map.variant != null ? cols[map.variant] : "",
          raw: lines[i]
        });
        if (built) rows.push(built);
      }
      return rows;
    }

    lines.forEach(function (line) {
      if (line.charAt(0) === "#") return;
      if (/^(date|sale|price|card|title|sold)/i.test(line) && line.indexOf("$") < 0 && !/\d+\.\d{2}/.test(line)) return;
      var price = parsePrice(line);
      if (price == null) return;
      var date = parseDate(line);
      var grade = parseGrade(line);
      var identity = line;
      var pm = line.match(/\$\s*[\d,]+(?:\.\d{1,2})?/) || line.match(/(?:^|[\s,;\|])([\d,]+\.\d{2})(?:$|[\s,;\|])/);
      if (pm) identity = identity.replace(pm[0], " ");
      if (date) identity = identity.replace(date, " ");
      if (grade) identity = identity.replace(grade, " ");
      identity = identity.replace(/[|,;\t]+/g, " ").replace(/[—–\-]+/g, " ").replace(/\s+/g, " ").trim();
      var built = rowFromParts({ identity: identity, price: price, date: date, grade: grade, raw: line });
      if (built) rows.push(built);
    });
    return rows;
  }

  /** Map pending rows → sale objects for setguard.orderSales. */
  function pendingToSales(pendingRows) {
    return (pendingRows || []).map(function (r) {
      if (!r || !(r.price > 0)) return null;
      return {
        date: r.date || "",
        price: r.price,
        grade: r.grade || "Raw",
        type: "Sold",
        year: r.year || "",
        set: r.set || "",
        number: r.number || "",
        variant: r.variant || "Base",
        player: r.player || "",
        title: r.title || r.identity || "",
        identity: r.identity || r.title || "",
        source: "ladder-hook",
        live: true,
        excluded: false
      };
    }).filter(Boolean);
  }

  /** Keep only exact set/parallel matches for the confirmed card (newest first). */
  function matchLiveSales(pendingRows, card) {
    if (!SG || typeof SG.orderSales !== "function") return [];
    card = card || {};
    var sales = pendingToSales(pendingRows);
    return SG.orderSales(sales, card);
  }

  var api = {
    parseLadderSaleLines: parseLadderSaleLines,
    pendingToSales: pendingToSales,
    matchLiveSales: matchLiveSales,
    parsePrice: parsePrice,
    structureIdentity: structureIdentity
  };
  root.CH_LADDER_HOOK = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
