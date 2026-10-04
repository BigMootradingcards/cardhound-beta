/* Saved Gem Hunts + voice watchlist adds, stored ON THIS PHONE ONLY (localStorage "ch_gem_hunts", "ch_voice_watch"). Mixed into every adapter.
 *   getGemHunts() -> [{ id, q, fields, chips, created, sample:true }]   saveGemHunt(h) -> saved   deleteGemHunt(id)
 *   getVoiceWatch() -> [{ id, card }]   addVoiceWatch(card)   removeVoiceWatch(id) */
(function () {
  var rd = function (k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } };
  var wr = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var P = function (v) { return Promise.resolve(JSON.parse(JSON.stringify(v))); };
  window.CH_LOCAL_HUNTS = {
    getGemHunts: function () { return P(rd("ch_gem_hunts")); },
    saveGemHunt: function (h) { var a = rd("ch_gem_hunts"); h = Object.assign({ id: "gh" + Date.now(), created: new Date().toISOString(), sample: true }, h); a.unshift(h); wr("ch_gem_hunts", a.slice(0, 30)); return P(h); },
    deleteGemHunt: function (id) { wr("ch_gem_hunts", rd("ch_gem_hunts").filter(function (h) { return h.id !== id; })); return P(true); },
    getVoiceWatch: function () { return P(rd("ch_voice_watch")); },
    addVoiceWatch: function (card) { var a = rd("ch_voice_watch"); if (!a.some(function (w) { return w.card === card; })) a.unshift({ id: "vw" + Date.now(), card: card }); wr("ch_voice_watch", a); return P(a); },
    removeVoiceWatch: function (card) { wr("ch_voice_watch", rd("ch_voice_watch").filter(function (w) { return w.card !== card && w.id !== card; })); return P(true); }
  };
})();
