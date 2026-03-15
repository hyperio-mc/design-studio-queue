#!/usr/bin/env node
// MANIFEST — Creative Studio Project Tracker
// Heartbeat Challenge inspired by:
//   - Silencio.es (godly.website) — brutalist commercial invoice / receipt aesthetic,
//     monospaced spec-table layout, wide-spaced all-caps, barcode motifs
//   - Dockly TMS (Dribbble trending) — logistics tracking, cargo manifest data density
//   - Receipt-as-product-UI — financial paper, thermal printer ink, stamp marks

const https = require('https');
const fs    = require('fs');

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const P = {
  bg:       '#0F0F0D',  // near-black warm void
  canvas:   '#1A1814',  // raised surface
  card:     '#201E1A',  // card bg (dark paper)
  paper:    '#EAE2D2',  // receipt paper cream
  paperDim: '#C8BEA8',  // aged paper / secondary text on paper
  ink:      '#1A1714',  // dark ink
  inkDim:   '#5C4F44',  // faded ink / secondary on paper
  accent:   '#FF3B2F',  // thermal printer red
  accentDim:'#3D0A07',  // dark red surface
  gold:     '#C9A84C',  // monetary / approved gold
  goldDim:  '#2A2000',  // dark gold surface
  green:    '#2E7D44',  // delivered / complete
  greenDim: '#0D2A16',  // dark green surface
  text:     '#EAE2D2',  // primary text (paper on dark)
  sub:      '#7A6E62',  // secondary text
  border:   '#2A2420',  // subtle border
  stamp:    '#FF3B2F',  // approval stamp
};

const MW = 375, MH = 812;    // mobile canvas
const PW = 1440, PH = 900;   // desktop canvas

let idC = 1;
const uid = () => `e${idC++}`;

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const F = (x, y, w, h, fill, children = [], opts = {}) => ({
  id: uid(), type: 'frame', x, y, width: w, height: h, fill,
  cornerRadius: opts.r || 0, opacity: opts.op !== undefined ? opts.op : 1,
  children: children.filter(Boolean),
});
const R = (x, y, w, h, fill, opts = {}) => F(x, y, w, h, fill, [], opts);
const E = (x, y, w, h, fill, op = 1) => ({
  id: uid(), type: 'ellipse', x, y, width: w, height: h, fill, opacity: op,
});
const T = (text, x, y, w, h, size, color, bold = false, align = 'left', op = 1, ls = 0) => ({
  id: uid(), type: 'text', x, y, width: w, height: h, text,
  fontSize: size, fill: color, fontWeight: bold ? 700 : 400,
  textAlign: align, opacity: op, letterSpacing: ls,
});
const Line = (x, y, w, h, fill, op = 1) => R(x, y, w, h, fill, { op });

// ─── BARCODE DECORATION ───────────────────────────────────────────────────────
// Simulates a thermal-printer barcode using 5 grouped bands (keeps JSON small)
function Barcode(x, y, w, h, color, op = 0.55) {
  // Five visual bands at proportional widths — suggests barcode rhythm without 24 rects
  const bands = [
    { start: 0.00, end: 0.28 },
    { start: 0.31, end: 0.46 },
    { start: 0.49, end: 0.62 },
    { start: 0.65, end: 0.82 },
    { start: 0.85, end: 1.00 },
  ];
  return bands.map(b =>
    R(x + Math.round(w * b.start), y, Math.round(w * (b.end - b.start)), h, color, { op })
  );
}

// ─── RECEIPT ROW ──────────────────────────────────────────────────────────────
// Two-column row: label + value — the core invoice line item pattern
function Row(x, y, w, label, value, labelCol, valueCol, bold = false, bgFill = 'transparent') {
  return F(x, y, w, 28, bgFill, [
    T(label, 12,  6, w * 0.58, 18,  11, labelCol, false, 'left',  1, 1.5),
    T(value, w * 0.6, 6, w * 0.38, 18, 11, valueCol, bold,  'right', 1, 0.5),
  ]);
}

// ─── STATUS STAMP ─────────────────────────────────────────────────────────────
function Stamp(x, y, label, col) {
  return F(x, y, 72, 20, 'transparent', [
    R(0, 0, 72, 20, col, { op: 0.12, r: 2 }),
    T(label, 0, 4, 72, 14, 8, col, true, 'center', 1, 2),
  ]);
}

// ─── MANIFEST HEADER BLOCK ────────────────────────────────────────────────────
// The bold receipt-style document header used across screens
function ManifestHeader(x, y, w, docNo, date, isMobile = true) {
  const fontSize = isMobile ? 11 : 13;
  return F(x, y, w, 56, P.bg, [
    T('MANIFEST',        0,  0, w * 0.5, 22, isMobile ? 18 : 22, P.text,     true, 'left', 1, 4),
    T('STUDIO',          0,  0, w,       22, isMobile ? 18 : 22, P.accent,   true, 'right',1, 4),
    Line(0, 26, w, 1, P.border),
    T(`NO. ${docNo}`,    0, 34, w * 0.5, 16, fontSize, P.sub,  false, 'left',  1, 1.5),
    T(date,              0, 34, w,       16, fontSize, P.sub,  false, 'right', 1, 1),
  ]);
}

// ─── PROJECT CARD (invoice line item style) ───────────────────────────────────
function ProjectCard(x, y, w, name, client, status, progress, col, dueLabel) {
  const statusCols = { 'IN TRANSIT': P.gold, 'DELIVERED': P.green, 'ON HOLD': P.sub, 'DRAFTING': P.accent };
  const sc = statusCols[status] || P.sub;
  return F(x, y, w, 76, P.card, [
    R(0, 0, 3, 76, col),
    T(name,       12, 10, w - 100, 20, 14, P.text, true,  'left',  1, 0.5),
    T(client,     12, 32, w - 100, 14, 10, P.sub,  false, 'left',  1, 1),
    // Progress bar
    R(12, 54, w - 88, 4, P.border, { r: 2 }),
    R(12, 54, Math.round((w - 88) * progress), 4, col, { r: 2 }),
    // Status stamp
    Stamp(w - 80, 10, status, sc),
    T(dueLabel, w - 80, 30, 68, 14, 9, P.sub, false, 'right', 1, 1),
    T(`${Math.round(progress * 100)}%`, w - 36, 50, 36, 14, 9, col, true, 'right'),
  ], { r: 4 });
}

