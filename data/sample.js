/* CardHound web demo: ALL SAMPLE DATA lives in this one file.
 * Every price, sales count, trend, pop figure and odds value below is INVENTED for the demo.
 * None of it is real market data (no Card Ladder, eBay or other source figures). Card names are real; numbers are not.
 * To swap in real data later, write a new adapter in js/data/ instead of editing the app.
 */
window.CARDHOUND_SAMPLE = {
 "meta": {
  "label": "Sample data",
  "footer": "Demo with sample data. Not real prices.",
  "asOf": "Sample snapshot, Oct 4, 2026",
  "categories": [
   "Disney",
   "Marvel",
   "Football",
   "Basketball",
   "Baseball",
   "Hockey",
   "Pokémon",
   "Magic",
   "Yu-Gi-Oh!",
   "Lorcana",
   "One Piece",
   "Star Wars",
   "Simpsons",
   "WWE",
   "Soccer",
   "Golf",
   "Racing",
   "Garbage Pail Kids",
   "Digimon",
   "Flesh and Blood"
  ],
  "sets": [
   "Panini Prizm",
   "Topps Chrome",
   "Topps Chrome Traded",
   "Upper Deck Young Guns",
   "Base Set",
   "Scarlet & Violet 151",
   "Evolving Skies",
   "Bowman Chrome",
   "Topps Update",
   "Alpha",
   "Revised",
   "Lord of the Rings",
   "Modern Horizons"
  ]
 },
 "reports": {
  "PUJOLS-01TCT-T247": {
   "id": "PUJOLS-01TCT-T247",
   "card": {
    "year": "2001",
    "set": "Topps Chrome Traded",
    "number": "T247",
    "player": "Albert Pujols",
    "variant": "Base (non-refractor)",
    "rookie": true,
    "category": "Baseball",
    "team": "St. Louis Cardinals",
    "id": "PUJOLS-01TCT-T247",
    "mustHave": [
     "Chrome",
     "T247"
    ],
    "mustNot": [
     "Refractor",
     "Reprint",
     "Lot",
     "Topps Traded (non-Chrome)"
    ]
   },
   "status": "Sample report",
   "asOf": "Sample snapshot, Oct 4, 2026",
   "raw": {
    "w30": {
     "n": 14,
     "low": 158,
     "median": 184,
     "high": 219
    },
    "w90": {
     "n": 38,
     "median": 176
    },
    "w365": {
     "n": 141,
     "median": 162
    },
    "last": {
     "date": "Sep 28",
     "price": 189
    }
   },
   "graded": [
    {
     "grade": "PSA 10",
     "w30": {
      "n": 4,
      "low": 1840,
      "median": 1975,
      "high": 2240
     },
     "w90": {
      "n": 11,
      "median": 1890
     },
     "thin": true,
     "last": {
      "date": "Sep 21",
      "price": 2010
     }
    },
    {
     "grade": "PSA 9",
     "w30": {
      "n": 11,
      "low": 470,
      "median": 525,
      "high": 585
     },
     "w90": {
      "n": 29,
      "median": 498
     },
     "thin": false,
     "last": {
      "date": "Sep 30",
      "price": 585
     }
    },
    {
     "grade": "PSA 8",
     "w30": {
      "n": 9,
      "low": 228,
      "median": 255,
      "high": 290
     },
     "w90": {
      "n": 24,
      "median": 247
     },
     "thin": false,
     "last": {
      "date": "Sep 26",
      "price": 262
     }
    },
    {
     "grade": "PSA 7",
     "w30": {
      "n": 6,
      "low": 160,
      "median": 175,
      "high": 198
     },
     "w90": {
      "n": 17,
      "median": 171
     },
     "thin": false,
     "last": {
      "date": "Sep 19",
      "price": 181
     }
    }
   ],
   "sales": [
    {
     "date": "Sep 30",
     "grade": "PSA 9",
     "price": 585,
     "type": "Auction"
    },
    {
     "date": "Sep 28",
     "grade": "Raw",
     "price": 189,
     "type": "Auction"
    },
    {
     "date": "Sep 27",
     "grade": "Raw",
     "price": 176,
     "type": "Buy It Now"
    },
    {
     "date": "Sep 26",
     "grade": "PSA 8",
     "price": 262,
     "type": "Best Offer"
    },
    {
     "date": "Sep 24",
     "grade": "Raw",
     "price": 199,
     "type": "Auction"
    },
    {
     "date": "Sep 21",
     "grade": "PSA 10",
     "price": 2010,
     "type": "Auction"
    }
   ],
   "dropped": [
    {
     "date": "Sep 25",
     "price": 96,
     "why": "Title says Topps Traded (non-Chrome)"
    },
    {
     "date": "Sep 22",
     "price": 410,
     "why": "Refractor, not base"
    }
   ],
   "pop": {
    "psa10": 1210,
    "psa9": 6480,
    "total": 14900
   },
   "fees": {
    "ebayPct": 0.1325,
    "ebayFixed": 0.4,
    "shipIns": 28,
    "tiers": {
     "PSA 7": 60,
     "PSA 8": 60,
     "PSA 9": 60,
     "PSA 10": 160
    },
    "tierNames": {
     "PSA 7": "Standard",
     "PSA 8": "Standard",
     "PSA 9": "Standard",
     "PSA 10": "Express"
    }
   },
   "odds": {
    "PSA 10": 0.15,
    "PSA 9": 0.4,
    "PSA 8": 0.3,
    "PSA 7": 0.15
   },
   "outlook": [
    {
     "k": "Championship ring",
     "v": "Yes, 2006 and 2011 (verify before publishing)"
    },
    {
     "k": "Injury Potential Down",
     "v": "n.a. (retired player)"
    },
    {
     "k": "Catalyst",
     "v": "Hall of Fame ballot eligibility, about 2028 (estimate, verify)"
    }
   ],
   "risks": [
    "PSA 10 comps are THIN: 4 sample sales in 30 days. Treat the 10 price as soft.",
    "Chrome Traded centering is often off and surfaces show print lines. Check under light before you submit.",
    "Base vs Refractor: refractor copies sell higher and get mixed into searches. Confirm the back and the shine.",
    "Reprints and fakes exist for this rookie. Check the font, the gloss and the card stock.",
    "Grading takes weeks. Prices can move while the card is at PSA."
   ],
   "series": {
    "Raw": [
     148,
     155.0,
     147.0,
     155.0,
     146.0,
     147.0,
     157.0,
     153.0,
     155.0,
     152.0,
     159.0,
     156.0,
     162.0,
     164.0,
     150.0,
     166.0,
     157.0,
     163.0,
     159.0,
     158.0,
     168.0,
     172.0,
     156.0,
     163.0,
     170.0,
     172.0,
     176.0,
     167.0,
     159.0,
     177.0,
     178.0,
     170.0,
     170.0,
     170.0,
     178.0,
     167.0,
     166.0,
     184.0,
     167.0,
     182.0,
     180.0,
     184.0,
     186.0,
     169.0,
     185.0,
     169.0,
     172.0,
     183.0,
     172.0,
     187.0,
     193.0,
     184
    ],
    "PSA 9": [
     430,
     433.0,
     431.0,
     447.0,
     420.0,
     431.0,
     461.0,
     429.0,
     434.0,
     460.0,
     426.0,
     452.0,
     475.0,
     444.0,
     448.0,
     473.0,
     448.0,
     463.0,
     466.0,
     443.0,
     463.0,
     476.0,
     450.0,
     458.0,
     493.0,
     484.0,
     458.0,
     467.0,
     481.0,
     478.0,
     486.0,
     497.0,
     500.0,
     485.0,
     488.0,
     471.0,
     487.0,
     516.0,
     481.0,
     502.0,
     489.0,
     520.0,
     493.0,
     508.0,
     500.0,
     534.0,
     496.0,
     524.0,
     525.0,
     542.0,
     522.0,
     525
    ],
    "PSA 10": [
     1720,
     1618.0,
     1753.0,
     1837.0,
     1631.0,
     1629.0,
     1774.0,
     1734.0,
     1812.0,
     1687.0,
     1758.0,
     1828.0,
     1734.0,
     1688.0,
     1685.0,
     1711.0,
     1722.0,
     1844.0,
     1816.0,
     1807.0,
     1772.0,
     1883.0,
     1917.0,
     1960.0,
     1825.0,
     1744.0,
     1741.0,
     1746.0,
     1839.0,
     1966.0,
     1886.0,
     1943.0,
     1848.0,
     1956.0,
     1839.0,
     1976.0,
     1790.0,
     1960.0,
     1829.0,
     1926.0,
     1906.0,
     1877.0,
     1994.0,
     1928.0,
     1976.0,
     1876.0,
     1984.0,
     1929.0,
     1926.0,
     1955.0,
     2054.0,
     1975
    ]
   }
  }
 },
 "candidates": [
  {
   "id": "PUJOLS-01TCT-T247",
   "name": "2001 Topps Chrome Traded #T247 Albert Pujols",
   "variant": "Base (non-refractor) · Rookie",
   "score": 94,
   "hasReport": true
  },
  {
   "id": "PUJOLS-01TCT-T247-REF",
   "name": "2001 Topps Chrome Traded #T247 Albert Pujols",
   "variant": "Refractor · Rookie",
   "score": 71,
   "hasReport": false
  },
  {
   "id": "PUJOLS-01TT-T247",
   "name": "2001 Topps Traded #T247 Albert Pujols",
   "variant": "Base (paper, non-Chrome) · Rookie",
   "score": 48,
   "hasReport": false
  }
 ],
 "movers": [
  {
   "id": "m1",
   "card": "2003 Topps Chrome #111 LeBron James RC",
   "category": "Basketball",
   "set": "Topps Chrome",
   "grade": "PSA 9",
   "pct": 18.4,
   "sales": 6,
   "base": 41,
   "median": 81,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    100.7,
    100.6,
    102.7,
    102.3,
    103.9,
    104.8,
    104.3,
    105.8,
    105.3,
    106.5,
    106.1,
    105.7,
    118.4
   ]
  },
  {
   "id": "m2",
   "card": "2018 Panini Prizm #280 Luka Doncic RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "pct": 12.7,
   "sales": 5,
   "base": 37,
   "median": 126,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    102.3,
    101.7,
    101.5,
    103.1,
    106.0,
    107.4,
    108.0,
    111.2,
    110.2,
    112.9,
    113.0,
    112.4,
    112.7
   ]
  },
  {
   "id": "m3",
   "card": "2023 Panini Prizm #136 Victor Wembanyama RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "grade": "Raw",
   "pct": 9.6,
   "sales": 11,
   "base": 88,
   "median": 141,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    99.9,
    102.0,
    101.4,
    102.5,
    103.8,
    104.0,
    105.0,
    103.9,
    102.7,
    102.2,
    103.7,
    104.2,
    109.6
   ]
  },
  {
   "id": "m4",
   "card": "2019 Panini Prizm #248 Zion Williamson RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "pct": -11.2,
   "sales": 4,
   "base": 29,
   "median": 746,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    99.5,
    98.4,
    96.8,
    97.1,
    97.1,
    95.2,
    94.7,
    94.0,
    94.7,
    94.8,
    93.1,
    94.2,
    88.8
   ]
  },
  {
   "id": "m5",
   "card": "1996-97 Topps Chrome #138 Kobe Bryant RC",
   "category": "Basketball",
   "set": "Topps Chrome",
   "grade": "PSA 9",
   "pct": -4.1,
   "sales": 3,
   "base": 22,
   "median": 1521,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    99.3,
    100.1,
    98.3,
    98.0,
    95.8,
    96.1,
    96.9,
    96.9,
    98.1,
    97.0,
    97.5,
    97.6,
    95.9
   ]
  },
  {
   "id": "m6",
   "card": "2020 Panini Prizm Anthony Edwards RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "pct": 24.9,
   "sales": 2,
   "base": 6,
   "median": 318,
   "thin": true,
   "thinWhy": "2 sales today (needs 3); 6 in prior 30 days (needs 10)",
   "spark": [
    100.0,
    101.7,
    105.1,
    109.1,
    111.1,
    114.0,
    114.1,
    117.2,
    120.2,
    125.0,
    129.0,
    130.4,
    132.2,
    124.9
   ]
  },
  {
   "id": "m7",
   "card": "2001 Topps Chrome Traded #T247 Albert Pujols RC",
   "category": "Baseball",
   "set": "Topps Chrome Traded",
   "grade": "Raw",
   "pct": 7.8,
   "sales": 4,
   "base": 31,
   "median": 90,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    98.6,
    99.0,
    98.2,
    97.3,
    96.0,
    97.7,
    96.8,
    96.3,
    96.4,
    98.5,
    97.4,
    97.8,
    107.8
   ]
  },
  {
   "id": "m8",
   "card": "2011 Topps Update #US175 Mike Trout RC",
   "category": "Baseball",
   "set": "Topps Update",
   "grade": "PSA 9",
   "pct": -6.3,
   "sales": 5,
   "base": 44,
   "median": 1413,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    101.1,
    102.0,
    103.1,
    101.6,
    100.7,
    99.7,
    100.8,
    102.2,
    100.2,
    98.4,
    96.8,
    95.3,
    93.7
   ]
  },
  {
   "id": "m9",
   "card": "2018 Topps Chrome Shohei Ohtani RC",
   "category": "Baseball",
   "set": "Topps Chrome",
   "grade": "PSA 10",
   "pct": 14.2,
   "sales": 7,
   "base": 52,
   "median": 125,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    101.5,
    101.6,
    100.6,
    101.3,
    101.9,
    103.3,
    106.4,
    108.4,
    109.6,
    111.4,
    113.4,
    112.5,
    114.2
   ]
  },
  {
   "id": "m10",
   "card": "2022 Topps Chrome Update Julio Rodriguez RC",
   "category": "Baseball",
   "set": "Topps Chrome",
   "grade": "Raw",
   "pct": -9.8,
   "sales": 6,
   "base": 34,
   "median": 46,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    100.4,
    101.2,
    101.7,
    100.5,
    99.3,
    96.9,
    96.7,
    94.2,
    91.8,
    90.0,
    88.0,
    86.8,
    90.2
   ]
  },
  {
   "id": "m11",
   "card": "2023 Bowman Chrome Prospects Jackson Holliday Auto",
   "category": "Baseball",
   "set": "Bowman Chrome",
   "grade": "Raw",
   "pct": 31.5,
   "sales": 1,
   "base": 4,
   "median": 501,
   "thin": true,
   "thinWhy": "1 sale today (needs 3); 4 in prior 30 days (needs 10)",
   "spark": [
    100.0,
    100.3,
    101.3,
    102.0,
    103.9,
    104.4,
    108.5,
    111.7,
    112.8,
    114.3,
    116.4,
    118.5,
    119.5,
    131.5
   ]
  },
  {
   "id": "m12",
   "card": "2017 Panini Prizm #269 Patrick Mahomes RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "pct": 5.9,
   "sales": 4,
   "base": 26,
   "median": 427,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    102.5,
    102.8,
    103.2,
    101.9,
    100.7,
    100.5,
    99.9,
    101.8,
    100.8,
    99.2,
    101.5,
    102.1,
    105.9
   ]
  },
  {
   "id": "m13",
   "card": "2020 Panini Prizm #307 Joe Burrow RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "pct": -13.6,
   "sales": 5,
   "base": 33,
   "median": 275,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    99.1,
    96.1,
    95.2,
    96.2,
    96.6,
    96.4,
    94.4,
    92.9,
    90.6,
    90.7,
    89.9,
    90.0,
    86.4
   ]
  },
  {
   "id": "m14",
   "card": "2022 Panini Prizm #353 Brock Purdy RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "pct": 16.1,
   "sales": 8,
   "base": 47,
   "median": 781,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    100.1,
    102.6,
    106.0,
    108.9,
    111.6,
    114.5,
    117.1,
    117.2,
    118.7,
    119.5,
    118.6,
    117.7,
    116.1
   ]
  },
  {
   "id": "m15",
   "card": "2023 Panini Prizm C.J. Stroud RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "Raw",
   "pct": -7.4,
   "sales": 9,
   "base": 61,
   "median": 323,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    98.4,
    98.7,
    100.0,
    99.2,
    100.5,
    101.9,
    103.3,
    102.1,
    100.3,
    98.6,
    96.8,
    95.1,
    92.6
   ]
  },
  {
   "id": "m16",
   "card": "2018 Panini Prizm Josh Allen RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "PSA 9",
   "pct": -21.0,
   "sales": 2,
   "base": 8,
   "median": 286,
   "thin": true,
   "thinWhy": "2 sales today (needs 3); 8 in prior 30 days (needs 10)",
   "spark": [
    100.0,
    100.1,
    99.9,
    98.2,
    97.2,
    96.9,
    93.6,
    92.7,
    92.8,
    92.4,
    91.9,
    90.4,
    87.7,
    79.0
   ]
  },
  {
   "id": "m17",
   "card": "2015-16 Upper Deck Young Guns #201 Connor McDavid",
   "category": "Hockey",
   "set": "Upper Deck Young Guns",
   "grade": "PSA 9",
   "pct": 6.6,
   "sales": 4,
   "base": 27,
   "median": 158,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    99.8,
    101.6,
    104.1,
    104.2,
    104.3,
    106.8,
    108.3,
    107.4,
    106.2,
    105.2,
    107.5,
    109.5,
    106.6
   ]
  },
  {
   "id": "m18",
   "card": "2023-24 Upper Deck Young Guns #451 Connor Bedard",
   "category": "Hockey",
   "set": "Upper Deck Young Guns",
   "grade": "Raw",
   "pct": -10.5,
   "sales": 7,
   "base": 58,
   "median": 116,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    100.6,
    101.8,
    101.6,
    100.2,
    99.6,
    97.2,
    94.5,
    95.6,
    95.4,
    94.7,
    95.7,
    94.6,
    89.5
   ]
  },
  {
   "id": "m19",
   "card": "2005-06 Upper Deck Young Guns #201 Sidney Crosby",
   "category": "Hockey",
   "set": "Upper Deck Young Guns",
   "grade": "PSA 8",
   "pct": 3.2,
   "sales": 3,
   "base": 12,
   "median": 1271,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    101.6,
    100.6,
    99.8,
    99.2,
    98.4,
    99.0,
    98.2,
    98.1,
    96.8,
    98.8,
    98.4,
    98.5,
    103.2
   ]
  },
  {
   "id": "m20",
   "card": "1999 Pokémon Base Set Charizard Holo #4",
   "category": "Pokémon",
   "set": "Base Set",
   "grade": "PSA 7",
   "pct": 8.9,
   "sales": 5,
   "base": 39,
   "median": 94,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    102.4,
    102.7,
    105.2,
    106.0,
    106.8,
    107.7,
    106.2,
    106.7,
    106.0,
    104.5,
    106.6,
    105.8,
    108.9
   ]
  },
  {
   "id": "m21",
   "card": "2023 Scarlet & Violet 151 Charizard ex #199",
   "category": "Pokémon",
   "set": "Scarlet & Violet 151",
   "grade": "PSA 10",
   "pct": -8.7,
   "sales": 6,
   "base": 45,
   "median": 215,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    100.3,
    99.8,
    98.4,
    97.9,
    97.4,
    97.9,
    95.7,
    95.3,
    93.6,
    92.1,
    92.6,
    92.0,
    91.3
   ]
  },
  {
   "id": "m22",
   "card": "2023 Scarlet & Violet 151 Mew ex #205",
   "category": "Pokémon",
   "set": "Scarlet & Violet 151",
   "grade": "PSA 10",
   "pct": 11.3,
   "sales": 5,
   "base": 30,
   "median": 81,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    102.0,
    104.6,
    105.3,
    106.7,
    107.6,
    108.6,
    110.5,
    111.2,
    112.3,
    113.2,
    116.3,
    118.3,
    111.3
   ]
  },
  {
   "id": "m23",
   "card": "2021 Evolving Skies Umbreon VMAX #215",
   "category": "Pokémon",
   "set": "Evolving Skies",
   "grade": "Raw",
   "pct": 19.7,
   "sales": 9,
   "base": 73,
   "median": 865,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    103.4,
    103.9,
    105.7,
    109.3,
    112.5,
    112.5,
    112.4,
    113.9,
    113.5,
    114.0,
    113.7,
    116.2,
    119.7
   ]
  },
  {
   "id": "m24",
   "card": "1999 Pokémon Base Set Blastoise Holo #2",
   "category": "Pokémon",
   "set": "Base Set",
   "grade": "PSA 8",
   "pct": -5.2,
   "sales": 2,
   "base": 7,
   "median": 145,
   "thin": true,
   "thinWhy": "2 sales today (needs 3); 7 in prior 30 days (needs 10)",
   "spark": [
    100.0,
    101.3,
    99.4,
    99.9,
    100.2,
    98.3,
    99.5,
    101.0,
    99.4,
    100.9,
    100.1,
    99.6,
    101.3,
    94.8
   ]
  },
  {
   "id": "m25",
   "card": "1993 Alpha Lightning Bolt",
   "category": "Magic",
   "set": "Alpha",
   "grade": "Raw",
   "pct": 4.4,
   "sales": 3,
   "base": 14,
   "median": 37,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    98.9,
    99.0,
    99.4,
    99.0,
    98.1,
    97.7,
    98.9,
    97.3,
    97.8,
    97.9,
    96.3,
    95.9,
    104.4
   ]
  },
  {
   "id": "m26",
   "card": "1994 Revised Underground Sea",
   "category": "Magic",
   "set": "Revised",
   "grade": "Raw",
   "pct": -3.6,
   "sales": 4,
   "base": 19,
   "median": 277,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    99.8,
    97.7,
    99.4,
    100.3,
    102.0,
    100.1,
    98.8,
    96.6,
    97.5,
    96.3,
    94.5,
    93.9,
    96.4
   ]
  },
  {
   "id": "m27",
   "card": "2023 The Lord of the Rings The One Ring (Borderless)",
   "category": "Magic",
   "set": "Lord of the Rings",
   "grade": "PSA 10",
   "pct": -15.9,
   "sales": 3,
   "base": 11,
   "median": 928,
   "thin": false,
   "thinWhy": "",
   "spark": [
    100.0,
    100.1,
    97.9,
    95.2,
    95.8,
    94.9,
    94.5,
    91.7,
    88.9,
    88.5,
    87.1,
    84.5,
    85.0,
    84.1
   ]
  },
  {
   "id": "m28",
   "card": "2019 Modern Horizons Force of Negation (Foil)",
   "category": "Magic",
   "set": "Modern Horizons",
   "grade": "Raw",
   "pct": 27.3,
   "sales": 1,
   "base": 3,
   "median": 523,
   "thin": true,
   "thinWhy": "1 sale today (needs 3); 3 in prior 30 days (needs 10)",
   "spark": [
    100.0,
    103.4,
    103.7,
    107.5,
    107.8,
    111.7,
    113.8,
    115.4,
    118.1,
    122.7,
    124.1,
    124.7,
    127.5,
    127.3
   ]
  }
 ],
 "picks": [
  {
   "id": "p1",
   "rating": "BUY",
   "card": "2001 Topps Chrome Traded #T247 Albert Pujols RC",
   "category": "Baseball",
   "set": "Topps Chrome Traded",
   "grade": "Raw",
   "why": "Raw-to-grade math clears fees even at PSA 9",
   "conf": "High",
   "buyTarget": 147,
   "sellTarget": 199
  },
  {
   "id": "p2",
   "rating": "BUY",
   "card": "2023 Panini Prizm #136 Victor Wembanyama RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "grade": "Raw",
   "why": "Asks sitting about 62% of the sample comp",
   "conf": "Medium",
   "buyTarget": 94,
   "sellTarget": 127
  },
  {
   "id": "p3",
   "rating": "BUY",
   "card": "2021 Evolving Skies Umbreon VMAX #215",
   "category": "Pokémon",
   "set": "Evolving Skies",
   "grade": "Raw",
   "why": "Steady volume and a rising 90-day median",
   "conf": "Medium",
   "buyTarget": 412,
   "sellTarget": 556
  },
  {
   "id": "p4",
   "rating": "BUY",
   "card": "2015-16 Upper Deck Young Guns #201 Connor McDavid",
   "category": "Hockey",
   "set": "Upper Deck Young Guns",
   "grade": "PSA 9",
   "why": "Below its 365-day median with strong sales count",
   "conf": "Medium",
   "buyTarget": 608,
   "sellTarget": 821
  },
  {
   "id": "p5",
   "rating": "BUY",
   "card": "2017 Panini Prizm #269 Patrick Mahomes RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "PSA 9",
   "why": "Spread to PSA 10 is wide; 9s look cheap",
   "conf": "Low",
   "buyTarget": 372,
   "sellTarget": 502
  },
  {
   "id": "p6",
   "rating": "HOLD",
   "card": "2003 Topps Chrome #111 LeBron James RC",
   "category": "Basketball",
   "set": "Topps Chrome",
   "grade": "PSA 9",
   "why": "Trend up; no sell trigger hit",
   "conf": "High",
   "buyTarget": 224,
   "sellTarget": 302
  },
  {
   "id": "p7",
   "rating": "HOLD",
   "card": "1999 Pokémon Base Set Charizard Holo #4",
   "category": "Pokémon",
   "set": "Base Set",
   "grade": "PSA 7",
   "why": "Flat 30 vs 90 days; wait for a buy target",
   "conf": "Medium",
   "buyTarget": 704,
   "sellTarget": 950
  },
  {
   "id": "p8",
   "rating": "HOLD",
   "card": "2018 Topps Chrome Shohei Ohtani RC",
   "category": "Baseball",
   "set": "Topps Chrome",
   "grade": "PSA 10",
   "why": "Momentum positive; hold through the season",
   "conf": "Medium",
   "buyTarget": 48,
   "sellTarget": 65
  },
  {
   "id": "p9",
   "rating": "HOLD",
   "card": "1993 Alpha Lightning Bolt",
   "category": "Magic",
   "set": "Alpha",
   "grade": "Raw",
   "why": "Thin but stable sales; no edge either way",
   "conf": "Low",
   "buyTarget": 688,
   "sellTarget": 929
  },
  {
   "id": "p10",
   "rating": "HOLD",
   "card": "2022 Panini Prizm #353 Brock Purdy RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "why": "Up on volume; let it run to the sell target",
   "conf": "Medium",
   "buyTarget": 112,
   "sellTarget": 151
  },
  {
   "id": "p11",
   "rating": "SELL",
   "card": "2019 Panini Prizm #248 Zion Williamson RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "why": "Trend DOWN for 90 days; injury risk estimate high",
   "conf": "Medium",
   "buyTarget": 112,
   "sellTarget": 151
  },
  {
   "id": "p12",
   "rating": "SELL",
   "card": "2020 Panini Prizm #307 Joe Burrow RC",
   "category": "Football",
   "set": "Panini Prizm",
   "grade": "PSA 10",
   "why": "30-day median 14% under 90-day",
   "conf": "Medium",
   "buyTarget": 224,
   "sellTarget": 302
  },
  {
   "id": "p13",
   "rating": "SELL",
   "card": "2023 The Lord of the Rings The One Ring (Borderless)",
   "category": "Magic",
   "set": "Lord of the Rings",
   "grade": "PSA 10",
   "why": "Supply rising, sales thinning",
   "conf": "Low",
   "buyTarget": 688,
   "sellTarget": 929
  },
  {
   "id": "p14",
   "rating": "SELL",
   "card": "2023 Scarlet & Violet 151 Charizard ex #199",
   "category": "Pokémon",
   "set": "Scarlet & Violet 151",
   "grade": "PSA 10",
   "why": "Pop growing faster than demand",
   "conf": "Low",
   "buyTarget": 48,
   "sellTarget": 65
  },
  {
   "id": "p15",
   "rating": "SELL",
   "card": "2023-24 Upper Deck Young Guns #451 Connor Bedard",
   "category": "Hockey",
   "set": "Upper Deck Young Guns",
   "grade": "Raw",
   "why": "Raw copies sliding; grade or sell",
   "conf": "Medium",
   "buyTarget": 224,
   "sellTarget": 302
  }
 ],
 "searched": [
  {
   "id": "s1",
   "card": "2023 Panini Prizm #136 Victor Wembanyama RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "lookups": 1235,
   "users": 760,
   "change": -3,
   "spark": [
    100.0,
    95.1,
    98.2,
    95.1,
    91.8,
    89.9,
    85.9,
    83.7,
    84.6,
    96.0
   ]
  },
  {
   "id": "s2",
   "card": "1999 Pokémon Base Set Charizard Holo #4",
   "category": "Pokémon",
   "set": "Base Set",
   "lookups": 1107,
   "users": 628,
   "change": 2,
   "spark": [
    100.0,
    99.1,
    96.4,
    92.8,
    92.4,
    87.1,
    89.4,
    90.9,
    86.3,
    84.4
   ]
  },
  {
   "id": "s3",
   "card": "2001 Topps Chrome Traded #T247 Albert Pujols RC",
   "category": "Baseball",
   "set": "Topps Chrome Traded",
   "lookups": 993,
   "users": 664,
   "change": -1,
   "spark": [
    100.0,
    102.4,
    102.7,
    106.4,
    105.4,
    111.2,
    116.2,
    119.2,
    121.2,
    121.8
   ]
  },
  {
   "id": "s4",
   "card": "2018 Topps Chrome Shohei Ohtani RC",
   "category": "Baseball",
   "set": "Topps Chrome",
   "lookups": 849,
   "users": 621,
   "change": -3,
   "spark": [
    100.0,
    104.3,
    100.9,
    104.0,
    108.4,
    112.0,
    118.4,
    121.6,
    118.4,
    112.0
   ]
  },
  {
   "id": "s5",
   "card": "2017 Panini Prizm #269 Patrick Mahomes RC",
   "category": "Football",
   "set": "Panini Prizm",
   "lookups": 743,
   "users": 551,
   "change": -2,
   "spark": [
    100.0,
    103.8,
    108.5,
    113.3,
    119.0,
    122.7,
    120.9,
    128.3,
    135.5,
    129.3
   ]
  },
  {
   "id": "s6",
   "card": "2021 Evolving Skies Umbreon VMAX #215",
   "category": "Pokémon",
   "set": "Evolving Skies",
   "lookups": 639,
   "users": 435,
   "change": 2,
   "spark": [
    100.0,
    102.4,
    108.1,
    114.5,
    114.5,
    120.4,
    120.4,
    125.3,
    128.0,
    123.5
   ]
  },
  {
   "id": "s7",
   "card": "2003 Topps Chrome #111 LeBron James RC",
   "category": "Basketball",
   "set": "Topps Chrome",
   "lookups": 505,
   "users": 369,
   "change": 0,
   "spark": [
    100.0,
    103.9,
    108.2,
    106.8,
    106.1,
    106.5,
    112.0,
    113.0,
    116.8,
    124.9
   ]
  },
  {
   "id": "s8",
   "card": "2023-24 Upper Deck Young Guns #451 Connor Bedard",
   "category": "Hockey",
   "set": "Upper Deck Young Guns",
   "lookups": 398,
   "users": 240,
   "change": 5,
   "spark": [
    100.0,
    95.2,
    93.2,
    93.1,
    89.3,
    87.2,
    87.6,
    89.9,
    88.5,
    81.5
   ]
  },
  {
   "id": "s9",
   "card": "2022 Panini Prizm #353 Brock Purdy RC",
   "category": "Football",
   "set": "Panini Prizm",
   "lookups": 315,
   "users": 203,
   "change": 0,
   "spark": [
    100.0,
    103.6,
    108.8,
    108.9,
    107.0,
    104.6,
    109.7,
    107.2,
    108.6,
    104.8
   ]
  },
  {
   "id": "s10",
   "card": "2023 Scarlet & Violet 151 Charizard ex #199",
   "category": "Pokémon",
   "set": "Scarlet & Violet 151",
   "lookups": 270,
   "users": 199,
   "change": 1,
   "spark": [
    100.0,
    102.8,
    102.3,
    100.1,
    100.4,
    102.0,
    107.2,
    107.9,
    106.0,
    114.2
   ]
  },
  {
   "id": "s11",
   "card": "1993 Alpha Lightning Bolt",
   "category": "Magic",
   "set": "Alpha",
   "lookups": 238,
   "users": 150,
   "change": 1,
   "spark": [
    100.0,
    99.0,
    95.7,
    94.3,
    93.0,
    91.7,
    91.0,
    95.1,
    92.5,
    102.1
   ]
  },
  {
   "id": "s12",
   "card": "2011 Topps Update #US175 Mike Trout RC",
   "category": "Baseball",
   "set": "Topps Update",
   "lookups": 212,
   "users": 127,
   "change": 2,
   "spark": [
    100.0,
    104.8,
    105.8,
    104.5,
    103.8,
    101.6,
    97.3,
    93.6,
    96.7,
    100.5
   ]
  },
  {
   "id": "s13",
   "card": "2015-16 Upper Deck Young Guns #201 Connor McDavid",
   "category": "Hockey",
   "set": "Upper Deck Young Guns",
   "lookups": 195,
   "users": 116,
   "change": 0,
   "spark": [
    100.0,
    98.6,
    101.6,
    104.7,
    104.4,
    100.0,
    102.9,
    102.3,
    106.4,
    103.4
   ]
  },
  {
   "id": "s14",
   "card": "2018 Panini Prizm #280 Luka Doncic RC",
   "category": "Basketball",
   "set": "Panini Prizm",
   "lookups": 158,
   "users": 89,
   "change": -2,
   "spark": [
    100.0,
    102.9,
    104.8,
    103.2,
    99.2,
    103.7,
    100.5,
    100.7,
    99.7,
    104.3
   ]
  },
  {
   "id": "s15",
   "card": "1994 Revised Underground Sea",
   "category": "Magic",
   "set": "Revised",
   "lookups": 140,
   "users": 104,
   "change": 0,
   "spark": [
    100.0,
    97.6,
    97.6,
    99.4,
    95.9,
    97.4,
    93.6,
    93.7,
    96.7,
    101.4
   ]
  },
  {
   "id": "s16",
   "card": "2020 Panini Prizm #307 Joe Burrow RC",
   "category": "Football",
   "set": "Panini Prizm",
   "lookups": 118,
   "users": 72,
   "change": 4,
   "spark": [
    100.0,
    100.8,
    98.6,
    95.8,
    96.6,
    95.3,
    94.4,
    97.4,
    95.0,
    102.8
   ]
  }
 ],
 "deals": [
  {
   "id": "d1",
   "card": "2001 Topps Chrome Traded #T247 Albert Pujols RC",
   "grade": "Raw",
   "type": "Auction",
   "price": 131,
   "bids": 7,
   "endsMin": 42,
   "comp": 184,
   "category": "Baseball",
   "watch": true
  },
  {
   "id": "d2",
   "card": "2023 Panini Prizm #136 Victor Wembanyama RC",
   "grade": "Raw",
   "type": "Best Offer",
   "price": 96,
   "bids": 0,
   "endsMin": 2880,
   "comp": 118,
   "category": "Basketball",
   "watch": true
  },
  {
   "id": "d3",
   "card": "2017 Panini Prizm #269 Patrick Mahomes RC",
   "grade": "PSA 9",
   "type": "Auction",
   "price": 412,
   "bids": 12,
   "endsMin": 95,
   "comp": 465,
   "category": "Football",
   "watch": false
  },
  {
   "id": "d4",
   "card": "2021 Evolving Skies Umbreon VMAX #215",
   "grade": "Raw",
   "type": "Buy It Now",
   "price": 548,
   "bids": 0,
   "endsMin": 4320,
   "comp": 515,
   "category": "Pokémon",
   "watch": true
  },
  {
   "id": "d5",
   "card": "2015-16 Upper Deck Young Guns #201 Connor McDavid",
   "grade": "PSA 9",
   "type": "Auction",
   "price": 688,
   "bids": 15,
   "endsMin": 18,
   "comp": 760,
   "category": "Hockey",
   "watch": false
  },
  {
   "id": "d6",
   "card": "1999 Pokémon Base Set Charizard Holo #4",
   "grade": "PSA 7",
   "type": "Best Offer",
   "price": 905,
   "bids": 0,
   "endsMin": 5760,
   "comp": 880,
   "category": "Pokémon",
   "watch": false
  }
 ],
 "gems": [
  {
   "id": "g1",
   "card": "2001 Topps Chrome Traded #T247 Albert Pujols RC",
   "grade": "Raw",
   "type": "Auction",
   "price": 88,
   "bids": 3,
   "endsMin": 130,
   "comp": 184,
   "category": "Baseball",
   "note": "Listed as 'Pujols Topps Traded' with no 'Chrome' in the title. Photos show Chrome stock."
  },
  {
   "id": "g2",
   "card": "2018 Panini Prizm #280 Luka Doncic RC",
   "grade": "Raw",
   "type": "Auction",
   "price": 210,
   "bids": 5,
   "endsMin": 260,
   "comp": 335,
   "category": "Basketball",
   "note": "Title misspelled 'Doncik'. Low watchers."
  },
  {
   "id": "g3",
   "card": "1993 Alpha Lightning Bolt",
   "grade": "Raw",
   "type": "Buy It Now",
   "price": 610,
   "bids": 0,
   "endsMin": 9000,
   "comp": 790,
   "category": "Magic",
   "note": "Listed under 'Other CCG' instead of Magic singles."
  }
 ],
 "savedSearches": [
  {
   "q": "Pujols T247 Chrome -refractor",
   "new": 4
  },
  {
   "q": "Wembanyama Prizm 136 raw",
   "new": 11
  },
  {
   "q": "McDavid Young Guns PSA 9",
   "new": 2
  }
 ]
};

