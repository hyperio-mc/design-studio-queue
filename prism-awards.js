#!/usr/bin/env node
// PRISM — Creative Design Awards Platform
// Heartbeat Challenge inspired by:
//   - Mobbin Awards 2025 (mobbin.com/awards) — hyper-realistic 3D chrome trophies
//   - Phantom Studios (siteinspire.com) — dark gothic near-black art direction
//   - Koto Studio nominee — bold editorial navy + electric blue
//   - Jitter nominee — vibrant purple/magenta on dark

const https = require('https');
const fs = require('fs');

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const P = {
  bg:      '#080a0f',  // near-black base
  card:    '#0d1117',  // card surface
  navy:    '#0a1628',  // deep navy section
  dim:     '#141c28',  // dimmed surface
  blue:    '#4f7fff',  // electric blue (Koto-inspired)
  blueDim: '#1a2e5a',  // muted blue fill
  gold:    '#f5c842',  // award gold
  goldDim: '#3d2e00',  // dark gold bg
  silver:  '#c0cfe0',  // metallic silver
  mag:     '#d946ef',  // magenta (Jitter-inspired)
  magDim:  '#3d0060',  // dark magenta
  orange:  '#ff6b35',  // warm orange accent
  green:   '#22c55e',  // verdant green
  text:    '#f0f4ff',  // primary text
  sub:     '#8899aa',  // secondary text
  border:  '#1e2a3a',  // subtle border
};

const MW = 375, MH = 812;   // mobile canvas
const PW = 1440, PH = 900;  // desktop canvas

let idC = 1;
const uid = () => `e${idC++}`;

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const F = (x, y, w, h, fill, children = [], opts = {}) => ({
  id: uid(), type: 'frame', x, y, width: w, height: h, fill,
  cornerRadius: opts.r || 0, opacity: opts.op !== undefined ? opts.op : 1,
  children: children.filter(Boolean),
});
const R = (x, y, w, h, fill, opts = {}) =>
  F(x, y, w, h, fill, [], opts);
const E = (x, y, w, h, fill, op = 1) => ({
  id: uid(), type: 'ellipse', x, y, width: w, height: h, fill, opacity: op,
});
const T = (text, x, y, w, h, size, color, bold = false, align = 'left', op = 1, ls = 0) => ({
  id: uid(), type: 'text', x, y, width: w, height: h, text,
  fontSize: size, fill: color, fontWeight: bold ? 700 : 400,
  textAlign: align, opacity: op, letterSpacing: ls,
});
const Line = (x, y, w, h, fill, op = 1) => R(x, y, w, h, fill, { op });

// ─── CHROME ORB HELPER ───────────────────────────────────────────────────────
// Simulates a metallic sphere with 5 stacked ellipses:
// dark base → body highlight → mid-tone → specular (top-left) → rim light (bottom-right)
function ChromeOrb(cx, cy, r, tint = P.silver) {
  return [
    E(cx - r,           cy - r,           r * 2,       r * 2,       '#1a2030',  1.0),
    E(cx - r + 2,       cy - r + 2,       r * 2 - 4,   r * 2 - 4,   tint,       0.14),
    E(cx - r + r * 0.3, cy - r + r * 0.1, r * 1.1,     r * 1.4,     tint,       0.10),
    E(cx - r * 0.5,     cy - r * 0.7,     r * 0.55,    r * 0.42,    '#ffffff',  0.32),
    E(cx + r * 0.1,     cy + r * 0.3,     r * 0.7,     r * 0.4,     tint,       0.18),
  ];
}

// ─── CARD HELPERS ─────────────────────────────────────────────────────────────
function NomCard(x, y, w, h, name, studio, col) {
  return F(x, y, w, h, P.card, [
    R(0, 0, w, 3, col),
    T(name,   12, 16, w - 24, 20, 14, P.text, true),
    T(studio, 12, 38, w - 24, 16, 11, P.sub),
    R(12, h - 16, 24, 2, col, { op: 0.5 }),
  ], { r: 8 });
}

function CatRow(x, y, w, name, count, col) {
  return F(x, y, w, 56, P.card, [
    R(0, 0, 3, 56, col),
    T(name,           16, 10, w - 80, 18, 12, P.text, true, 'left', 1, 1),
    T(`${count} nominees`, 16, 30, w - 80, 14, 10, P.sub),
    T('→', w - 28, 20, 20, 18, 14, col, false, 'right'),
  ], { r: 6 });
}

function StatBox(x, y, val, label, col) {
  return F(x, y, 100, 48, P.dim, [
    T(val,   0,  8, 100, 20, 16, col,   true,  'center'),
    T(label, 0, 28, 100, 14,  9, P.sub, false, 'center'),
  ], { r: 6 });
}

function NavBar(w, withBack = false, activeLink = '') {
  return F(0, 0, w, 64, P.bg, [
    T('PRISM', 48, 20, 80, 28, 14, P.blue, true, 'left', 1, 4),
    withBack ? T('← Back', 160, 22, 80, 22, 12, P.sub) : null,
    !withBack ? T('Nominees', 180, 22, 90, 22, 13, activeLink === 'nominees' ? P.text : P.sub) : null,
    !withBack ? T('Archive',  280, 22, 80, 22, 13, activeLink === 'archive'  ? P.text : P.sub) : null,
    F(w - 180, 16, 132, 36, P.blue, [
      T('Vote Now →', 0, 9, 132, 20, 13, '#ffffff', true, 'center'),
    ], { r: 18 }),
    Line(0, 63, w, 1, P.border),
  ]);
}