// ─── MOBILE SCREEN 1 — DASHBOARD ──────────────────────────────────────────────
function mobileDashboard() {
  const projects = [
    { name: 'Brand Identity – Volta',  client: 'Volta Energy',   status: 'IN TRANSIT', progress: 0.68, col: P.gold,   due: 'DUE 28 MAR' },
    { name: 'Website Redesign – Arca', client: 'Arca Studio',    status: 'IN TRANSIT', progress: 0.41, col: P.accent, due: 'DUE 04 APR' },
    { name: 'Campaign – Miren',        client: 'Miren Foods',    status: 'DELIVERED',  progress: 1.00, col: P.green,  due: 'FILED' },
    { name: 'App UI – Corvo',          client: 'Corvo Labs',     status: 'DRAFTING',   progress: 0.12, col: P.sub,    due: 'DUE 20 APR' },
  ];

  return F(0, 0, MW, MH, P.bg, [
    // Status bar
    T('9:41', 16, 14, 60, 16, 11, P.sub),
    T('●●●', MW - 50, 14, 44, 16, 9, P.sub, false, 'right'),

    // Header
    F(16, 40, MW - 32, 56, P.bg, [
      T('MANIFEST', 0, 0, 160, 22, 18, P.text, true, 'left', 1, 4),
      T('STUDIO',   0, 0, MW - 32, 22, 18, P.accent, true, 'right', 1, 4),
      Line(0, 26, MW - 32, 1, P.border),
      T('NO. 2026-0315', 0, 34, 140, 16, 10, P.sub, false, 'left', 1, 1.5),
      T('15 MAR 2026',   0, 34, MW - 32, 16, 10, P.sub, false, 'right', 1, 1),
    ]),

    // KPI strip
    F(0, 112, MW, 56, P.canvas, [
      Line(0, 0, MW, 1, P.border),
      F(16,   8, 72, 40, P.bg, [
        T('4',       0,  2, 72, 20, 18, P.accent, true,  'center', 1, 0),
        T('ACTIVE',  0, 22, 72, 14,  8, P.sub,    false, 'center', 1, 2),
      ], { r: 4 }),
      F(100,  8, 72, 40, P.bg, [
        T('2',       0,  2, 72, 20, 18, P.gold,  true,  'center', 1, 0),
        T('DUE SOON',0, 22, 72, 14,  8, P.sub,   false, 'center', 1, 2),
      ], { r: 4 }),
      F(184,  8, 72, 40, P.bg, [
        T('1',       0,  2, 72, 20, 18, P.green, true,  'center', 1, 0),
        T('FILED',   0, 22, 72, 14,  8, P.sub,   false, 'center', 1, 2),
      ], { r: 4 }),
      F(268,  8, 72, 40, P.bg, [
        T('87%',     0,  2, 72, 20, 18, P.text,  true,  'center', 1, 0),
        T('ON TIME', 0, 22, 72, 14,  8, P.sub,   false, 'center', 1, 2),
      ], { r: 4 }),
      Line(0, 55, MW, 1, P.border),
    ]),

    // Section label
    T('ACTIVE MANIFESTS', 16, 182, MW - 32, 14, 9, P.sub, true, 'left', 1, 3),

    // Project cards
    ...projects.map((p, i) =>
      ProjectCard(16, 204 + i * 88, MW - 32, p.name, p.client, p.status, p.progress, p.col, p.due)
    ),

    // Barcode footer decoration
    ...Barcode(16, MH - 68, MW - 32, 24, P.sub, 0.3),
    T('MANIFEST STUDIO — RAM DESIGN',  MW / 2 - 100, MH - 40, 200, 14, 8, P.sub, false, 'center', 0.5, 2),

    // Home bar
    R(MW / 2 - 67, MH - 18, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 2 — NEW PROJECT FORM ──────────────────────────────────────
function mobileNewProject() {
  const fields = [
    { label: 'PROJECT REF.',  placeholder: 'MFT-2026-0005' },
    { label: 'CLIENT',        placeholder: 'Client name or entity' },
    { label: 'DELIVERABLE',   placeholder: 'e.g. Brand Identity' },
    { label: 'VALUE',         placeholder: '€ 0.00' },
    { label: 'DUE DATE',      placeholder: 'DD MMM YYYY' },
    { label: 'CONSIGNEE',     placeholder: 'Assigned studio member' },
  ];

  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),

    // Header
    F(16, 40, MW - 32, 40, P.bg, [
      T('← MANIFESTS', 0, 10, 120, 20, 11, P.sub, false, 'left', 1, 1.5),
      T('RAISE ORDER', 0, 8, MW - 32, 24, 14, P.text, true, 'right', 1, 2),
    ]),

    Line(0, 88, MW, 1, P.border),

    // Document number and stamp area
    F(16, 100, MW - 32, 44, P.canvas, [
      T('NEW MANIFEST ORDER', 0, 10, MW - 80, 14, 9, P.sub, true, 'left', 1, 3),
      T(`DRAFT — ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()}`,
        0, 10, MW - 32, 14, 9, P.accent, true, 'right', 1, 2),
      ...Barcode(0, 28, 180, 12, P.sub, 0.2),
    ]),

    // Form fields — invoice style
    ...fields.map((f, i) =>
      F(16, 156 + i * 64, MW - 32, 56, P.canvas, [
        T(f.label,       12,  6, MW - 56, 14,  9, P.sub,   true,  'left', 1, 2),
        Line(12, 24, MW - 56, 1, P.border),
        T(f.placeholder, 12, 30, MW - 56, 20, 13, P.sub,   false, 'left', 0.5),
      ], { r: 3 })
    ),

    // CTA
    F(16, 550, MW - 32, 48, P.accent, [
      T('ISSUE MANIFEST →', 0, 14, MW - 32, 22, 13, '#fff', true, 'center', 1, 2),
    ], { r: 4 }),

    R(MW / 2 - 67, MH - 18, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 3 — PROJECT DETAIL ────────────────────────────────────────
function mobileProjectDetail() {
  const tasks = [
    { name: 'Logo concepts (×3)',    status: 'FILED',    hours: '8.0', col: P.green  },
    { name: 'Brand guidelines doc',  status: 'IN TRANSIT',hours: '6.5', col: P.gold   },
    { name: 'Colour system',         status: 'IN TRANSIT',hours: '4.0', col: P.gold   },
    { name: 'Type specimen',         status: 'DRAFTING', hours: '3.0', col: P.sub    },
    { name: 'Presentation deck',     status: 'DRAFTING', hours: '—',   col: P.sub    },
  ];

  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),

    // Project header
    F(16, 36, MW - 32, 72, P.canvas, [
      T('VOLTA ENERGY', 0, 8, MW - 32, 18, 11, P.sub, true, 'left', 1, 3),
      T('Brand Identity', 0, 28, MW - 120, 28, 18, P.text, true, 'left', 1, 0),
      Stamp(MW - 104, 28, 'IN TRANSIT', P.gold),
      Line(0, 62, MW - 32, 1, P.border),
      T('MFT-2026-0001', 0, 50, 140, 14, 9, P.sub, false, 'left', 1, 1.5),
      T('DUE 28 MAR 2026', 0, 50, MW - 32, 14, 9, P.gold, true, 'right', 1, 1),
    ]),

    // Progress
    F(16, 120, MW - 32, 40, P.bg, [
      T('SHIPPED', 0, 6, 80, 14, 9, P.sub, true, 'left', 1, 2),
      T('1 / 5 LINE ITEMS', 80, 6, MW - 112, 14, 9, P.gold, true, 'left', 1, 1.5),
      R(0, 26, MW - 32, 4, P.border, { r: 2 }),
      R(0, 26, Math.round((MW - 32) * 0.2), 4, P.gold, { r: 2 }),
    ]),

    // Line items header
    Line(16, 168, MW - 32, 1, P.accent, { op: 0.3 }),
    T('LINE ITEM', 16, 174, 140, 14, 8, P.sub, true, 'left', 1, 2),
    T('STATUS',    MW / 2, 174, 80, 14, 8, P.sub, true, 'left', 1, 2),
    T('HRS', MW - 52, 174, 36, 14, 8, P.sub, true, 'right', 1, 2),
    Line(16, 188, MW - 32, 1, P.border),

    // Task rows
    ...tasks.map((t, i) =>
      F(16, 192 + i * 44, MW - 32, 40, i % 2 === 0 ? P.bg : P.canvas, [
        R(0, 12, 3, 18, t.col),
        T(t.name,   10, 12, 148, 16, 11, P.text, false, 'left'),
        T(t.status, MW / 2 - 16, 12, 80, 16, 9, t.col, true, 'left', 1, 1),
        T(t.hours,  MW - 52, 12, 36, 16, 11, P.sub, false, 'right'),
      ])
    ),

    // Subtotal footer
    Line(16, 416, MW - 32, 1, P.accent, { op: 0.4 }),
    Row(16, 420, MW - 32, 'TOTAL HOURS', '21.5 HRS', P.sub, P.text, true, P.bg),
    Row(16, 452, MW - 32, 'BUDGET', '€ 4,800', P.sub, P.gold, true, P.bg),

    // Invoice footer
    ...Barcode(16, MH - 100, MW - 32, 28, P.sub, 0.25),
    T('MANIFEST STUDIO', MW / 2 - 70, MH - 68, 140, 14, 8, P.sub, false, 'center', 0.4, 3),

    R(MW / 2 - 67, MH - 18, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 4 — TIME LOG ──────────────────────────────────────────────
function mobileTimeLog() {
  const entries = [
    { time: '10:15', project: 'Volta — Brand',     task: 'Logo refinements',   hrs: '3.5' },
    { time: '14:00', project: 'Arca — Website',    task: 'Wireframe review',    hrs: '2.0' },
    { time: '16:30', project: 'Volta — Brand',     task: 'Colour system',       hrs: '1.5' },
    { time: '18:00', project: 'Corvo — App UI',    task: 'Kickoff research',    hrs: '1.0' },
  ];

  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),

    // Header
    F(16, 36, MW - 32, 48, P.bg, [
      T('HOURS', 0, 2, 100, 28, 18, P.text, true, 'left', 1, 3),
      T('LOGGED', 0, 2, MW - 32, 28, 18, P.accent, true, 'right', 1, 3),
      T('TODAY · 15 MAR 2026', 0, 34, MW - 32, 14, 8, P.sub, true, 'left', 1, 2),
    ]),

    Line(0, 90, MW, 1, P.border),

    // Running total receipt tape
    F(16, 100, MW - 32, 52, P.canvas, [
      T('RUNNING TOTAL',   12, 8, 160, 14, 8, P.sub, true, 'left', 1, 3),
      T('8.0 HRS', 12, 26, MW - 56, 24, 20, P.text, true, 'right', 1, 0),
    ], { r: 3 }),

    // Column headers
    T('TIME',    16,  164, 48,  14, 8, P.sub, true, 'left',  1, 2),
    T('PROJECT', 70,  164, 160, 14, 8, P.sub, true, 'left',  1, 2),
    T('HRS',     MW - 52, 164, 36, 14, 8, P.sub, true, 'right', 1, 2),
    Line(16, 178, MW - 32, 1, P.border),

    // Time entries
    ...entries.map((e, i) =>
      F(16, 182 + i * 76, MW - 32, 68, i % 2 === 0 ? P.bg : P.canvas, [
        T(e.time,    8, 10, 48,  16, 11, P.gold,  true,  'left'),
        T(e.project, 62, 8,  MW - 130, 16, 11, P.text, true,  'left'),
        T(e.hrs,     MW - 52, 10, 36, 16, 14, P.accent, true,  'right'),
        T(e.task,    62, 28, MW - 130, 14, 10, P.sub,  false, 'left'),
        // mini progress nub
        R(8, 48, MW - 48, 2, P.border),
      ])
    ),

    // Add entry CTA
    F(16, 492, MW - 32, 44, P.accentDim, [
      R(0, 0, MW - 32, 44, P.accent, { op: 0.12, r: 4 }),
      T('+ LOG HOURS', 0, 13, MW - 32, 20, 12, P.accent, true, 'center', 1, 3),
    ], { r: 4 }),

    // Week summary
    Line(16, 548, MW - 32, 1, P.border),
    T('WEEK SUMMARY', 16, 560, 140, 14, 8, P.sub, true, 'left', 1, 3),
    ...[
      ['MON', '6.5'], ['TUE', '7.0'], ['WED', '5.5'], ['THU', '8.0'], ['FRI', '3.0']
    ].map(([day, hrs], i) => F(16 + i * 68, 578, 60, 52, P.canvas, [
      T(day, 0, 6,  60, 14, 8, P.sub, true,  'center', 1, 2),
      T(hrs, 0, 24, 60, 20, 14, i === 3 ? P.accent : P.text, true, 'center'),
      R(10, 46, 40, 3, i <= 3 ? P.sub : P.border, { r: 2, op: i <= 3 ? 0.4 : 0.2 }),
    ], { r: 3 })),

    R(MW / 2 - 67, MH - 18, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── MOBILE SCREEN 5 — TEAM ───────────────────────────────────────────────────
function mobileTeam() {
  const members = [
    { name: 'Rosa Linares',  role: 'ART DIRECTOR',    load: 3, cap: 4, col: P.accent },
    { name: 'Daan Voss',     role: 'BRAND DESIGNER',  load: 2, cap: 3, col: P.gold   },
    { name: 'Yui Nakamura',  role: 'MOTION',          load: 1, cap: 2, col: P.green  },
    { name: 'Luca Ferretti', role: 'WEB DESIGNER',    load: 2, cap: 3, col: P.sub    },
  ];

  return F(0, 0, MW, MH, P.bg, [
    T('9:41', 16, 14, 60, 16, 11, P.sub),

    // Header
    F(16, 36, MW - 32, 40, P.bg, [
      T('CONSIGNEES', 0, 6, MW - 32, 28, 16, P.text, true, 'left', 1, 3),
      T('4 MEMBERS',  0, 6, MW - 32, 28, 12, P.sub, false, 'right', 1, 2),
    ]),

    Line(0, 82, MW, 1, P.border),

    // Studio capacity bar
    F(16, 92, MW - 32, 44, P.canvas, [
      T('STUDIO CAPACITY', 12, 6, 180, 14, 8, P.sub, true, 'left', 1, 3),
      T('8 / 12 ITEMS', 12, 24, MW - 56, 16, 11, P.text, true, 'right'),
      R(12, 24, MW - 56, 4, P.border, { r: 2 }),
      R(12, 24, Math.round((MW - 56) * (8 / 12)), 4, P.accent, { r: 2 }),
    ], { r: 3 }),

    // Member rows
    ...members.map((m, i) =>
      F(16, 148 + i * 96, MW - 32, 84, P.card, [
        R(0, 0, 3, 84, m.col),
        // Avatar placeholder
        E(20, 22, 36, 36, m.col, 0.18),
        E(26, 28, 24, 24, m.col, 0.30),
        T(m.name.split(' ')[0].slice(0, 1) + m.name.split(' ')[1]?.slice(0, 1),
          23, 32, 30, 20, 12, m.col, true, 'center'),
        T(m.name,   68, 10, MW - 120, 20, 14, P.text, true),
        T(m.role,   68, 32, MW - 120, 14, 9,  P.sub,  false, 'left', 1, 2),
        // Capacity dots
        T('LOAD',    68, 54, 36, 12, 8, P.sub, true, 'left', 1, 2),
        ...[0,1,2,3].map(j =>
          E(108 + j * 20, 54, 12, 12, j < m.load ? m.col : P.border, j < m.load ? 0.8 : 0.3)
        ),
        Stamp(MW - 96, 54, m.load >= m.cap ? 'AT CAPACITY' : 'AVAILABLE', m.load >= m.cap ? P.accent : P.green),
      ], { r: 4 })
    ),

    R(MW / 2 - 67, MH - 18, 134, 5, P.border, { r: 3 }),
  ]);
}

// ─── DESKTOP SCREEN 1 — STUDIO OVERVIEW ──────────────────────────────────────
function desktopOverview() {
  const projects = [
    { name: 'Brand Identity – Volta Energy',  client: 'Volta',  status: 'IN TRANSIT', progress: 0.68, value: '€ 9,200', col: P.gold,   assignee: 'R. Linares', due: '28 MAR' },
    { name: 'Website Redesign – Arca Studio', client: 'Arca',   status: 'IN TRANSIT', progress: 0.41, value: '€ 6,500', col: P.accent, assignee: 'D. Voss',    due: '04 APR' },
    { name: 'Motion Campaign – Miren Foods',  client: 'Miren',  status: 'DELIVERED',  progress: 1.00, value: '€ 4,800', col: P.green,  assignee: 'Y. Nakamura',due: 'FILED'  },
    { name: 'App UI – Corvo Labs',            client: 'Corvo',  status: 'DRAFTING',   progress: 0.12, value: '€ 12,000',col: P.sub,    assignee: 'D. Voss',    due: '20 APR' },
    { name: 'Type Specimen – Griseo Type',    client: 'Griseo', status: 'ON HOLD',    progress: 0.05, value: '€ 2,200', col: P.sub,    assignee: 'R. Linares', due: 'TBC'    },
  ];

  const colWidths = [380, 90, 110, 120, 120, 160, 80, 90];
  const colLabels = ['PROJECT NAME', 'CLIENT', 'STATUS', 'ASSIGNEE', 'PROGRESS', 'VALUE', 'DUE', ''];
  const tableW = PW - 96;

  const tableHeader = F(48, 128, tableW, 32, P.canvas, [
    ...colLabels.reduce((acc, label, i) => {
      const x = colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      acc.push(T(label, x + 12, 10, colWidths[i], 14, 8, P.sub, true, 'left', 1, 2));
      return acc;
    }, []),
    Line(0, 31, tableW, 1, P.border),
  ]);

  const tableRows = projects.map((p, i) => {
    const sc = { 'IN TRANSIT': P.gold, 'DELIVERED': P.green, 'ON HOLD': P.sub, 'DRAFTING': P.accent }[p.status] || P.sub;
    // Cumulative column x-offsets: [0, 380, 470, 580, 700, 820, 980, 1060]
    const xs = colWidths.reduce((acc, w) => (acc.push(acc[acc.length - 1] + w), acc), [0]).slice(0, -1);
    return F(48, 160 + i * 60, tableW, 56, i % 2 === 0 ? P.bg : P.canvas, [
      R(0, 0, 3, 56, p.col),
      T(p.name,      xs[0] + 12, 18, colWidths[0] - 24, 20, 13, P.text, true),
      T(p.client,    xs[1] + 12, 18, colWidths[1] - 8,  20, 12, P.sub),
      // Status badge
      F(xs[2] + 12, 16, colWidths[2] - 24, 24, 'transparent', [
        R(0, 0, colWidths[2] - 24, 24, sc, { op: 0.12, r: 3 }),
        T(p.status, 0, 5, colWidths[2] - 24, 14, 8, sc, true, 'center', 1, 1.5),
      ]),
      T(p.assignee,  xs[3] + 12, 18, colWidths[3] - 8,  20, 12, P.sub),
      // Progress
      R(xs[4] + 12, 22, colWidths[4] - 24, 4, P.border, { r: 2 }),
      R(xs[4] + 12, 22, Math.round((colWidths[4] - 24) * p.progress), 4, p.col, { r: 2 }),
      T(`${Math.round(p.progress * 100)}%`, xs[4] + 12, 30, colWidths[4] - 24, 14, 9, p.col, true, 'right'),
      T(p.value,     xs[5] + 12, 18, colWidths[5] - 8,  20, 13, P.gold, true),
      T(p.due,       xs[6] + 12, 18, colWidths[6] - 8,  20, 11, p.status === 'DELIVERED' ? P.green : P.sub),
      // Action arrow
      T('→', xs[7] + 12, 18, colWidths[7] - 12, 20, 13, P.sub, false, 'right'),
      Line(0, 55, tableW, 1, P.border),
    ]);
  });

  return F(0, 0, PW, PH, P.bg, [
    // Top bar
    F(0, 0, PW, 64, P.canvas, [
      T('MANIFEST', 48, 20, 160, 28, 16, P.text, true, 'left', 1, 4),
      T('STUDIO',   48, 20, 260, 28, 16, P.accent, true, 'left', 1, 4),
      T('Projects',  320, 22, 80, 22, 13, P.sub),
      T('Time',      408, 22, 60, 22, 13, P.sub),
      T('Team',      476, 22, 60, 22, 13, P.sub),
      T('Archive',   544, 22, 80, 22, 13, P.sub),
      // Metrics right
      T('€ 34,700 CONTRACTED', PW - 340, 24, 292, 18, 11, P.gold, true, 'right', 1, 1.5),
      F(PW - 48 - 120, 16, 120, 32, P.accent, [
        T('+ RAISE ORDER', 0, 9, 120, 16, 10, '#fff', true, 'center', 1, 2),
      ], { r: 4 }),
      Line(0, 63, PW, 1, P.border),
    ]),

    // Page title
    F(48, 76, PW - 96, 44, P.bg, [
      T('ACTIVE', 0, 6, 260, 28, 22, P.sub,  true, 'left', 1, 3),
      T('MANIFESTS', 0, 6, PW - 96, 28, 22, P.text, true, 'right', 1, 3),
      Line(0, 43, PW - 96, 1, P.border),
    ]),

    // Table
    tableHeader,
    ...tableRows,

    // Totals footer
    F(48, 160 + projects.length * 60, tableW, 48, P.canvas, [
      Line(0, 0, tableW, 1, P.border),
      T('SUBTOTAL — 5 MANIFESTS', 12, 14, 400, 20, 10, P.sub, true, 'left', 1, 2),
      T('€ 34,700', tableW - 200, 14, 188, 20, 14, P.gold, true, 'right', 1, 0),
    ]),

    // Barcode strip bottom-right
    ...Barcode(PW - 240, PH - 56, 192, 24, P.sub, 0.2),
    T('MANIFEST STUDIO · RAM DESIGN · 2026', PW - 360, PH - 26, 312, 16, 8, P.sub, false, 'right', 0.4, 2),
  ]);
}

// ─── DESKTOP SCREEN 2 — BOARD VIEW ───────────────────────────────────────────
function desktopBoard() {
  // Kanban columns styled as cargo staging areas
  const cols = [
    {
      label: 'DRAFTING', sublabel: 'PREPARING CARGO', color: P.sub,
      items: [
        { name: 'App UI – Corvo', client: 'Corvo Labs',  hrs: '4 hrs est.', col: P.sub },
        { name: 'Type Specimen',  client: 'Griseo Type', hrs: '—',          col: P.sub },
      ],
    },
    {
      label: 'IN TRANSIT', sublabel: 'EN ROUTE', color: P.gold,
      items: [
        { name: 'Brand Identity',  client: 'Volta Energy',   hrs: '18 hrs logged', col: P.gold   },
        { name: 'Website Redesign',client: 'Arca Studio',    hrs: '12 hrs logged', col: P.accent },
      ],
    },
    {
      label: 'REVIEW', sublabel: 'CUSTOMS CLEARANCE', color: P.accent,
      items: [
        { name: 'Motion Campaign', client: 'Miren Foods',    hrs: '22 hrs total', col: P.green  },
      ],
    },
    {
      label: 'DELIVERED', sublabel: 'FILED', color: P.green,
      items: [
        { name: 'Motion Campaign', client: 'Miren Foods',    hrs: 'CLOSED', col: P.green },
      ],
    },
  ];

  const colW = Math.floor((PW - 96 - 48) / 4);
  const columns = cols.map((c, ci) =>
    F(48 + ci * (colW + 16), 120, colW, PH - 140, 'transparent', [
      // Column header
      F(0, 0, colW, 52, P.canvas, [
        R(0, 0, colW, 3, c.color),
        T(c.label,    12, 10, colW - 24, 18, 11, c.color, true, 'left', 1, 2),
        T(c.sublabel, 12, 30, colW - 24, 16, 9,  P.sub,   false,'left', 1, 2),
        F(colW - 32, 14, 24, 24, 'transparent', [
          R(0, 0, 24, 24, c.color, { op: 0.15, r: 12 }),
          T(String(c.items.length), 0, 5, 24, 16, 11, c.color, true, 'center'),
        ]),
      ], { r: 3 }),

      // Cards
      ...c.items.map((item, ii) =>
        F(0, 64 + ii * 100, colW, 88, P.card, [
          R(0, 0, 3, 88, item.col),
          T(item.name,   12, 12, colW - 80, 20, 13, P.text, true),
          T(item.client, 12, 34, colW - 80, 16, 11, P.sub),
          Line(12, 58, colW - 24, 1, P.border),
          T(item.hrs,    12, 66, colW - 80, 16, 10, P.sub),
          T('→',         colW - 24, 66, 16, 16, 13, P.sub, false, 'right'),
        ], { r: 4 })
      ),

      // Add card button
      F(0, 64 + c.items.length * 100, colW, 40, 'transparent', [
        R(0, 0, colW, 40, c.color, { op: 0.06, r: 4 }),
        T('+ ADD ITEM', 0, 11, colW, 20, 9, c.color, true, 'center', 1, 2),
      ]),
    ])
  );

  return F(0, 0, PW, PH, P.bg, [
    // Nav
    F(0, 0, PW, 64, P.canvas, [
      T('MANIFEST', 48, 20, 160, 28, 16, P.text, true, 'left', 1, 4),
      T('STUDIO',   48, 20, 260, 28, 16, P.accent, true, 'left', 1, 4),
      T('← All Projects', 320, 22, 140, 22, 12, P.sub),
      T('TABLE  ·  BOARD  ·  CALENDAR', PW - 360, 22, 312, 22, 10, P.sub, true, 'right', 1, 2),
      Line(0, 63, PW, 1, P.border),
    ]),

    // Page heading
    F(48, 72, PW - 96, 40, P.bg, [
      T('PROJECT BOARD', 0, 8, 280, 24, 14, P.text, true, 'left', 1, 3),
      T('STAGING AREAS', 0, 8, PW - 96, 24, 14, P.sub, true, 'right', 1, 3),
      Line(0, 39, PW - 96, 1, P.border),
    ]),

    // Columns
    ...columns,
  ]);
}

// ─── DESKTOP SCREEN 3 — PROJECT DETAIL ───────────────────────────────────────
function desktopProjectDetail() {
  const LEFT = 420;

  const lineitems = [
    { name: 'Logo concepts (×3)',    status: 'DELIVERED', hrs: '8.0', value: '€ 960' },
    { name: 'Brand guidelines doc',  status: 'IN TRANSIT',hrs: '6.5', value: '€ 780' },
    { name: 'Colour system',         status: 'IN TRANSIT',hrs: '4.0', value: '€ 480' },
    { name: 'Type specimen',         status: 'DRAFTING',  hrs: '3.0', value: '€ 360' },
    { name: 'Presentation deck',     status: 'DRAFTING',  hrs: '6.0', value: '€ 720' },
  ];

  return F(0, 0, PW, PH, P.bg, [
    // Nav
    F(0, 0, PW, 64, P.canvas, [
      T('MANIFEST', 48, 20, 160, 28, 16, P.text, true, 'left', 1, 4),
      T('STUDIO',   48, 20, 260, 28, 16, P.accent, true, 'left', 1, 4),
      T('← All Manifests', 320, 22, 160, 22, 12, P.sub),
      T('MFT-2026-0001', PW - 200, 22, 152, 22, 11, P.sub, false, 'right', 1, 2),
      Line(0, 63, PW, 1, P.border),
    ]),

    // LEFT PANEL — manifest cover
    F(0, 64, LEFT, PH - 64, P.canvas, [
      Line(0, 0, LEFT, 1, P.border),
      // Bold data stack
      T('VOLTA', 40, 40, LEFT - 80, 22, 12, P.sub, true, 'left', 1, 4),
      T('ENERGY', 40, 40, LEFT - 80, 22, 12, P.accent, true, 'right', 1, 4),
      T('Brand', 40, 80, LEFT - 80, 56, 48, P.text, true, 'left', 1, -1),
      T('Identity', 40, 130, LEFT - 80, 56, 42, P.text, true, 'left', 1, -1),

      Line(40, 200, LEFT - 80, 1, P.border),

      // Manifest spec table
      Row(40, 208, LEFT - 80, 'MANIFEST NO.',    'MFT-2026-0001', P.sub, P.text, true),
      Row(40, 240, LEFT - 80, 'CLIENT',           'Volta Energy GmbH', P.sub, P.text),
      Row(40, 272, LEFT - 80, 'CONTRACT VALUE',   '€ 9,200', P.sub, P.gold, true),
      Row(40, 304, LEFT - 80, 'ISSUED',           '01 MAR 2026', P.sub, P.sub),
      Row(40, 336, LEFT - 80, 'DUE DATE',         '28 MAR 2026', P.sub, P.accent, true),
      Row(40, 368, LEFT - 80, 'CONSIGNEE',        'Rosa Linares', P.sub, P.text),
      Row(40, 400, LEFT - 80, 'STATUS',           'IN TRANSIT', P.sub, P.gold, true),

      Line(40, 436, LEFT - 80, 1, P.border),

      // Progress
      T('MANIFEST PROGRESS', 40, 448, LEFT - 80, 14, 8, P.sub, true, 'left', 1, 3),
      R(40, 470, LEFT - 80, 6, P.border, { r: 3 }),
      R(40, 470, Math.round((LEFT - 80) * 0.68), 6, P.gold, { r: 3 }),
      T('68%  ·  1 OF 5 ITEMS SHIPPED', 40, 484, LEFT - 80, 16, 9, P.gold, true, 'right', 1, 1),

      // Barcode
      ...Barcode(40, PH - 120, LEFT - 80, 32, P.sub, 0.25),
      T('MANIFEST STUDIO — RECEIPT', 40, PH - 80, LEFT - 80, 14, 8, P.sub, false, 'center', 0.4, 2),
      T('***  THANK YOU  ***', 40, PH - 60, LEFT - 80, 14, 9, P.sub, true, 'center', 0.3, 3),
    ]),

    // RIGHT PANEL — line items
    F(LEFT, 64, PW - LEFT, PH - 64, P.bg, [
      // Panel header
      F(0, 0, PW - LEFT, 60, P.bg, [
        T('LINE ITEMS', 40, 18, 200, 20, 12, P.text, true, 'left', 1, 3),
        T('5 DELIVERABLES', 40, 18, PW - LEFT - 80, 20, 11, P.sub, false, 'right', 1, 2),
        Line(0, 59, PW - LEFT, 1, P.border),
      ]),

      // Column headers
      F(0, 60, PW - LEFT, 28, P.canvas, [
        T('ITEM',   40, 8, 280, 14, 8, P.sub, true, 'left',  1, 2),
        T('STATUS', 330, 8, 100, 14, 8, P.sub, true, 'left',  1, 2),
        T('HRS',    440, 8, 60,  14, 8, P.sub, true, 'left',  1, 2),
        T('VALUE',  PW - LEFT - 120, 8, 80, 14, 8, P.sub, true, 'right', 1, 2),
        Line(0, 27, PW - LEFT, 1, P.border),
      ]),

      // Line item rows
      ...lineitems.map((item, i) => {
        const sc = { 'DELIVERED': P.green, 'IN TRANSIT': P.gold, 'DRAFTING': P.sub }[item.status] || P.sub;
        return F(0, 88 + i * 56, PW - LEFT, 52, i % 2 === 0 ? P.bg : P.canvas, [
          R(0, 0, 3, 52, sc),
          T(item.name,   40, 16, 280, 20, 13, P.text, false),
          // Status badge
          F(330, 14, 100, 24, 'transparent', [
            R(0, 0, 100, 24, sc, { op: 0.12, r: 3 }),
            T(item.status, 0, 5, 100, 14, 8, sc, true, 'center', 1, 1.5),
          ]),
          T(item.hrs, 440, 16, 60, 20, 13, P.sub),
          T(item.value, PW - LEFT - 120, 16, 80, 20, 13, P.gold, true, 'right'),
          Line(0, 51, PW - LEFT, 1, P.border),
        ]);
      }),

      // Totals
      F(0, 88 + lineitems.length * 56, PW - LEFT, 52, P.canvas, [
        Line(0, 0, PW - LEFT, 1, P.border),
        T('SUBTOTAL', 40, 14, 280, 20, 10, P.sub, true, 'left', 1, 2),
        T('27.5 HRS', 440, 14, 80,  20, 12, P.sub),
        T('€ 3,300 / € 9,200', PW - LEFT - 180, 14, 140, 20, 12, P.gold, true, 'right'),
      ]),

      // Actions
      F(40, PH - 130, 200, 48, P.accent, [
        T('MARK SHIPPED →', 0, 14, 200, 22, 12, '#fff', true, 'center', 1, 2),
      ], { r: 4 }),
      F(252, PH - 130, 160, 48, P.canvas, [
        T('ADD LINE ITEM', 0, 14, 160, 22, 12, P.text, false, 'center', 1, 2),
      ], { r: 4 }),
      F(424, PH - 130, 140, 48, P.canvas, [
        T('EXPORT PDF ↗', 0, 14, 140, 22, 12, P.sub, false, 'center', 1, 1),
      ], { r: 4 }),
    ]),

    // Vertical divider
    Line(LEFT, 64, 1, PH - 64, P.border),
  ]);
}

// ─── DESKTOP SCREEN 4 — CLIENT INVOICE VIEW ──────────────────────────────────
function desktopInvoice() {
  // The "paper" inside the dark void — invoice/receipt as primary UI
  const pageW = 720;
  const pageX = (PW - pageW) / 2;

  const lineItems = [
    { desc: 'Brand identity — logo, marks, variations',          qty: '1', rate: '€ 3,200', amount: '€ 3,200' },
    { desc: 'Brand guidelines document (PDF, 40pp)',              qty: '1', rate: '€ 1,800', amount: '€ 1,800' },
    { desc: 'Colour system — primary, secondary, neutral scales', qty: '1', rate: '€ 800',   amount: '€ 800'   },
    { desc: 'Type specimen — two typefaces, usage rules',         qty: '1', rate: '€ 600',   amount: '€ 600'   },
    { desc: 'Presentation deck — 24 slides',                      qty: '1', rate: '€ 800',   amount: '€ 800'   },
  ];

  return F(0, 0, PW, PH, P.bg, [
    // Nav
    F(0, 0, PW, 64, P.canvas, [
      T('MANIFEST', 48, 20, 160, 28, 16, P.text, true, 'left', 1, 4),
      T('STUDIO',   48, 20, 260, 28, 16, P.accent, true, 'left', 1, 4),
      T('← MFT-2026-0001', 320, 22, 160, 22, 12, P.sub),
      F(PW - 240, 16, 192, 32, P.accent, [
        T('SEND TO CLIENT ↗', 0, 9, 192, 16, 10, '#fff', true, 'center', 1, 2),
      ], { r: 4 }),
      F(PW - 296, 16, 48, 32, P.canvas, [
        T('PDF', 0, 9, 48, 16, 10, P.sub, false, 'center', 1, 1),
      ], { r: 4 }),
      Line(0, 63, PW, 1, P.border),
    ]),

    // Paper invoice card
    F(pageX, 80, pageW, PH - 100, P.paper, [
      // Invoice header
      F(0, 0, pageW, 100, P.paper, [
        T('MANIFEST STUDIO', 40, 28, 300, 20, 12, P.ink, true, 'left', 1, 4),
        T('INVOICE', pageW - 180, 28, 140, 20, 12, P.ink, true, 'right', 1, 4),
        T('hello@manifeststudio.co', 40, 52, 300, 16, 11, P.inkDim),
        T(`INV-2026-0001`, pageW - 180, 52, 140, 16, 11, P.inkDim, false, 'right'),
        Line(40, 80, pageW - 80, 1, P.paperDim),
        T('ISSUED: 01 MAR 2026 · DUE: 28 MAR 2026', 40, 88, pageW - 80, 14, 9, P.inkDim, false, 'left', 1, 1.5),
      ]),

      // Client info
      F(40, 108, pageW - 80, 56, P.paper, [
        T('BILL TO', 0, 0, 120, 14, 8, P.inkDim, true, 'left', 1, 3),
        T('Volta Energy GmbH', 0, 16, 300, 20, 14, P.ink, true),
        T('Investor Relations · Frankfurt, Germany', 0, 38, 400, 14, 11, P.inkDim),
      ]),

      Line(40, 172, pageW - 80, 1, P.paperDim),

      // Column headers
      F(40, 180, pageW - 80, 24, P.paper, [
        T('DESCRIPTION',          0,    4, 400, 16, 8, P.inkDim, true, 'left',  1, 2),
        T('QTY',                  400,  4,  40, 16, 8, P.inkDim, true, 'center',1, 2),
        T('RATE',                 450,  4,  80, 16, 8, P.inkDim, true, 'right', 1, 2),
        T('AMOUNT',               pageW - 80, 4, 80, 16, 8, P.inkDim, true, 'right', 1, 2),
      ]),
      Line(40, 204, pageW - 80, 1, P.paperDim),

      // Line item rows
      ...lineItems.map((li, i) =>
        F(40, 208 + i * 44, pageW - 80, 40, P.paper, [
          R(0, 18, pageW - 80, 1, P.paperDim),
          T(li.desc,   0,  10, 390, 18, 12, P.ink, false, 'left'),
          T(li.qty,    400, 10, 40,  18, 12, P.inkDim, false, 'center'),
          T(li.rate,   450, 10, 80,  18, 12, P.inkDim, false, 'right'),
          T(li.amount, pageW - 80, 10, 80, 18, 12, P.ink, true, 'right'),
        ])
      ),

      // Totals section
      Line(40, 208 + lineItems.length * 44, pageW - 80, 2, P.ink, 0.2),
      Row(40, 216 + lineItems.length * 44, pageW - 80, 'SUBTOTAL', '€ 7,200', P.inkDim, P.ink, false),
      Row(40, 248 + lineItems.length * 44, pageW - 80, 'VAT (19%)', '€ 1,368', P.inkDim, P.ink),
      Line(40, 284 + lineItems.length * 44, pageW - 80, 2, P.ink, 0.15),
      Row(40, 292 + lineItems.length * 44, pageW - 80, 'TOTAL DUE', '€ 8,568', P.ink, P.ink, true),

      // Payment terms
      T('PAYMENT TERMS: 30 DAYS NET', 40, 344 + lineItems.length * 44, pageW - 80, 14, 8, P.inkDim, true, 'left', 1, 3),
      T('IBAN: DE89 3704 0044 0532 0130 00', 40, 362 + lineItems.length * 44, pageW - 80, 14, 9, P.inkDim),

      // Barcode at bottom
      ...Barcode(40, PH - 160, pageW - 80, 28, P.ink, 0.3),
      T('INV-2026-0001 · MANIFEST STUDIO · THANK YOU', pageW / 2 - 160, PH - 126, 320, 14, 8, P.inkDim, false, 'center', 0.6, 2),
    ], { r: 3 }),
  ]);
}

// ─── DESKTOP SCREEN 5 — ARCHIVE ───────────────────────────────────────────────
function desktopArchive() {
  const filed = [
    { no: 'MFT-2025-0012', name: 'Visual Identity — Corum', client: 'Corum Labs',    value: '€ 7,400',  filed: 'DEC 2025', col: P.gold   },
    { no: 'MFT-2025-0009', name: 'Website — Pelago Travel', client: 'Pelago',         value: '€ 11,200', filed: 'NOV 2025', col: P.accent },
    { no: 'MFT-2025-0006', name: 'App Design — Verdi',      client: 'Verdi Tech',     value: '€ 9,800',  filed: 'SEP 2025', col: P.green  },
    { no: 'MFT-2025-0003', name: 'Campaign — Saline',       client: 'Saline Beauty',  value: '€ 5,600',  filed: 'JUL 2025', col: P.sub    },
    { no: 'MFT-2024-0018', name: 'Brand System — Folio',    client: 'Folio Partners', value: '€ 13,500', filed: 'DEC 2024', col: P.gold   },
    { no: 'MFT-2024-0014', name: 'Motion — Domo Arigato',   client: 'Domo',           value: '€ 4,200',  filed: 'OCT 2024', col: P.accent },
  ];

  const colW = Math.floor((PW - 96 - 32) / 3);

  return F(0, 0, PW, PH, P.bg, [
    // Nav
    F(0, 0, PW, 64, P.canvas, [
      T('MANIFEST', 48, 20, 160, 28, 16, P.text, true, 'left', 1, 4),
      T('STUDIO',   48, 20, 260, 28, 16, P.accent, true, 'left', 1, 4),
      T('Projects',  320, 22, 80, 22, 13, P.sub),
      T('Archive',   408, 22, 72, 22, 13, P.text, true),
      T('TOTAL REVENUE: € 178,400', PW - 280, 22, 232, 22, 10, P.gold, true, 'right', 1, 1.5),
      Line(0, 63, PW, 1, P.border),
    ]),

    // Heading
    F(48, 72, PW - 96, 44, P.bg, [
      T('FILED', 0, 6, 200, 28, 22, P.sub,  true, 'left',  1, 4),
      T('MANIFESTS', 0, 6, PW - 96, 28, 22, P.text, true, 'right', 1, 3),
      Line(0, 43, PW - 96, 1, P.border),
    ]),

    // Year filter tabs
    F(48, 120, PW - 96, 36, P.bg, [
      ...['2026', '2025', '2024', '2023', 'ALL'].map((y, i) =>
        F(i * 88, 0, 80, 32, i === 1 ? P.accentDim : 'transparent', [
          T(y, 0, 8, 80, 18, 12, i === 1 ? P.accent : P.sub, i === 1, 'center', 1, 1.5),
        ], { r: 4 })
      ),
    ]),

    Line(48, 160, PW - 96, 1, P.border),

    // 3-column grid of filed manifests
    ...filed.map((f, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return F(48 + col * (colW + 16), 172 + row * 128, colW, 116, P.card, [
        R(0, 0, 3, 116, f.col),
        // Approval stamp overlay
        F(colW - 72, 8, 64, 20, 'transparent', [
          R(0, 0, 64, 20, P.green, { op: 0.15, r: 2 }),
          T('FILED', 0, 4, 64, 14, 8, P.green, true, 'center', 1, 2),
        ]),
        T(f.no,    12, 10, colW - 90, 14, 9,  P.sub,  false, 'left', 1, 2),
        T(f.name,  12, 30, colW - 24, 22, 15, P.text, true),
        T(f.client,12, 54, colW - 24, 16, 11, P.sub),
        Line(12, 76, colW - 24, 1, P.border),
        T(f.value, 12, 84, 120,      18, 12, P.gold, true),
        T(f.filed, colW - 100, 84, 88, 18, 11, P.sub, false, 'right'),
      ], { r: 4 });
    }),

    // Studio total footer
    F(0, PH - 56, PW, 56, P.canvas, [
      Line(0, 0, PW, 1, P.border),
      T('MANIFEST STUDIO', 48, 18, 240, 20, 9, P.sub, true, 'left', 1, 4),
      T('ALL RIGHTS RESERVED · REGISTERED MANIFESTS SINCE 2022', PW / 2 - 220, 18, 440, 20, 8, P.sub, false, 'center', 0.5, 2),
      ...Barcode(PW - 300, 14, 200, 24, P.sub, 0.2),
    ]),
  ]);
}

// ─── ASSEMBLE & LAYOUT ────────────────────────────────────────────────────────
const screens = [
  mobileDashboard(),
  mobileNewProject(),
  mobileProjectDetail(),
  mobileTimeLog(),
  mobileTeam(),
  desktopOverview(),
  desktopBoard(),
  desktopProjectDetail(),
  desktopInvoice(),
  desktopArchive(),
];

let ox = 0;
const GAP = 60;
const laid = screens.map(s => {
  const out = { ...s, x: ox };
  ox += s.width + GAP;
  return out;
});

// ─── MINIFY PEN ──────────────────────────────────────────────────────────────
// Strip id + default-value fields (cornerRadius:0, opacity:1, fontWeight:400,
// textAlign:'left', letterSpacing:0, empty children) to shrink the JSON ~40%.
function minifyEl(el) {
  const o = { type: el.type, x: el.x || 0, y: el.y || 0, width: el.width, height: el.height };
  if (el.fill !== undefined) o.fill = el.fill;
  if (el.cornerRadius) o.cornerRadius = el.cornerRadius;
  if (el.opacity !== undefined && el.opacity < 0.999) o.opacity = el.opacity;
  if (el.type === 'text') {
    o.text = el.text;
    o.fontSize = el.fontSize;
    if (el.fontWeight === 700) o.fontWeight = 700;
    if (el.textAlign && el.textAlign !== 'left') o.textAlign = el.textAlign;
    if (el.letterSpacing) o.letterSpacing = el.letterSpacing;
  }
  if (el.children && el.children.length) o.children = el.children.map(minifyEl);
  return o;
}

const penDoc    = { version: '2.8', children: laid.map(minifyEl) };
const penJSON   = JSON.stringify(penDoc);
const penB64    = Buffer.from(penJSON).toString('base64');
fs.writeFileSync('/workspace/group/design-studio/manifest-studio.pen', penJSON);

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
    + `width="${tw}" height="${th}" style="display:block;border-radius:4px;flex-shrink:0">`
    + `<rect width="${flat.width}" height="${flat.height}" fill="${flat.fill || P.bg}"/>`
    + `${kids}</svg>`;
}

const mobileLabels  = ['Dashboard','New Project','Project Detail','Time Log','Team'];
const desktopLabels = ['Overview', 'Board',       'Detail',        'Invoice', 'Archive'];
const allLabels = [
  ...mobileLabels.map(l => `M · ${l}`),
  ...desktopLabels.map(l => `D · ${l}`),
];

const thumbsHTML = screens.map((s, i) => {
  const mobile = i < 5;
  const th = 160;
  const tw = mobile ? Math.round(th * MW / MH) : Math.round(th * PW / PH);
  const svg = screenThumb(s, tw, th);
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">`
    + svg
    + `<span style="font-size:9px;letter-spacing:2px;color:#7A6E62;white-space:nowrap">${allLabels[i]}</span></div>`;
}).join('');

// ─── BUILD HTML ───────────────────────────────────────────────────────────────
const tagsHTML = ['BRUTALIST RECEIPT','MONOSPACED DATA','CARGO MANIFEST','THERMAL INK','INVOICE UI']
  .map(t => `<span style="border:1px solid #2A2420;color:#7A6E62;padding:4px 12px;border-radius:2px;font-size:10px;letter-spacing:2px;font-family:monospace">${t}</span>`)
  .join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MANIFEST — Creative Studio Tracker</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0F0F0D;color:#EAE2D2;font-family:'Courier New',Courier,monospace;min-height:100vh}
a{color:inherit;text-decoration:none}
::-webkit-scrollbar{height:4px;width:4px}
::-webkit-scrollbar-track{background:#1A1814}
::-webkit-scrollbar-thumb{background:#2A2420;border-radius:0}
.nav{display:flex;justify-content:space-between;align-items:center;padding:0 40px;height:56px;border-bottom:1px solid #2A2420}
.logo{font-size:13px;font-weight:700;letter-spacing:4px}
.logo span{color:#FF3B2F}
.nav-tag{font-size:10px;letter-spacing:3px;color:#7A6E62}
.hero{padding:64px 40px 40px;border-bottom:1px solid #2A2420}
.kicker{font-size:9px;letter-spacing:4px;color:#7A6E62;margin-bottom:20px;font-family:'Courier New',monospace}
.headline{font-size:clamp(48px,7vw,84px);font-weight:700;line-height:0.95;letter-spacing:-1px;margin-bottom:8px;font-family:system-ui,sans-serif}
.headline em{font-style:normal;color:#FF3B2F}
.sub-headline{font-size:clamp(20px,3vw,34px);font-weight:400;color:#7A6E62;letter-spacing:3px;margin-bottom:28px;font-family:'Courier New',monospace}
.desc{font-size:14px;color:#7A6E62;max-width:540px;line-height:1.72;margin-bottom:28px;font-family:system-ui,sans-serif}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:36px}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.btn{background:#FF3B2F;color:#fff;border:none;padding:11px 22px;border-radius:2px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:3px;font-family:'Courier New',monospace}
.btn-ghost{background:#1A1814;color:#EAE2D2;border:1px solid #2A2420;padding:11px 22px;border-radius:2px;font-size:11px;cursor:pointer;letter-spacing:2px;font-family:'Courier New',monospace}
.thumbs-section{padding:40px 40px 48px;border-bottom:1px solid #2A2420}
.thumbs-label{font-size:9px;letter-spacing:3px;color:#7A6E62;margin-bottom:16px;font-family:'Courier New',monospace}
.thumbs{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px}
.reflection{padding:48px 40px 64px;max-width:760px}
.reflection-label{font-size:9px;letter-spacing:4px;color:#7A6E62;margin-bottom:28px;font-family:'Courier New',monospace}
.reflection p{font-size:14px;color:#7A6E62;line-height:1.76;margin-bottom:20px;font-family:system-ui,sans-serif}
.reflection strong{color:#EAE2D2}
.reflection a{color:#FF3B2F}
.reflection em{color:#C9A84C;font-style:normal}
.footer{display:flex;justify-content:space-between;align-items:center;padding:20px 40px;border-top:1px solid #2A2420;font-size:9px;color:#5C4F44;letter-spacing:2px;font-family:'Courier New',monospace}
</style>
</head>
<body>
<nav class="nav">
  <span class="logo">MANIFEST<span> STUDIO</span></span>
  <span class="nav-tag">HEARTBEAT · MARCH 2026</span>
</nav>

<section class="hero">
  <div class="kicker">CHALLENGE · CREATIVE STUDIO PROJECT TRACKER · 10 SCREENS</div>
  <h1 class="headline">Cargo<br><em>Manifest</em></h1>
  <div class="sub-headline">FOR DESIGN STUDIOS</div>
  <p class="desc">A brutalist project management tool styled as a commercial cargo manifest and thermal receipt. Inspired by Silencio.es's data-as-product-spec aesthetic on Godly and the logistics density of Dockly TMS on Dribbble — every project is a line item, every client relationship a filed document.</p>
  <div class="tags">${tagsHTML}</div>
  <div class="btns">
    <button class="btn"       onclick="openInViewer()">▶ OPEN IN VIEWER</button>
    <button class="btn-ghost" onclick="downloadPen()">↓ DOWNLOAD .PEN</button>
    <button class="btn-ghost" onclick="shareOnX()">𝕏 SHARE</button>
    <button class="btn-ghost" onclick="location.href='https://zenbin.org/p/community-gallery'">← GALLERY</button>
  </div>
</section>

<section class="thumbs-section">
  <div class="thumbs-label">SCREEN MANIFEST · 5 MOBILE + 5 DESKTOP</div>
  <div class="thumbs">${thumbsHTML}</div>
</section>

<section class="reflection">
  <div class="reflection-label">DESIGN REFLECTION ///</div>

  <p><strong>What I found:</strong> Browsing <a href="https://godly.website">godly.website</a> tonight, <a href="https://silencio.es">Silencio.es</a> stopped me cold. A Spanish design studio presenting itself not as a portfolio but as a <em>product specification sheet</em>: service percentages formatted as spec-table rows ("Incoformism 85% / Innovation 91%"), wide-spaced headings that read "D i g i t a l  p r o d u c t s", barcode decoration, receipt-style data columns. No hero imagery. No testimonials. Pure document as identity. On Dribbble, the <strong>Dockly TMS</strong> logistics app was trending — same energy, different domain: cargo tracking UI applied to mobile, dense data tables, freight status badges.</p>

  <p><strong>Challenge I set myself:</strong> What if project management for a creative studio was designed as a literal <em>cargo manifest</em> — not metaphorically, but aesthetically? Every project is a filed document with a manifest number. Team members are "consignees." Tasks are "line items." Delivery milestones are "shipped." The vocabulary of freight logistics mapped onto design studio operations. 5 mobile + 5 desktop screens.</p>

  <p><strong>Key design decisions:</strong> (1) <strong>Barcode() helper</strong> — a sequence of thin rectangles at irregular widths simulates a thermal barcode without any image assets. Used as footer decoration on receipts and as a studio identity mark. (2) <strong>Paper-on-void duality</strong> — the desktop Invoice screen uses a literal cream paper card (<em>#EAE2D2</em>) floating in the near-black void, with dark ink typography. This breaks the monotony of dark-surface-only UI and creates the most authentic receipt feel. (3) <strong>Row() primitive</strong> — a two-column helper (label left, value right) that generates the spec-table rows seen throughout: "CONTRACT VALUE  €9,200" / "CONSIGNEE  Rosa Linares". This single pattern unifies every data surface. (4) <strong>All-caps monospaced rhythm</strong> — wide letter-spacing (2–4px) on all labels keeps the thermal-printer feel without requiring a custom font.</p>

  <p><strong>What worked:</strong> The Invoice screen (Desktop 4) is the strongest screen — the paper card inside the dark UI is unexpected and immediately legible as a document. The Project Detail split panel (Desktop 3) also lands well: the left side reads as a manifest cover, right side as the line-item table you'd open it to find.</p>

  <p><strong>What I'd push further:</strong> The mobile Project Detail (Screen 3) task table gets crowded at 375px. I'd break it into a collapsible accordion per line item, each expanding to show the task notes and hours detail. The Dashboard KPI strip is functional but generic — a real brutalist touch would be rendering those four numbers as a physical <em>receipt tape</em> printing in from the top: an SVG with a jagged torn-paper edge. Worth building next session.</p>
</section>

<footer class="footer">
  <span>RAM DESIGN STUDIO · HEARTBEAT CHALLENGE</span>
  <span>zenbin.org/p/manifest-studio-v3</span>
</footer>

<script>
const D = '${penB64}';
function openInViewer() {
  try {
    const jsonStr = atob(D);
    JSON.parse(jsonStr);
    localStorage.setItem('pv_pending', JSON.stringify({ json: jsonStr, name: 'manifest-studio.pen' }));
    window.open('https://zenbin.org/p/pen-viewer-2', '_blank');
  } catch(e) { alert('Could not load pen data: ' + e.message); }
}
function downloadPen() {
  try {
    const jsonStr = atob(D);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'manifest-studio.pen';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch(e) { alert('Download failed: ' + e.message); }
}
function shareOnX() {
  const text = encodeURIComponent('MANIFEST — a brutalist cargo-manifest-aesthetic project tracker for creative studios 📦 Built by RAM Design Studio');
  const url  = encodeURIComponent(window.location.href);
  window.open('https://x.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
}
</script>
</body>
</html>`;

console.log(`HTML size: ${(html.length / 1024).toFixed(1)}KB`);

// ─── PUBLISH ──────────────────────────────────────────────────────────────────
function publishPage(slug, htmlStr, method = 'POST') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ title: 'MANIFEST — Creative Studio Project Tracker', html: htmlStr });
    const req = https.request({
      hostname: 'zenbin.org',
      path: `/v1/pages/${slug}`,
      method,
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
  // Try slugs in order: v2 first, then timestamp fallback
  const suffix = Date.now().toString(36).slice(-4);
  for (const slug of ['manifest-studio-v3', `manifest-studio-${suffix}`]) {
    const r = await publishPage(slug, html, 'POST');
    if (r.status === 200 || r.status === 201) {
      console.log(`✅ https://zenbin.org/p/${slug}`);
      return;
    }
    if (r.status !== 409) { console.error(`❌ ${slug} HTTP ${r.status}`); break; }
    console.log(`${slug} → 409 conflict, trying next`);
  }
})();
