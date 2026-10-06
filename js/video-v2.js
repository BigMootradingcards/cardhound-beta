/* CardHound local flags. Parse ?flags= from the page URL (comma or space separated).
   ?flags=calm is the local and TikTok preview switch. It is not the friends-beta default.
   Default look is unchanged until calm.css is linked on purpose. Do not turn calm on unless it is in the URL. */
(function (root) {
  "use strict";
  function parseFlags(search) {
    var q = String(search || "");
    var m = /(?:^|[?&])flags=([^&#]*)/.exec(q);
    if (!m || !m[1]) return [];
    var raw = m[1].replace(/\+/g, " ");
    try { raw = decodeURIComponent(raw); } catch (e) {}
    var seen = {};
    return raw.split(/[,\s]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(function (s) {
      if (!s || seen[s]) return false;
      seen[s] = 1;
      return true;
    });
  }
  function has(flags, name) { return (flags || []).indexOf(String(name || "").toLowerCase()) > -1; }
  function apply(doc, loc) {
    if (!doc || !doc.documentElement) return [];
    var flags = parseFlags(loc && loc.search);
    doc.documentElement.setAttribute("data-flags", flags.join(","));
    flags.forEach(function (f) { doc.documentElement.classList.add("flag-" + f); });
    var link = doc.getElementById ? doc.getElementById("ch-calm-css") : null;
    if (has(flags, "calm")) {
      doc.documentElement.classList.add("ch-calm");
      if (!link && doc.head && doc.createElement) {
        link = doc.createElement("link");
        link.id = "ch-calm-css";
        link.rel = "stylesheet";
        link.href = "css/calm.css";
        doc.head.appendChild(link);
      }
    } else if (link && link.parentNode) {
      link.parentNode.removeChild(link);
      doc.documentElement.classList.remove("ch-calm");
    }
    root.CH_FLAGS = flags;
    return flags;
  }
  var api = { parseFlags: parseFlags, has: has, apply: apply };
  root.CH_FLAGS_API = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document && root.location) apply(root.document, root.location);
})(typeof window !== "undefined" ? window : globalThis);