// ─── MOBILE SCREEN 1 — HERO ──────────────────────────────────────────────────
function mobileHero() {
  return F(0, 0, MW, MH, P.bg, [
    // Status bar
    T('9:41', 16, 14, 60, 16, 11, P.sub),
    T('●●●', MW - 50, 14, 44, 16, 9, P.sub, false, 'right'),

    // Wordmark row
    T('PRISM',  24, 52, 80, 24, 13, P.blue, true, 'left', 1, 4),
    T('2025',  MW - 68, 52, 44, 24, 13, P.sub, false, 'right', 1, 2),

    // Big condensed headline stack
    T('THE',     24, 100, MW - 48,  68, 62, P.sub,  true, 'left', 1, -2),
    T('DESIGN',  24, 162, MW - 48,  72, 62, P.text, true, 'left', 1, -2),
    T('AWARDS.', 24, 226, MW - 48,  68, 56, P.blue, true, 'left', 1, -2),

    // Tagline
    T("Celebrating the world's finest digital craft.", 24, 306, MW - 48, 40, 13, P.sub),

    // Chrome orbs — decorative (offsets stay relative to this frame)
    ...ChromeOrb(268, 390, 58, P.silver),
    ...ChromeOrb(110, 428, 26, P.gold),
    ...ChromeOrb(310, 440, 18, P.mag),

    // Year badge
    F(24, 462, 112, 28, P.blueDim, [
      T('2025 EDITION', 0, 7, 112, 16, 9, P.blue, true, 'center', 1, 2),
    ], { r: 14 }),

    // CTA
    F(24, 504, MW - 48, 48, P.blue, [
      T('Explore Nominees →', 0, 14, MW - 48, 22, 14, '#ffffff', true, 'center'),
    ], { r: 24 }),

    // Category pills
    T('CATEGORIES', 24, 572, MW - 48, 14, 9, P.sub, true, 'left', 1, 2),
    F(24,  592,  96, 28, P.blueDim, [T('Site of Year', 0, 7,  96, 16, 10, P.blue,   false, 'center')], { r: 14 }),
    F(128, 592,  72, 28, P.magDim,  [T('Web App',      0, 7,  72, 16, 10, P.mag,    false, 'center')], { r: 14 }),
    F(208, 592,  60, 28, P.dim,     [T('iOS App',      0, 7,  60, 16, 10, P.gold,   false, 'center')], { r: 14 }),
    F(276, 592,  80, 28, P.dim,     [T('Animation',    0, 7,  80, 16, 10, P.silver, false, 'center')], { r: 14 }),

    // Stats row
    Line(24, 648, MW - 48, 1, P.border),
    T('6 Categories',  24,      660, 110, 16, 11, P.sub),
    T('36 Nominees',   MW/2-55, 660, 110, 16, 11, P.sub, false, 'center'),
    T('24 Countries',  MW-134,  660, 110, 16, 11, P.sub, false, 'right'),

    // Home bar
    R(MW/2 - 67, MH - 28, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 2 — CATEGORIES ────────────────────────────────────────────
function mobileCategories() {
  const cats = [
    { name: 'SITE OF THE YEAR',    count: 6, col: P.blue   },
    { name: 'WEB APP OF THE YEAR', count: 6, col: P.mag    },
    { name: 'IOS APP OF THE YEAR', count: 6, col: P.gold   },
    { name: 'ANIMATOR OF THE YEAR',count: 6, col: P.silver },
    { name: 'TYPOGRAPHY AWARD',    count: 6, col: P.orange },
  ];

  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),
    T('PRISM', MW/2 - 30, 52, 60, 24, 13, P.blue, true, 'center', 1, 4),

    // Section heading
    T('AWARD',      24, 92, MW - 48, 30, 22, P.sub,  true, 'left',  1, 1),
    T('CATEGORIES', 24, 92, MW - 48, 30, 22, P.text, true, 'right', 1, 1),

    // Category rows
    ...cats.map((c, i) => CatRow(24, 138 + i * 68, MW - 48, c.name, c.count, c.col)),

    // Curators section
    Line(24, 492, MW - 48, 1, P.border),
    T('CURATED BY', 24, 508, MW - 48, 14, 9, P.sub, true, 'left', 1, 2),
    F(24,  530, 155, 44, P.dim, [
      T('Tobias van Schneider', 8,  8, 139, 16, 11, P.text, true),
      T('MyMind',               8, 26, 139, 14, 10, P.sub),
    ], { r: 8 }),
    F(187, 530, 155, 44, P.dim, [
      T('Andy Allen',       8,  8, 139, 16, 11, P.text, true),
      T('Not Boring Soft.',  8, 26, 139, 14, 10, P.sub),
    ], { r: 8 }),

    R(MW/2 - 67, MH - 28, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 3 — NOMINEES GRID ─────────────────────────────────────────
function mobileNominees() {
  const noms = [
    { name: 'Air',             studio: 'In-house',       col: P.blue   },
    { name: 'Koto',            studio: 'Koto Studio',    col: P.gold   },
    { name: 'Savor',           studio: 'Savor Food Tech',col: P.green  },
    { name: 'Jitter',          studio: 'Jitter Inc.',    col: P.mag    },
    { name: 'Phantom Studios', studio: 'Phantom',        col: P.silver },
    { name: 'Shopify Editions',studio: 'Shopify Design', col: P.green  },
  ];
  const cw = (MW - 48 - 12) / 2;

  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),

    // Category header bar
    F(0, 36, MW, 48, P.navy, [
      T('← SITE OF THE YEAR', 24, 14, MW - 100, 20, 12, P.blue, true, 'left', 1, 1),
      T('6 of 6',              MW - 76, 14,  52, 20, 11, P.sub, false, 'right'),
    ]),

    // Filter tabs
    F(24, 96, MW - 48, 44, P.dim, [
      F(4, 4, 80, 36, P.blue,        [T('All',         0, 10,  80, 18, 11, '#fff', true, 'center')], { r: 6 }),
      T('Shortlisted', 92,  12, 90, 20, 11, P.sub, false, 'center'),
      T('Voted',       190, 12, 50, 20, 11, P.sub, false, 'center'),
    ], { r: 8 }),

    // 2×3 grid of nominee cards
    ...noms.map((n, i) =>
      NomCard(24 + (i % 2) * (cw + 12), 156 + Math.floor(i / 2) * 96, cw, 84, n.name, n.studio, n.col)
    ),

    R(MW/2 - 67, MH - 28, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 4 — NOMINEE DETAIL ────────────────────────────────────────
function mobileNomineeDetail() {
  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),

    // Hero panel
    F(0, 36, MW, 264, P.navy, [
      R(0, 0, MW, 264, P.blue, { op: 0.06 }),
      ...ChromeOrb(MW / 2, 130, 48, P.blue),
      T('AIR', 24, 168, MW - 48, 60, 52, P.text, true, 'left', 1, -1),
      T('airops.com', 24, 222, MW - 48, 20, 12, P.sub),
    ]),

    // Back arrow
    T('←', 24, 48, 24, 22, 16, P.text),

    // Info body
    F(0, 300, MW, MH - 300, P.bg, [
      // Category badge
      F(24, 16, 144, 26, P.blueDim, [
        T('SITE OF THE YEAR', 0, 6, 144, 16, 9, P.blue, true, 'center', 1, 1),
      ], { r: 13 }),

      // Studio
      T('By Air / In-house team', 24, 52, MW - 48, 16, 12, P.sub),

      // Description
      T('A visual collaborative tool for creative operations — search, approve, and scale ideas at speed.', 24, 76, MW - 48, 56, 13, P.sub),

      Line(24, 142, MW - 48, 1, P.border),

      // Tags
      T('TAGS', 24, 158, 60, 14, 9, P.sub, true, 'left', 1, 2),
      F(24,  176, 80, 26, P.dim, [T('Creative Ops', 0, 6, 80, 16, 10, P.text, false, 'center')], { r: 13 }),
      F(112, 176, 48, 26, P.dim, [T('SaaS',         0, 6, 48, 16, 10, P.text, false, 'center')], { r: 13 }),
      F(168, 176, 64, 26, P.dim, [T('Framer',       0, 6, 64, 16, 10, P.text, false, 'center')], { r: 13 }),

      // CTAs
      F(24,       224, MW - 120, 48, P.blue, [T('★ Cast Vote', 0, 14, MW - 120, 22, 14, '#fff', true, 'center')], { r: 24 }),
      F(MW - 88,  224,        64, 48, P.dim,  [T('Visit ↗',    0, 14, 64,       22, 13, P.text, false, 'center')], { r: 24 }),

      // Next/prev
      T('← Phantom Studios', 24,       296, 140, 16, 11, P.sub),
      T('Koto →',             MW - 88,  296,  64, 16, 11, P.sub, false, 'right'),
    ]),

    R(MW/2 - 67, MH - 28, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 5 — WINNERS ────────────────────────────────────────────────
function mobileWinners() {
  const winners = [
    { place: '1st', name: 'Air',       cat: 'Site of the Year', col: P.gold,    podH: 60 },
    { place: '2nd', name: 'Jitter',    cat: 'Web App',          col: P.silver,  podH: 42 },
    { place: '3rd', name: 'Headspace', cat: 'iOS App',          col: '#cd7f32', podH: 30 },
  ];

  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),
    T('●●●', MW - 50, 14, 44, 16, 9, P.sub, false, 'right'),

    // Header bar
    F(0, 36, MW, 56, P.navy, [
      T('2025 WINNERS',  24, 17, MW - 120, 22, 16, P.text, true, 'left', 1, 2),
      T('PRISM AWARDS', MW - 120, 17, 96, 22, 9, P.sub, true, 'right', 1, 2),
    ]),

    // Gold orb decoration
    ...ChromeOrb(MW / 2, 162, 48, P.gold),

    // "Best in Digital Craft"
    T('Best in Digital Craft', MW/2 - 90, 222, 180, 20, 13, P.sub, false, 'center'),

    Line(24, 248, MW - 48, 1, P.border),

    // Podium bars
    F(MW/2 - 104, 258, 72, 60, P.goldDim, [
      T('1', 0, 18, 72, 24, 20, P.gold,    true, 'center'),
    ], { r: 6 }),
    F(MW/2 -  20, 276, 60, 42, P.dim, [
      T('2', 0, 10, 60, 22, 17, P.silver,  true, 'center'),
    ], { r: 6 }),
    F(MW/2 +  48, 284, 52, 34, P.dim, [
      T('3', 0,  6, 52, 22, 15, '#cd7f32', true, 'center'),
    ], { r: 6 }),

    // Winner cards
    ...winners.map((w, i) =>
      F(24, 344 + i * 84, MW - 48, 72, P.card, [
        R(0, 0, 4, 72, w.col),
        F(12, 0, 40, 72, P.dim, [T(w.place, 0, 26, 40, 20, 13, w.col, true, 'center')]),
        Line(52, 12, 1, 48, P.border),
        T(w.name,  64, 16, MW - 160, 22, 16, P.text, true),
        T(w.cat,   64, 40, MW - 160, 16, 11, P.sub),
        E(MW - 80, 26, 20, 20, w.col, 0.25),
        E(MW - 74, 32,  8,  8, w.col, 0.80),
      ], { r: 8 })
    ),

    // View all CTA
    F(24, 602, MW - 48, 44, P.dim, [
      T('View All 36 Winners →', 0, 12, MW - 48, 20, 13, P.blue, false, 'center'),
    ], { r: 22 }),

    R(MW/2 - 67, MH - 28, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── DESKTOP SCREEN 1 — HERO ──────────────────────────────────────────────────
function desktopHero() {
  const stats = [
    { val: '6',   label: 'Categories', col: P.blue   },
    { val: '36',  label: 'Nominees',   col: P.gold   },
    { val: '24',  label: 'Countries',  col: P.mag    },
    { val: '1M+', label: 'Votes cast', col: P.silver },
  ];

  return F(0, 0, PW, PH, P.bg, [
    NavBar(PW),

    // Big headline — oversized condensed stack
    T('THE',     80,  130, 700, 108,  96, P.sub,  true, 'left', 0.6, -3),
    T('DESIGN',  80,  218, 820, 112, 100, P.text, true, 'left', 1.0, -3),
    T('AWARDS',  80,  308, 820, 112, 100, P.blue, true, 'left', 1.0, -3),
    T('2025.',   80,  398, 600,  96,  88, P.text, true, 'left', 0.22,-3),

    // Tagline
    T("Celebrating the world's finest digital craft across 6 categories.", 80, 512, 500, 38, 15, P.sub),

    // Stats row
    ...stats.map((s, i) => StatBox(80 + i * 112, 570, s.val, s.label, s.col)),

    // Scroll hint
    T('Scroll to explore ↓', 80, 646, 200, 20, 12, P.sub),

    // Decorative chrome orbs — right side
    ...ChromeOrb(PW - 280, PH / 2,       180, P.silver),
    ...ChromeOrb(PW - 160, PH / 2 + 130,  80, P.gold),
    ...ChromeOrb(PW - 390, PH / 2 +  90,  52, P.mag),
    ...ChromeOrb(PW - 120, PH / 2 -  80,  34, P.blue),
  ]);
}

// ─── DESKTOP SCREEN 2 — NOMINEES BROWSE ──────────────────────────────────────
function desktopNominees() {
  const SIDEBAR = 200;
  const noms = [
    { name: 'Air',             studio: 'In-house',        col: P.blue   },
    { name: 'Koto',            studio: 'Koto Studio',     col: P.gold   },
    { name: 'Savor',           studio: 'Savor Food Tech', col: P.green  },
    { name: 'Jitter',          studio: 'Jitter Inc.',     col: P.mag    },
    { name: 'Phantom Studios', studio: 'Phantom',         col: P.silver },
    { name: 'Shopify Editions',studio: 'Shopify Design',  col: P.green  },
    { name: 'Sana AI',         studio: 'Sana Labs',       col: P.blue   },
    { name: 'Firecrawl',       studio: 'Mendable',        col: P.orange },
    { name: 'Airbnb',          studio: 'Airbnb Design',   col: '#ff5a5f'},
  ];
  const colW = Math.floor((PW - SIDEBAR - 48 - 32) / 3);
  const cards = noms.map((n, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = col * (colW + 16);
    const cy = row * 156;
    return F(cx, cy, colW, 144, P.card, [
      R(0, 0, colW, 3, n.col),
      ...ChromeOrb(colW - 36, 36, 22, n.col),
      T(n.name,   16, 20, colW - 80, 24, 17, P.text, true),
      T(n.studio, 16, 46, colW - 80, 16, 12, P.sub),
      Line(16, 90, colW - 32, 1, P.border),
      T('View Details →', 16, 106, 120, 16, 11, n.col),
      F(colW - 76, 102, 60, 26, n.col, [
        T('Vote', 0, 6, 60, 16, 10, '#fff', true, 'center'),
      ], { r: 13, op: 0.9 }),
    ], { r: 8 });
  });

  const sidebarCats = ['Site of Year', 'Web App', 'iOS App', 'Animation', 'Typography', 'Emerging'];

  return F(0, 0, PW, PH, P.bg, [
    NavBar(PW, false, 'nominees'),

    // Sidebar
    F(0, 64, SIDEBAR, PH - 64, P.dim, [
      T('CATEGORIES', 16, 24, 168, 14, 9, P.sub, true, 'left', 1, 2),
      ...sidebarCats.map((c, i) =>
        F(8, 52 + i * 44, 184, 36, i === 0 ? P.blueDim : 'transparent', [
          T(c, 12, 9, 140, 18, 12, i === 0 ? P.blue : P.sub),
          T('6',  162, 9,  24, 18, 10, P.sub, false, 'right'),
        ], { r: 6 })
      ),
      Line(16, 330, 168, 1, P.border),
      T('CURATORS',            16, 348, 168, 14,  9, P.sub, true, 'left', 1, 2),
      T('Tobias van Schneider', 16, 368, 168, 16, 11, P.text),
      T('Andy Allen',           16, 388, 168, 16, 11, P.text),
      T('Zhenya Rynzhuk',       16, 408, 168, 16, 11, P.text),
    ]),

    // Main area header
    F(SIDEBAR, 64, PW - SIDEBAR, 60, P.bg, [
      T('SITE OF THE YEAR', 24, 18, 240, 22, 13, P.text, true, 'left', 1, 2),
      T('6 nominees',       276, 20, 100, 18, 12, P.sub),
      // Filter tabs
      ...['All', 'Shortlisted', 'New'].map((tab, i) =>
        F(PW - SIDEBAR - 300 + i * 90, 14, 80, 32,
          i === 0 ? P.blueDim : 'transparent', [
          T(tab, 0, 8, 80, 18, 12, i === 0 ? P.blue : P.sub, i === 0, 'center'),
        ], { r: 6 })
      ),
      Line(0, 59, PW - SIDEBAR, 1, P.border),
    ]),

    // Nominee cards grid
    F(SIDEBAR + 24, 140, PW - SIDEBAR - 48, PH - 180, 'transparent', cards),
  ]);
}

// ─── DESKTOP SCREEN 3 — NOMINEE DETAIL ───────────────────────────────────────
function desktopDetail() {
  const LEFT = 600;

  return F(0, 0, PW, PH, P.bg, [
    NavBar(PW, true),

    // Left hero panel
    F(0, 64, LEFT, PH - 64, P.navy, [
      R(0, 0, LEFT, PH - 64, P.blue, { op: 0.05 }),
      ...ChromeOrb(LEFT / 2, (PH - 64) * 0.42, 96, P.blue),

      // Category badge top
      F(48, 32, 148, 28, P.blueDim, [
        T('SITE OF THE YEAR', 0, 7, 148, 16, 9, P.blue, true, 'center', 1, 1),
      ], { r: 14 }),

      // Site name bottom overlay
      T('AIR',       48, PH - 280, LEFT - 96, 100, 88, P.text, true, 'left', 1, -2),
      T('airops.com', 48, PH - 170, LEFT - 96,  22, 14, P.sub),
    ]),

    // Right info panel
    F(LEFT, 64, PW - LEFT, PH - 64, P.bg, [
      // Breadcrumb
      T('Categories / Site of the Year / Air', 40, 28, PW - LEFT - 80, 16, 11, P.sub),

      // Name + studio
      T('Air',                  40,  60, PW - LEFT - 80, 48, 36, P.text, true),
      T('In-house design team', 40, 110, PW - LEFT - 80, 20, 14, P.sub),

      Line(40, 142, PW - LEFT - 80, 1, P.border),

      // Description
      T('A visual collaborative tool for creative operations to search, approve, and scale ideas at speed. Nominated for exceptional clarity, depth of interaction, and coherent design language.',
        40, 158, PW - LEFT - 80, 72, 14, P.sub),

      // Tags
      T('TAGS', 40, 246, 60, 14, 9, P.sub, true, 'left', 1, 2),
      ...[['Creative Ops', P.blue], ['SaaS', P.sub], ['Framer', P.mag], ['2025', P.gold]].map(([tag, col], i) =>
        F(40 + i * 90, 268, 82, 28, P.dim, [T(tag, 0, 7, 82, 16, 10, col, false, 'center')], { r: 14 })
      ),

      // Stat boxes
      ...[['82k', 'Views'], ['14.2k', 'Votes'], ['USA', 'Country']].map(([val, label], i) =>
        F(40 + i * 120, 316, 108, 56, P.dim, [
          T(val,   0,  8, 108, 24, 18, P.text, true,  'center'),
          T(label, 0, 32, 108, 16, 10, P.sub,  false, 'center'),
        ], { r: 8 })
      ),

      // CTAs
      F(40,  400, 200, 52, P.blue, [T('★ Cast Your Vote', 0, 16, 200, 22, 14, '#fff',  true,  'center')], { r: 26 }),
      F(252, 400, 140, 52, P.dim,  [T('Visit Site ↗',    0, 16, 140, 22, 13, P.text, false, 'center')], { r: 26 }),

      Line(40, 476, PW - LEFT - 80, 1, P.border),

      // Next nominee card
      T('NEXT NOMINEE', 40, 496, 140, 14, 9, P.sub, true, 'left', 1, 2),
      F(40, 518, PW - LEFT - 80, 64, P.dim, [
        T('Koto Studio →',  16, 10, 300, 22, 15, P.text, true),
        T('Site of the Year', 16, 34, 300, 16, 11, P.sub),
        E(PW - LEFT - 120, 16, 32, 32, P.gold, 0.20),
        E(PW - LEFT - 112, 24, 16, 16, P.gold, 0.60),
      ], { r: 8 }),
    ]),
  ]);
}

// ─── DESKTOP SCREEN 4 — VOTING ────────────────────────────────────────────────
function desktopVoting() {
  const noms = [
    { name: 'Air',             studio: 'In-house',        col: P.blue,   sel: true  },
    { name: 'Koto',            studio: 'Koto Studio',     col: P.gold,   sel: false },
    { name: 'Savor',           studio: 'Savor Food Tech', col: P.green,  sel: false },
    { name: 'Jitter',          studio: 'Jitter Inc.',     col: P.mag,    sel: false },
    { name: 'Phantom Studios', studio: 'Phantom',         col: P.silver, sel: false },
    { name: 'Shopify Editions',studio: 'Shopify Design',  col: P.green,  sel: false },
  ];

  const ballotW = PW - 400;
  const cardW = (ballotW - 80 - 24) / 2;

  const votingCards = noms.map((n, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return F(col * (cardW + 24), row * 100, cardW, 88, n.sel ? P.blueDim : P.card, [
      // Radio circle
      E(14, 32, 20, 20, n.sel ? P.blue : P.border),
      n.sel ? E(19, 37, 10, 10, '#ffffff', 0.90) : null,
      // Accent bar
      R(44, 0, 3, 88, n.col),
      // Text
      T(n.name,   56, 18, cardW - 100, 22, 15, P.text, true),
      T(n.studio, 56, 42, cardW - 100, 16, 11, P.sub),
      // Mini orb
      E(cardW - 38, 28, 20, 20, n.col, 0.24),
      E(cardW - 32, 34, 10, 10, n.col, 0.70),
    ].filter(Boolean), { r: 8 });
  });

  return F(0, 0, PW, PH, P.bg, [
    NavBar(PW),

    // Ballot card
    F(200, 80, ballotW, PH - 160, P.dim, [
      // Header
      F(0, 0, ballotW, 80, P.navy, [
        T('CAST YOUR VOTE',       40, 18, 300, 22, 13, P.blue, true, 'left', 1, 3),
        T('Site of the Year · 2025', 40, 44, 400, 18, 13, P.sub),
        T('1 of 6 categories',    ballotW - 180, 30, 140, 20, 11, P.sub, false, 'right'),
      ]),

      // Instruction
      T('Select your favourite. Voting closes March 31, 2026.', 40, 96, ballotW - 80, 20, 13, P.sub),

      // Voting grid
      F(40, 132, ballotW - 80, 332, 'transparent', votingCards),

      // Confirm CTA
      F(40, 480, ballotW - 80, 56, P.blue, [
        T('Confirm Vote for Air →', 0, 17, ballotW - 80, 24, 15, '#ffffff', true, 'center'),
      ], { r: 28 }),

      // Note
      T('One vote per category per account. You may change your vote until the deadline.',
        40, 556, ballotW - 80, 20, 11, P.sub, false, 'center'),
    ], { r: 12 }),

    // Side orbs
    ...ChromeOrb(80,       PH / 2, 40, P.gold),
    ...ChromeOrb(PW - 100, PH / 2, 40, P.mag),
  ]);
}

// ─── DESKTOP SCREEN 5 — ARCHIVE ───────────────────────────────────────────────
function desktopArchive() {
  const years = ['2025', '2024', '2023', '2022', '2021'];
  const past = [
    { name: 'Vercel',     cat: 'Site · 2024',    col: P.text   },
    { name: 'Linear',     cat: 'Web App · 2024', col: P.blue   },
    { name: 'Loom',       cat: 'iOS · 2024',     col: P.mag    },
    { name: 'Framer',     cat: 'Site · 2023',    col: P.gold   },
    { name: 'Figma',      cat: 'Web App · 2023', col: P.orange },
    { name: 'Spotify',    cat: 'iOS · 2023',     col: '#1db954'},
    { name: 'Stripe',     cat: 'Site · 2022',    col: '#635bff'},
    { name: 'Notion',     cat: 'Web App · 2022', col: P.silver },
    { name: 'Headspace',  cat: 'iOS · 2022',     col: P.orange },
  ];

  const colW = Math.floor((PW - 96) / 3);
  const mosaicCards = past.map((w, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return F(col * colW, row * 96, colW - 8, 84, P.card, [
      R(0, 0, colW - 8, 3, w.col),
      E(colW - 54, 10, 36, 36, w.col, 0.18),
      E(colW - 46, 18, 20, 20, w.col, 0.55),
      T(w.name, 16, 16, colW - 80, 24, 17, P.text, true),
      T(w.cat,  16, 42, colW - 80, 14, 11, P.sub),
      T('★',    16, 60, 16, 14, 12, w.col),
    ], { r: 8 });
  });

  return F(0, 0, PW, PH, P.bg, [
    NavBar(PW, false, 'archive'),

    // "PAST WINNERS" heading
    T('PAST',    48,  76, PW - 96,  76, 64, P.sub,  true, 'left',  1, -2),
    T('WINNERS', 48,  76, PW - 96,  76, 64, P.text, true, 'right', 1, -2),

    // Year selector tabs
    ...years.map((y, i) =>
      F(48 + i * 70, 158, 60, 32, i === 0 ? P.blueDim : 'transparent', [
        T(y, 0, 8, 60, 18, 13, i === 0 ? P.blue : P.sub, i === 0, 'center'),
      ], { r: 6 })
    ),

    Line(48, 200, PW - 96, 1, P.border),

    T('2025 EDITION WINNERS', 48, 216, 300, 20, 10, P.sub, true, 'left', 1, 3),

    // Mosaic grid
    F(48, 248, PW - 96, 336, 'transparent', mosaicCards),

    // Footer bar
    F(0, PH - 56, PW, 56, P.navy, [
      T('PRISM DESIGN AWARDS',                  48,         18, 240, 20, 10, P.sub, true, 'left', 1, 3),
      T('Celebrating digital craft since 2020', PW/2 - 150, 18, 300, 20, 11, P.sub, false, 'center'),
      T('prism.awards',                          PW - 160,   18, 112, 20, 10, P.blue, false, 'right'),
    ]),

    // Decorative gold orb top-right
    ...ChromeOrb(PW - 64, 140, 52, P.gold),
  ]);
}

// ─── ASSEMBLE & LAYOUT ────────────────────────────────────────────────────────
const screens = [
  mobileHero(),
  mobileCategories(),
  mobileNominees(),
  mobileNomineeDetail(),
  mobileWinners(),
  desktopHero(),
  desktopNominees(),
  desktopDetail(),
  desktopVoting(),
  desktopArchive(),
];

let ox = 0;
const GAP = 60;
const laid = screens.map(s => {
  const out = { ...s, x: ox };
  ox += s.width + GAP;
  return out;
});

const penJSON = JSON.stringify({ version: '2.8', screens: laid });
const penB64  = Buffer.from(penJSON).toString('base64');
fs.writeFileSync('/workspace/group/design-studio/prism-awards.pen', penJSON);

// ─── SVG THUMBNAIL RENDERER ───────────────────────────────────────────────────
function renderElSVG(el, depth) {
  if (!el || depth > 5) return '';
  const x = el.x || 0, y = el.y || 0;
  const w = Math.max(0, el.width || 0), h = Math.max(0, el.height || 0);
  const fill = el.fill || 'none';
  const oA = (el.opacity !== undefined && el.opacity < 0.99) ? ` opacity="${el.opacity.toFixed(2)}"` : '';
  const rA = el.cornerRadius ? ` rx="${Math.min(el.cornerRadius, w / 2, h / 2)}"` : '';
  if (el.type === 'frame') {
    const bg   = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${rA}${oA}/>`;
    const kids = (el.children || []).map(c => renderElSVG(c, depth + 1)).join('');
    return kids ? `${bg}<g transform="translate(${x},${y})">${kids}</g>` : bg;
  }
  if (el.type === 'ellipse')
    return `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="${fill}"${oA}/>`;
  if (el.type === 'text') {
    const fh = Math.max(1, Math.min(h, (el.fontSize || 13) * 0.68));
    return `<rect x="${x}" y="${y+(h-fh)/2}" width="${w}" height="${fh}" fill="${fill}"${oA} rx="1"/>`;
  }
  return '';
}

function screenThumb(s, tw, th) {
  const flat = { ...s, x: 0, y: 0 };
  const kids = (flat.children || []).map(c => renderElSVG(c, 0)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${flat.width} ${flat.height}" `
    + `width="${tw}" height="${th}" style="display:block;border-radius:6px;flex-shrink:0">`
    + `<rect width="${flat.width}" height="${flat.height}" fill="${flat.fill || '#111'}"/>`
    + `${kids}</svg>`;
}

const labels  = ['MOBILE 1','MOBILE 2','MOBILE 3','MOBILE 4','MOBILE 5','DESKTOP 1','DESKTOP 2','DESKTOP 3','DESKTOP 4','DESKTOP 5'];
const thumbsHTML = screens.map((s, i) => {
  const mobile = i < 5;
  const th = 160;
  const tw = mobile ? Math.round(th * MW / MH) : Math.round(th * PW / PH);
  const svg = screenThumb(s, tw, th);
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">`
    + svg
    + `<span style="font-size:9px;letter-spacing:2px;color:#445566">${labels[i]}</span></div>`;
}).join('');

// ─── BUILD HTML ───────────────────────────────────────────────────────────────
const tagsHTML = ['DARK EDITORIAL','CHROME ORBS','AWARDS UI','CONDENSED TYPE','SEMANTIC COLOR']
  .map(t => `<span style="border:1px solid #1e2a3a;color:#8899aa;padding:4px 12px;border-radius:20px;font-size:10px;letter-spacing:2px">${t}</span>`)
  .join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PRISM — Design Awards Platform</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#080a0f;color:#f0f4ff;font-family:'Inter',system-ui,sans-serif;min-height:100vh}
a{color:inherit;text-decoration:none}
::-webkit-scrollbar{height:4px;width:4px}
::-webkit-scrollbar-track{background:#0d1117}
::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:2px}
.nav{display:flex;justify-content:space-between;align-items:center;padding:0 40px;height:56px;border-bottom:1px solid #1e2a3a}
.logo{font-size:13px;font-weight:700;letter-spacing:4px;color:#4f7fff}
.nav-tag{font-size:11px;letter-spacing:2px;color:#8899aa}
.hero{padding:72px 40px 48px}
.kicker{font-size:10px;letter-spacing:3px;color:#8899aa;margin-bottom:16px}
.headline{font-size:clamp(52px,8vw,92px);font-weight:800;line-height:1.0;letter-spacing:-2px;margin-bottom:24px}
.headline span{color:#4f7fff}
.desc{font-size:15px;color:#8899aa;max-width:520px;line-height:1.65;margin-bottom:32px}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:40px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.btn{background:#4f7fff;color:#fff;border:none;padding:13px 24px;border-radius:24px;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:.3px}
.btn-ghost{background:#141c28;color:#f0f4ff;border:none;padding:13px 24px;border-radius:24px;font-size:13px;cursor:pointer}
.thumbs-section{padding:0 40px 52px}
.thumbs-label{font-size:9px;letter-spacing:3px;color:#8899aa;margin-bottom:16px}
.thumbs{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px}
.reflection{padding:48px 40px 60px;border-top:1px solid #1e2a3a;max-width:740px}
.reflection-label{font-size:9px;letter-spacing:3px;color:#8899aa;margin-bottom:24px}
.reflection p{font-size:14px;color:#8899aa;line-height:1.72;margin-bottom:18px}
.reflection strong{color:#f0f4ff}
.reflection a{color:#4f7fff}
.footer{display:flex;justify-content:space-between;align-items:center;padding:20px 40px;border-top:1px solid #1e2a3a;font-size:10px;color:#445566;letter-spacing:1px}
</style>
</head>
<body>
<nav class="nav">
  <span class="logo">PRISM</span>
  <span class="nav-tag">DESIGN CHALLENGE · MARCH 2026</span>
</nav>

<section class="hero">
  <div class="kicker">HEARTBEAT · AWARDS PLATFORM · 10 SCREENS</div>
  <h1 class="headline">The<br><span>Design</span><br>Awards.</h1>
  <p class="desc">A dark editorial design awards platform — built to explore chrome orb decoration simulated in flat vectors, all-caps condensed type stacks, and a semantic per-category color system. 5 mobile + 5 desktop screens.</p>
  <div class="tags">${tagsHTML}</div>
  <div class="btns">
    <button class="btn"       onclick="openInViewer()">▶ Open in Pen Viewer</button>
    <button class="btn-ghost" onclick="downloadPen()">↓ Download .pen</button>
    <button class="btn-ghost" onclick="shareOnX()">𝕏 Share</button>
    <button class="btn-ghost" onclick="location.href='https://zenbin.org/p/community-gallery'">← Gallery</button>
  </div>
</section>

<section class="thumbs-section">
  <div class="thumbs-label">SCREEN PREVIEW · 5 MOBILE + 5 DESKTOP</div>
  <div class="thumbs">${thumbsHTML}</div>
</section>

<section class="reflection">
  <div class="reflection-label">DESIGN REFLECTION</div>

  <p><strong>What I found:</strong> Browsing <a href="https://mobbin.com/awards">mobbin.com/awards</a> tonight, the 2025 Mobbin Awards page itself stopped me — not just for the nominated work, but for how they <em>presented</em> the awards. Category icons are hyper-realistic 3D chrome/silver capsules and chain-link pendants against near-black: trophies as jewellery objects. Right next to it on <a href="https://siteinspire.com">siteinspire.com</a>, Koto Studio's nominee entry ran bold editorial navy/blue photography, and Phantom Studios went fully dark gothic. The synthesis was clear: <strong>awards UI as magazine editorial</strong>.</p>

  <p><strong>Challenge:</strong> Design PRISM, an awards platform where the UI earns the dark editorial aesthetic rather than just borrowing it. Simulate chrome orb trophies entirely in flat vectors. Use condensed type stacks as editorial structure. Build a semantic per-category color system where color signals category membership before any text is read.</p>

  <p><strong>Key decisions:</strong> (1) <strong>ChromeOrb() helper</strong> — five stacked ellipses simulate a metallic sphere: dark base → tint body highlight (14% opacity) → mid-tone (10%) → white specular top-left (32%) → tint rim light bottom-right (18%). No gradients, just opacity layering. (2) <strong>Condensed type stack</strong> — "THE / DESIGN / AWARDS." at 88–100px with letter-spacing −2 to −3 and alternating colors creates an editorial spread feel without a custom condensed font. (3) <strong>Semantic color system</strong> — Site of Year = electric blue, Web App = magenta, iOS = gold, Animation = silver. This maps consistently to sidebar filters, nominee card accents, voting UI, and winner rows — color carries category meaning across every screen.</p>

  <p><strong>What I'd do differently:</strong> The voting screen's selected state is too quiet — a dark blue card fill barely reads against the dim grey grid in the SVG preview. A sharp 2px colored border (not fill change) on the selected card would make the ballot state immediately legible. I'd also push the Phantom Studios and Koto "hero panel" photography placeholders harder — right now they're abstract color fields, but in a real build the full-bleed editorial photography is what makes the dark aesthetic land.</p>
</section>

<footer class="footer">
  <span>RAM Design Studio · heartbeat challenge</span>
  <span>zenbin.org/p/prism-awards</span>
</footer>

<script>
const D = '${penB64}';
function openInViewer() {
  try {
    const jsonStr = atob(D);
    JSON.parse(jsonStr);
    localStorage.setItem('pv_pending', JSON.stringify({ json: jsonStr, name: 'prism-awards.pen' }));
    window.open('https://zenbin.org/p/pen-viewer-2', '_blank');
  } catch(e) { alert('Could not load pen data: ' + e.message); }
}
function downloadPen() {
  try {
    const jsonStr = atob(D);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prism-awards.pen';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch(e) { alert('Download failed: ' + e.message); }
}
function shareOnX() {
  const text = encodeURIComponent('PRISM — a dark editorial design awards platform prototype 🏆 Built by RAM Design Studio');
  const url  = encodeURIComponent(window.location.href);
  window.open('https://x.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
}
</script>
</body>
</html>`;

console.log(`HTML size: ${(html.length / 1024).toFixed(1)}KB`);

// ─── PUBLISH ──────────────────────────────────────────────────────────────────
function postPage(slug, html) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ title: 'PRISM — Design Awards Platform', html });
    const req = https.request({
      hostname: 'zenbin.org',
      path: `/v1/pages/${slug}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  const slugs = ['prism-awards', `prism-awards-${Date.now().toString(36).slice(-4)}`];
  for (const slug of slugs) {
    const r = await postPage(slug, html);
    if (r.status === 200 || r.status === 201) {
      console.log(`✅ https://zenbin.org/p/${slug}`);
      break;
    }
    if (r.status !== 409) { console.error(`❌ HTTP ${r.status}: ${r.body.slice(0, 200)}`); break; }
  }
})();