/* LEDGER + PORTFOLIO sample rows (INVENTED). Seller names, order numbers, prices and values are all made up.
 * Columns match the BigmooTradingCards Card Flip Ledger: card / from / cost / status, plus seller, price, shipping, tax, date, order link.
 * "value" is an invented sample current value (CardHound's own licensed data will supply this later). */
window.CARDHOUND_SAMPLE.ledger = [
  { id: "L1", card: "2001 Topps Chrome Traded #T247 Albert Pujols RC", grade: "PSA 9", from: "eBay · Auction", seller: "sample-seller-a", price: 148.00, shipping: 4.99, tax: 10.71, date: "2026-07-08", order: "SAMPLE-ORDER-1001", status: "graded", value: 525, category: "Baseball" },
  { id: "L2", card: "2023 Panini Prizm #136 Victor Wembanyama RC", grade: "Raw", from: "eBay · Buy It Now", seller: "sample-seller-b", price: 92.00, shipping: 5.00, tax: 6.79, date: "2026-09-02", order: "SAMPLE-ORDER-1002", status: "listed", value: 121, listPrice: 129, category: "Basketball" },
  { id: "L3", card: "2018 Panini Prizm #280 Luka Doncic RC", grade: "PSA 9", from: "eBay · Gem Hunt", seller: "sample-seller-c", price: 236.00, shipping: 0, tax: 16.52, date: "2026-09-21", order: "SAMPLE-ORDER-1003", status: "bought", value: 284, category: "Basketball" },
  { id: "L4", card: "1999 Pokémon Base Set Charizard Holo #4", grade: "PSA 6", from: "Card show", seller: "Sample booth 14", price: 410.00, shipping: 0, tax: 0, date: "2026-06-14", order: "", status: "sold", value: 0, soldFor: 548, soldVia: "Card show", soldDate: "2026-08-30", category: "Pokémon" },
  { id: "L5", card: "2020 Panini Prizm #307 Joe Burrow RC", grade: "Raw", from: "Whatnot", seller: "sample-breaker-d", price: 38.00, shipping: 3.50, tax: 2.91, date: "2026-09-10", order: "SAMPLE-ORDER-1005", status: "bought", value: 46, category: "Football" },
  { id: "L6", card: "2019 Panini Prizm #248 Zion Williamson RC", grade: "PSA 10", from: "eBay · Best Offer", seller: "sample-seller-e", price: 205.00, shipping: 0, tax: 14.35, date: "2026-05-22", order: "SAMPLE-ORDER-1006", status: "sold", value: 0, soldFor: 268, soldVia: "eBay", soldDate: "2026-07-19", category: "Basketball" },
  { id: "L7", card: "2011 Topps Update #US175 Mike Trout RC", grade: "PSA 8", from: "Local shop", seller: "Sample card shop", price: 615.00, shipping: 0, tax: 43.05, date: "2026-04-11", order: "", status: "graded", value: 760, category: "Baseball" }
];
/* Shape of the sample portfolio value line (26 weekly points). The app scales it so the last point equals today's sample value. */
window.CARDHOUND_SAMPLE.portfolioShape = [0.71, 0.72, 0.74, 0.73, 0.76, 0.78, 0.77, 0.8, 0.83, 0.82, 0.84, 0.81, 0.85, 0.87, 0.86, 0.89, 0.9, 0.88, 0.91, 0.93, 0.95, 0.94, 0.96, 0.98, 0.97, 1];
window.CARDHOUND_SAMPLE.portfolioFees = { ebayPct: 0.1325, ebayFixed: 0.40, shipToBuyer: 5, label: "eBay 13.25% + $0.40 + $5 shipping per card (sample fee model)" };

