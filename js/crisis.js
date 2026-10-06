/* Crisis short-circuit for Ask. Care + 988 only. No methods. */
(function (root) {
  "use strict";
  var RE = /\b(988|suicid\w*|kill myself|killing myself|want to die|end my life|self[-\s]?harm|hurt myself)\b/i;
  function match(text) { return RE.test(String(text || "")); }
  function message() {
    return "If you are in crisis or thinking about hurting yourself, call or text 988 (Suicide & Crisis Lifeline). You are not alone.";
  }
  var api = { match: match, message: message };
  root.CH_CRISIS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
