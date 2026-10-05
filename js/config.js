/* CardHound config. Pick the data adapter in ONE line: "sample" | "file-import" | "licensed-feed" | "cardladder-user" (all but sample are stubs) */
window.CARDHOUND_CONFIG = { adapter: "sample" };

/* Growth feature flags (web/js/growth.js), all OFF by default. Builds turn them on from FEATURE_UPSELL / FEATURE_REFERRAL /
 * FEATURE_EBAY_PLACE_MAX (native: app/scripts/build-web.mjs; live server: cardhound/live_flags.py). Not URL-controllable. */
window.CH_FLAGS = window.CH_FLAGS || { upsell: false, referral: false, ebay_place_max: false };