/* NEW HIGH COMPS ("BOOM!" alerts) - INVENTED sample sales.
 * tier "ath" = newest sold price is the ALL-TIME HIGH for that exact variant + grade (tier 1).
 * tier "90d" = newest sold price is the 90-DAY HIGH (tier 2).
 * Only sales that pass the exact-variant check and the quality gate count. "newHighRejects" are sample sales that were NOT counted.
 * The Pujols PSA 9 entry matches its sample report (Sep 30 auction, $585 = 30-day high). */
window.CARDHOUND_SAMPLE.newHighs = [
  { id: "h1", card: "2018 Panini Prizm #280 Luka Doncic RC", grade: "PSA 9", category: "Basketball", set: "Panini Prizm", tier: "ath", oldHigh: 288, oldHighDate: "2026-01-14", newHigh: 312, date: "2026-10-03", watch: false, portfolio: true,
    sale: { id: "SAMPLE-SALE-7101", type: "Auction", bids: 27, venue: "eBay (sample)", title: "2018 Prizm #280 Luka Doncic RC PSA 9 (sample listing)" } },
  { id: "h2", card: "2001 Topps Chrome Traded #T247 Albert Pujols RC", grade: "PSA 9", category: "Baseball", set: "Topps Chrome Traded", tier: "90d", oldHigh: 562, oldHighDate: "2026-08-09", newHigh: 585, date: "2026-09-30", watch: true, portfolio: true, reportId: "PUJOLS-01TCT-T247",
    sale: { id: "SAMPLE-SALE-7102", type: "Auction", bids: 19, venue: "eBay (sample)", title: "2001 Topps Chrome Traded T247 Pujols RC PSA 9 base (sample listing)" } },
  { id: "h3", card: "2021 Evolving Skies Umbreon VMAX #215", grade: "PSA 10", category: "Pokémon", set: "Evolving Skies", tier: "ath", oldHigh: 1690, oldHighDate: "2026-06-02", newHigh: 1825, date: "2026-10-01", watch: true, portfolio: false,
    sale: { id: "SAMPLE-SALE-7103", type: "Auction", bids: 41, venue: "eBay (sample)", title: "Umbreon VMAX 215/203 Evolving Skies PSA 10 (sample listing)" } },
  { id: "h4", card: "2023 Scarlet & Violet 151 Charizard ex #199", grade: "PSA 10", category: "Pokémon", set: "Scarlet & Violet 151", tier: "ath", oldHigh: 365, oldHighDate: "2026-03-28", newHigh: 398, date: "2026-10-04", watch: false, portfolio: false,
    sale: { id: "SAMPLE-SALE-7104", type: "Buy It Now", bids: 0, venue: "eBay (sample)", title: "Charizard ex 199/165 SV151 PSA 10 (sample listing)" } },
  { id: "h5", card: "2023-24 Upper Deck Young Guns #451 Connor Bedard", grade: "PSA 10", category: "Hockey", set: "Upper Deck Young Guns", tier: "90d", oldHigh: 410, oldHighDate: "2026-07-22", newHigh: 455, date: "2026-10-02", watch: false, portfolio: false,
    sale: { id: "SAMPLE-SALE-7105", type: "Auction", bids: 33, venue: "eBay (sample)", title: "2023-24 UD Young Guns #451 Bedard PSA 10 (sample listing)" } },
  { id: "h6", card: "2017 Panini Prizm #269 Patrick Mahomes RC", grade: "PSA 9", category: "Football", set: "Panini Prizm", tier: "90d", oldHigh: 610, oldHighDate: "2026-07-30", newHigh: 648, date: "2026-10-03", watch: false, portfolio: false,
    sale: { id: "SAMPLE-SALE-7106", type: "Auction", bids: 22, venue: "eBay (sample)", title: "2017 Prizm #269 Mahomes RC PSA 9 base (sample listing)" } },
  { id: "h7", card: "2023 Panini Prizm #136 Victor Wembanyama RC", grade: "Raw", category: "Basketball", set: "Panini Prizm", tier: "90d", oldHigh: 168, oldHighDate: "2026-08-17", newHigh: 179, date: "2026-10-02", watch: true, portfolio: false,
    sale: { id: "SAMPLE-SALE-7107", type: "Auction", bids: 16, venue: "eBay (sample)", title: "2023 Prizm #136 Wembanyama RC base raw (sample listing)" } },
  { id: "h8", card: "2022 Panini Prizm #353 Brock Purdy RC", grade: "PSA 10", category: "Football", set: "Panini Prizm", tier: "ath", oldHigh: 238, oldHighDate: "2026-02-11", newHigh: 262, date: "2026-10-03", watch: false, portfolio: false,
    sale: { id: "SAMPLE-SALE-7108", type: "Auction", bids: 24, venue: "eBay (sample)", title: "2022 Prizm #353 Purdy RC PSA 10 (sample listing)" } },
  { id: "h9", card: "2011 Topps Update #US175 Mike Trout RC", grade: "PSA 9", category: "Baseball", set: "Topps Update", tier: "90d", oldHigh: 1240, oldHighDate: "2026-07-05", newHigh: 1310, date: "2026-10-01", watch: false, portfolio: false,
    sale: { id: "SAMPLE-SALE-7109", type: "Auction", bids: 29, venue: "eBay (sample)", title: "2011 Topps Update US175 Trout RC PSA 9 (sample listing)" } },
  { id: "h10", card: "1993 Alpha Lightning Bolt", grade: "Raw (NM)", category: "Magic", set: "Alpha", tier: "ath", oldHigh: 520, oldHighDate: "2026-04-19", newHigh: 575, date: "2026-09-29", watch: false, portfolio: false,
    sale: { id: "SAMPLE-SALE-7110", type: "Auction", bids: 18, venue: "eBay (sample)", title: "Alpha Lightning Bolt NM (sample listing)" } }
];
window.CARDHOUND_SAMPLE.newHighRejects = [
  { card: "2018 Panini Prizm #280 Luka Doncic RC", grade: "PSA 9", category: "Basketball", set: "Panini Prizm", price: 540, date: "2026-10-02", why: "Mis-variant: Silver Prizm parallel, not base" },
  { card: "2023-24 Upper Deck Young Guns #451 Connor Bedard", grade: "PSA 10", category: "Hockey", set: "Upper Deck Young Guns", price: 1150, date: "2026-10-01", why: "Outlier: 2.5x the 30-day median, flagged by the quality gate" },
  { card: "2023 Scarlet & Violet 151 Charizard ex #199", grade: "PSA 10", category: "Pokémon", set: "Scarlet & Violet 151", price: 520, date: "2026-10-03", why: "Quality gate: unpaid / cancelled order" },
  { card: "2001 Topps Chrome Traded #T247 Albert Pujols RC", grade: "PSA 9", category: "Baseball", set: "Topps Chrome Traded", price: 410, date: "2026-09-22", why: "Mis-variant: Refractor, not base" }
];

/* Voice / prompt hunt: invented sample listings (no real sellers, items or prices). kind: card | lot | sealed | reprint.
   comps = sample 30-day medians; odds = sample grading odds for raw copies; pop = sample population counts. */
(function () {
  var S = function (fb, tr, us, ret) { return { feedback_pct: fb, top_rated: tr, us: us, returns: ret }; };
  var C = function (raw, p8, p9, p10) { return { raw: raw, psa8: p8, psa9: p9, psa10: p10 }; };
  var O = function (o10, o9, o8) { return { "10": o10, "9": o9, "8": o8 }; };
  var L = [
    ["vh01", "2018-19 Panini Prizm Luka Doncic #280 Silver Prizm RC", "Basketball", "2018-19", "Panini", "Panini Prizm", null, "Luka Doncic", "280", "Silver Prizm", null, true, 310, 0, "auction", 140, S(99.8, true, true, true), C(360, 420, 640, 1650), O(.14, .41, .3), ["Well centered", "Sharp corners"]],
    ["vh02", "2018-19 Panini Prizm Luka Doncic #280 Silver Prizm RC", "Basketball", "2018-19", "Panini", "Panini Prizm", null, "Luka Doncic", "280", "Silver Prizm", null, true, 289, 6, "auction", 95, S(96.1, false, false, false), C(360, 420, 640, 1650), O(.1, .38, .34), ["Off-center"]],
    ["vh03", "2018-19 Panini Prizm Luka Doncic #280 Silver Prizm RC PSA 9", "Basketball", "2018-19", "Panini", "Panini Prizm", null, "Luka Doncic", "280", "Silver Prizm", null, true, 585, 0, "bin", 2880, S(100, true, true, true), C(360, 420, 640, 1650), null, ["Well centered"], "PSA", 9],
    ["vh04", "2018-19 Panini Prizm Luka Doncic #280 Base RC", "Basketball", "2018-19", "Panini", "Panini Prizm", null, "Luka Doncic", "280", "Base", null, true, 68, 4.5, "auction", 210, S(99.4, true, true, true), C(80, 105, 160, 420), O(.18, .44, .26), []],
    ["vh05", "2019-20 Panini Prizm Zion Williamson #248 Silver Prizm RC", "Basketball", "2019-20", "Panini", "Panini Prizm", null, "Zion Williamson", "248", "Silver Prizm", null, true, 118, 5, "auction", 75, S(99.6, true, true, true), C(135, 150, 230, 610), O(.12, .4, .32), ["Sharp corners"]],
    ["vh06", "2020 Panini Prizm Justin Herbert #325 Silver Prizm RC", "Football", "2020", "Panini", "Panini Prizm", null, "Justin Herbert", "325", "Silver Prizm", null, true, 96, 4, "bin", 1440, S(99.1, false, true, true), C(110, 125, 175, 420), O(.16, .42, .28), []],
    ["vh07", "2020 Panini Prizm Joe Burrow #307 Silver Prizm RC", "Football", "2020", "Panini", "Panini Prizm", null, "Joe Burrow", "307", "Silver Prizm", null, true, 228, 0, "auction", 320, S(99.9, true, true, true), C(255, 290, 410, 1150), O(.13, .4, .31), ["Well centered"]],
    ["vh08", "2023-24 Panini Prizm Victor Wembanyama #136 Silver Prizm RC", "Basketball", "2023-24", "Panini", "Panini Prizm", null, "Victor Wembanyama", "136", "Silver Prizm", null, true, 365, 0, "auction", 50, S(100, true, true, true), C(395, 430, 610, 1500), O(.2, .45, .25), ["Well centered"]],
    ["vh09", "2017 Panini Prizm Patrick Mahomes #269 Silver Prizm RC", "Football", "2017", "Panini", "Panini Prizm", null, "Patrick Mahomes", "269", "Silver Prizm", null, true, 940, 0, "bin", 4300, S(99.7, true, true, true), C(1050, 1250, 1900, 6200), O(.08, .36, .36), []],
    ["vh10", "2023-24 Panini Prizm Victor Wembanyama #136 Base RC", "Basketball", "2023-24", "Panini", "Panini Prizm", null, "Victor Wembanyama", "136", "Base", null, true, 88, 4, "auction", 30, S(99.2, true, true, true), C(98, 115, 160, 340), O(.24, .46, .22), []],
    ["vh11", "2023-24 Topps Chrome Victor Wembanyama #1 Refractor RC", "Basketball", "2023-24", "Topps", "Topps Chrome", null, "Victor Wembanyama", "1", "Refractor", null, true, 129, 4.5, "auction", 160, S(99.5, true, true, true), C(145, 160, 230, 520), O(.22, .44, .24), ["Well centered"]],
    ["vh12", "2023-24 Topps Chrome Victor Wembanyama #1 Gold Refractor /50 RC", "Basketball", "2023-24", "Topps", "Topps Chrome", null, "Victor Wembanyama", "1", "Gold Refractor", "/50", true, 1450, 0, "bin", 5000, S(100, true, true, true), C(1600, 1750, 2400, 5200), O(.2, .45, .25), []],
    ["vh13", "2023-24 Bowman Chrome U Victor Wembanyama Refractor (prospect)", "Basketball", "2023-24", "Bowman", "Bowman Chrome", null, "Victor Wembanyama", "75", "Refractor", null, false, 112, 4, "auction", 400, S(98.9, false, true, true), C(120, 135, 190, 420), O(.22, .44, .24), []],
    ["vh14", "2001 Topps Chrome Traded Albert Pujols #T247 RC", "Baseball", "2001", "Topps", "Topps Chrome Traded", null, "Albert Pujols", "T247", "Base", null, true, 152, 5, "auction", 170, S(99.7, true, true, true), C(184, 255, 525, 1975), O(.15, .4, .3), ["Well centered"]],
    ["vh15", "2001 Topps Chrome Traded Albert Pujols #T247 Refractor RC", "Baseball", "2001", "Topps", "Topps Chrome Traded", null, "Albert Pujols", "T247", "Refractor", null, true, 690, 0, "bin", 2600, S(99.9, true, true, true), C(760, 980, 1650, 6400), O(.1, .38, .34), []],
    ["vh16", "1997-98 Skybox Metal Universe Kobe Bryant Precious Metal Gems Red /90", "Basketball", "1997-98", "Skybox", "Skybox Metal Universe", "Precious Metal Gems (PMG)", "Kobe Bryant", "81", "Red", "/90", false, 9800, 0, "bin", 8000, S(100, true, true, true), C(11500, 14000, 21000, 48000), O(.04, .3, .4), ["Clean surface"]],
    ["vh17", "1996-97 Skybox E-X2000 Kobe Bryant Credentials RC /499", "Basketball", "1996-97", "Skybox", "Skybox E-X2000", "Credentials", "Kobe Bryant", "30", "Base", "/499", true, 1650, 0, "auction", 610, S(99.8, true, true, true), C(1900, 2300, 3600, 11000), O(.05, .32, .4), []],
    ["vh18", "1996-97 Fleer Ultra Kobe Bryant Gold Medallion RC #G-52", "Basketball", "1996-97", "Fleer", "Fleer Ultra", null, "Kobe Bryant", "G-52", "Gold Medallion", null, true, 210, 5, "auction", 220, S(99.3, false, true, true), C(240, 300, 520, 2400), O(.06, .3, .4), []],
    ["vh19", "1998-99 Topps Chrome Vince Carter #199 Refractor RC", "Basketball", "1998-99", "Topps", "Topps Chrome", null, "Vince Carter", "199", "Refractor", null, true, 330, 5, "auction", 380, S(99.6, true, true, true), C(380, 450, 760, 3100), O(.07, .33, .38), []],
    ["vh20", "2021 Evolving Skies Umbreon VMAX #215 Alt Art", "Pokémon", "2021", "Pokémon", "Evolving Skies", null, "Umbreon", "215", "Alt Art", null, false, 1180, 0, "bin", 3000, S(99.9, true, true, true), C(1300, 1150, 1500, 3100), O(.3, .5, .15), ["Well centered"]],
    ["vh21", "2023 Scarlet & Violet 151 Charizard ex #199 SIR", "Pokémon", "2023", "Pokémon", "Scarlet & Violet 151", null, "Charizard", "199", "Special Illustration Rare", null, false, 205, 4, "auction", 90, S(99.5, true, true, true), C(230, 210, 300, 520), O(.35, .45, .15), []],
    ["vh22", "2018 Topps Chrome Shohei Ohtani #150 Refractor RC", "Baseball", "2018", "Topps", "Topps Chrome", null, "Shohei Ohtani", "150", "Refractor", null, true, 255, 5, "auction", 125, S(99.7, true, true, true), C(290, 320, 480, 1350), O(.14, .4, .3), []],
    ["vh23", "LOT of 10 Panini Prizm Silver Rookies (Luka, Zion, Herbert…)", "Basketball", "2018-19", "Panini", "Panini Prizm", null, "Luka Doncic", "", "Silver Prizm", null, true, 380, 0, "auction", 100, S(97, false, true, false), C(0, 0, 0, 0), null, [], null, null, "lot"],
    ["vh24", "2018-19 Panini Prizm Basketball Hobby Box (sealed)", "Basketball", "2018-19", "Panini", "Panini Prizm", null, null, "", "", null, false, 3900, 0, "bin", 3000, S(99.9, true, true, true), C(0, 0, 0, 0), null, [], null, null, "sealed"],
    ["vh25", "Luka Doncic Prizm Silver RC REPRINT custom card", "Basketball", "2018-19", "Panini", "Panini Prizm", null, "Luka Doncic", "280", "Silver Prizm", null, true, 6, 1, "bin", 9000, S(91, false, false, false), C(0, 0, 0, 0), null, [], null, null, "reprint"]
  ];
  window.CARDHOUND_SAMPLE.huntListings = L.map(function (a) {
    var graded = !!a[20];
    return { id: a[0], title: a[1], category: a[2], year: a[3], brand: a[4], set: a[5], subset_insert: a[6], player: a[7], card_number: a[8], parallel_color: a[9], serial_numbered: a[10], rookie: a[11],
      price: a[12], shipping: a[13], listing_type: a[14], ends_in_min: a[15], seller: a[16], comps: a[17], odds: a[18] || O(.15, .4, .3), condition_notes: a[19],
      raw: !graded, grade_company: a[20] || null, grade: a[21] || null, kind: a[22] || "card", auto: false, patch: false,
      pop: { psa10: Math.round(a[17].psa10 / 7) + 40, psa9: Math.round(a[17].psa9 / 2) + 120, total: Math.round(a[17].psa9 * 1.4) + 400 }, sample: true };
  });
})();
