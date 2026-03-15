'use strict';
// volta-app.js
// VOLTA — Electric Vehicle Companion App
// Inspired by RonDesignLab's Vehicle Controls shot on Dribbble:
// electric blue technical UI, circular gauges, glowing dark aesthetic
// + Nixtio's neon-on-dark crypto dashboard split compositions

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:       '#05080f',   // near-black with blue tint
  surface:  '#0a1220',   // dark navy surface
  surface2: '#0f1a2e',   // slightly lighter panel
  border:   '#1a2d4a',   // subtle border
  muted:    '#3a5878',   // muted blue-grey
  fg:       '#c8e0ff',   // pale blue-white text
  accent:   '#00b4ff',   // electric blue
  charge:   '#39ffa0',   // charge green
  warn:     '#f5a040',   // amber warning
  hot:      '#ff4d6d',   // critical/hot red
};

let _id = 0;
const uid = () => `v${++_id}`;

const F = (x, y, w, h, fill, opts = {}) => ({
  id: uid(), type: 'frame', x, y, width: w, height: h,
  fill: fill || P.bg,
  clip: opts.clip !== undefined ? opts.clip : false,
  ...(opts.r !== undefined ? { cornerRadius: opts.r } : {}),
  ...(opts.stroke ? { stroke: { align: 'inside', thickness: opts.sw || 1, fill: opts.stroke } } : {}),
  ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
  children: opts.ch || [],
});

const T = (content, x, y, w, h, opts = {}) => ({
  id: uid(), type: 'text', content, x, y, width: w, height: h,
  textGrowth: 'fixed-width-height',
  fontSize: opts.size || 13,
  fontWeight: String(opts.weight || 400),
  fill: opts.fill || P.fg,
  textAlign: opts.align || 'left',
  ...(opts.ls !== undefined ? { letterSpacing: opts.ls } : {}),
  ...(opts.lh !== undefined ? { lineHeight: opts.lh } : {}),
  ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
});

const E = (x, y, w, h, fill, opts = {}) => ({
  id: uid(), type: 'ellipse', x, y, width: w, height: h, fill,
  ...(opts.stroke ? { stroke: { align: 'inside', thickness: opts.sw || 1, fill: opts.stroke } } : {}),
  ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
});

const Line  = (x, y, w, fill = P.border) => F(x, y, w, 1, fill, {});
const VLine = (x, y, h, fill = P.border) => F(x, y, 1, h, fill, {});

// ── Glow: concentric ellipses for radial glow effect ─────────────────────────
const Glow = (cx, cy, r, color) => [
  E(cx-r*2,   cy-r*2,   r*4,   r*4,   color+'08', {}),
  E(cx-r*1.4, cy-r*1.4, r*2.8, r*2.8, color+'12', {}),
  E(cx-r,     cy-r,     r*2,   r*2,   color+'1e', {}),
  E(cx-r*0.5, cy-r*0.5, r,     r,     color+'30', {}),
];

// ── Battery ring: concentric rings for charge state ───────────────────────────
const BatteryRing = (cx, cy, pct, color) => {
  const rings = [];
  const sizes = [120, 100, 84, 70];
  const opacities = [0.08, 0.12, 0.18, 0.25];
  sizes.forEach((r, i) => rings.push(E(cx-r/2, cy-r/2, r, r, color, { opacity: opacities[i] })));
  // solid inner ring (full circle as bg, then colored arc portion via overlay)
  rings.push(E(cx-35, cy-35, 70, 70, P.surface2, {}));
  rings.push(E(cx-30, cy-30, 60, 60, color, { opacity: 0.15 }));
  rings.push(E(cx-22, cy-22, 44, 44, P.bg, {}));
  return rings;
};

// ── Stat block ────────────────────────────────────────────────────────────────
const Stat = (x, y, label, value, unit, color = P.fg) => [
  T(label, x, y,      120, 14, { size: 9,  fill: P.muted, ls: 1.2, weight: 500 }),
  T(value, x, y + 18, 120, 36, { size: 28, fill: color,   weight: 700, ls: -0.5 }),
  T(unit,  x, y + 54, 80,  14, { size: 10, fill: P.muted }),
];

// ── Status pill ───────────────────────────────────────────────────────────────
const StatusPill = (x, y, text, color) => F(x, y, text.length * 7 + 20, 22, color + '22', {
  r: 11,
  ch: [
    E(8, 7, 8, 8, color, {}),
    T(text, 20, 4, text.length * 7, 14, { size: 10, fill: color, weight: 600, ls: 0.5 }),
  ],
});

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE SCREENS (375 × 812)
// ══════════════════════════════════════════════════════════════════════════════

function mobileDashboard(ox) {
  return F(ox, 0, 375, 812, P.bg, { clip: true, ch: [
    // ambient glow behind ring
    ...Glow(187, 300, 100, P.accent),

    // status bar
    T('9:41', 16, 16, 60, 16, { size: 12, weight: 600 }),
    T('●●●●', 295, 16, 70, 16, { size: 9, fill: P.muted }),

    // header
    T('VOLTA', 20, 48, 160, 20, { size: 14, weight: 800, ls: 4, fill: P.fg }),
    StatusPill(260, 46, 'ONLINE', P.charge),

    // ── Central battery ring ──
    ...BatteryRing(187, 200, 0.78, P.accent),

    // Charge % large
    T('78', 155, 178, 70, 52, { size: 42, weight: 900, fill: P.accent, align: 'center', ls: -2 }),
    T('%', 223, 192, 20, 20, { size: 14, fill: P.muted }),
    T('CHARGE', 148, 236, 82, 14, { size: 9, fill: P.muted, ls: 2, align: 'center' }),

    // range label below ring
    T('247 mi', 127, 268, 120, 28, { size: 22, weight: 700, fill: P.fg, align: 'center' }),
    T('ESTIMATED RANGE', 110, 296, 154, 12, { size: 9, fill: P.muted, ls: 1.5, align: 'center' }),

    // ── Stat row ──
    F(20, 340, 335, 88, P.surface, { r: 12, ch: [
      Line(0, 0, 335, P.border),
      // dividers
      VLine(110, 16, 56, P.border),
      VLine(220, 16, 56, P.border),
      // stats
      T('TEMP',    18, 14, 80, 12, { size: 9, fill: P.muted, ls: 1 }),
      T('72°F',    18, 30, 80, 28, { size: 22, weight: 700, fill: P.charge }),
      T('MOTOR',   18, 62, 80, 12, { size: 9, fill: P.muted, ls: 1 }),
      T('128', 128, 14, 70, 12, { size: 9, fill: P.muted, ls: 1 }),
      T('kW',  170, 14,  28, 12, { size: 9, fill: P.muted }),
      T('34.2',   128, 30, 80, 28, { size: 22, weight: 700, fill: P.fg }),
      T('POWER',  238, 14, 80, 12, { size: 9, fill: P.muted, ls: 1 }),
      T('L2',     238, 30, 80, 28, { size: 22, weight: 700, fill: P.warn }),
      T('CHARGING',238,62, 80, 12, { size: 9, fill: P.muted, ls: 1 }),
    ]}),

    // ── Quick actions ──
    T('QUICK ACTIONS', 20, 448, 200, 14, { size: 9, fill: P.muted, ls: 2 }),
    ...[
      ['⚡', 'Charge',  P.accent],
      ['🗺', 'Navigate', P.fg],
      ['❄', 'Climate',  P.fg],
      ['🔒', 'Lock',    P.fg],
    ].map(([icon, label, color], i) => {
      const ax = 20 + i * 82;
      return F(ax, 470, 72, 72, P.surface, { r: 16, ch: [
        T(icon,  0, 14, 72, 24, { size: 20, align: 'center' }),
        T(label, 0, 42, 72, 14, { size: 10, fill: color, align: 'center', weight: i===0?600:400 }),
      ]});
    }),

    // ── Trip summary ──
    F(20, 560, 335, 100, P.surface, { r: 12, ch: [
      T('LAST TRIP', 16, 14, 160, 12, { size: 9, fill: P.muted, ls: 1.5 }),
      T('Home → Downtown', 16, 32, 240, 20, { size: 15, weight: 600, fill: P.fg }),
      T('18.4 mi  ·  31 min  ·  94% efficient', 16, 56, 280, 14, { size: 11, fill: P.muted }),
      F(16, 76, 100, 3, P.charge, { r: 2 }),
      F(116, 76, 60, 3, P.muted, { r: 2, opacity: 0.3 }),
      T('94%', 296, 32, 40, 20, { size: 15, weight: 700, fill: P.charge, align: 'right' }),
    ]}),

    // ── Bottom nav ──
    F(0, 732, 375, 80, P.surface, { ch: [
      Line(0, 0, 375, P.border),
      ...[['⚡','Power',0], ['🗺','Trip',1], ['📊','Stats',2], ['⚙','Settings',3]].map(([icon, label, j]) => {
        const nx = 20 + j * 84;
        return [
          F(nx + 18, 10, 48, 48, j===0 ? P.accent+'22' : '#00000000', { r: 24 }),
          T(icon, nx+22, 16, 40, 24, { size: 18, fill: j===0 ? P.accent : P.muted }),
          T(label, nx+8, 42, 68, 14, { size: 10, fill: j===0 ? P.accent : P.muted, align: 'center', weight: j===0?600:400 }),
        ];
      }).flat(),
    ]}),
  ]});
}

function mobileCharging(ox) {
  return F(ox, 0, 375, 812, P.bg, { clip: true, ch: [
    // green glow for charging state
    ...Glow(187, 260, 120, P.charge),

    T('9:41', 16, 16, 60, 16, { size: 12, weight: 600 }),
    T('< Back', 16, 48, 80, 20, { size: 14, fill: P.muted }),
    T('Charging Session', 96, 48, 200, 20, { size: 14, weight: 600, fill: P.fg, align: 'center' }),

    // ── Active indicator ──
    StatusPill(138, 84, 'ACTIVE · 38 min', P.charge),

    // ── Large ring ──
    ...BatteryRing(187, 200, 0.62, P.charge),
    T('62', 155, 178, 70, 52, { size: 42, weight: 900, fill: P.charge, align: 'center', ls: -2 }),
    T('%', 223, 192, 20, 20, { size: 14, fill: P.muted }),
    T('CHARGED', 148, 236, 82, 14, { size: 9, fill: P.muted, ls: 2, align: 'center' }),

    // charging stats
    T('11.2 kW', 90, 275, 194, 28, { size: 22, weight: 700, fill: P.charge, align: 'center' }),
    T('CURRENT POWER', 110, 303, 154, 12, { size: 9, fill: P.muted, ls: 1.5, align: 'center' }),

    // ── Stat cards ──
    ...[
      ['TIME LEFT', '1h 12m', P.fg],
      ['ENERGY', '22.4 kWh', P.accent],
      ['COST', '$4.18', P.warn],
    ].flatMap(([label, val, color], i) => {
      const cx = 20 + i * 112;
      return [
        F(cx, 340, 100, 68, P.surface, { r: 10, ch: [
          T(label, 10, 10, 80, 12, { size: 8, fill: P.muted, ls: 1 }),
          T(val, 10, 28, 80, 24, { size: 16, weight: 700, fill: color }),
        ]}),
      ];
    }),

    // ── Power flow bars ──
    T('POWER FLOW', 20, 428, 200, 14, { size: 9, fill: P.muted, ls: 2 }),
    ...Array.from({ length: 24 }, (_, i) => {
      const bh = Math.max(4, Math.round(20 + Math.sin(i * 0.9) * 12 + Math.cos(i * 1.7) * 8 + (i > 16 ? 14 : 0)));
      const active = i > 16;
      return F(20 + i * 13, 456 + (40 - bh), 9, bh, active ? P.charge : P.muted, { r: 2, opacity: active ? 0.8 : 0.2 });
    }),

    // ── Charging location ──
    F(20, 520, 335, 80, P.surface, { r: 12, ch: [
      T('📍', 14, 22, 24, 24, { size: 16 }),
      T('Tesla Supercharger — Market St', 44, 14, 250, 18, { size: 13, weight: 600, fill: P.fg }),
      T('Stall 4A  ·  Level 3  ·  250kW max', 44, 36, 270, 14, { size: 11, fill: P.muted }),
      T('0.28/kWh', 280, 22, 60, 18, { size: 12, fill: P.warn, align: 'right', weight: 600 }),
    ]}),

    // ── Stop charging button ──
    F(20, 620, 335, 52, P.hot + '22', { r: 8, stroke: P.hot, sw: 1, ch: [
      T('Stop Charging', 0, 15, 335, 22, { size: 14, weight: 700, fill: P.hot, align: 'center' }),
    ]}),

    F(0, 732, 375, 80, P.surface, { ch: [
      Line(0, 0, 375, P.border),
      ...[['⚡','Power',0], ['🗺','Trip',1], ['📊','Stats',2], ['⚙','Settings',3]].map(([icon, label, j]) => {
        const nx = 20 + j * 84;
        return [
          F(nx + 18, 10, 48, 48, j===0 ? P.accent+'22' : '#00000000', { r: 24 }),
          T(icon, nx+22, 16, 40, 24, { size: 18, fill: j===0 ? P.accent : P.muted }),
          T(label, nx+8, 42, 68, 14, { size: 10, fill: j===0 ? P.accent : P.muted, align: 'center' }),
        ];
      }).flat(),
    ]}),
  ]});
}

function mobileTripPlanner(ox) {
  return F(ox, 0, 375, 812, P.bg, { clip: true, ch: [
    T('9:41', 16, 16, 60, 16, { size: 12, weight: 600 }),
    T('VOLTA', 20, 48, 160, 20, { size: 14, weight: 800, ls: 4 }),

    T('Plan a Trip', 20, 82, 260, 28, { size: 22, weight: 800, fill: P.fg }),
    T('Current range: 247 mi', 20, 114, 260, 16, { size: 12, fill: P.charge }),

    // ── Route inputs ──
    F(20, 144, 335, 52, P.surface, { r: 10, ch: [
      E(14, 18, 16, 16, P.charge, {}),
      T('Current Location', 40, 16, 268, 20, { size: 14, fill: P.fg, opacity: 0.5 }),
    ]}),
    VLine(27, 196, 20, P.border),
    F(20, 216, 335, 52, P.surface, { r: 10, ch: [
      E(14, 18, 16, 16, P.accent, {}),
      T('Enter destination...', 40, 16, 268, 20, { size: 14, fill: P.muted }),
    ]}),

    // ── Route visualization (abstract map) ──
    F(20, 284, 335, 200, P.surface, { r: 12, ch: [
      // abstract terrain/map grid
      ...Array.from({ length: 5 }, (_, i) => Line(0, 40 * i, 335, P.border + '60')),
      ...Array.from({ length: 6 }, (_, i) => VLine(56 * i, 0, 200, P.border + '60')),
      // route line (zigzag)
      F(40,  140, 30, 2, P.charge, { r: 1 }),
      F(70,  110, 50, 2, P.charge, { r: 1, opacity: 0.8 }),
      F(120, 80,  60, 2, P.charge, { r: 1, opacity: 0.7 }),
      F(180, 60,  80, 2, P.charge, { r: 1, opacity: 0.6 }),
      F(260, 50,  50, 2, P.charge, { r: 1, opacity: 0.5 }),
      // origin dot
      ...Glow(52, 141, 8, P.charge),
      E(44, 133, 16, 16, P.charge, {}),
      // destination dot
      ...Glow(282, 51, 8, P.accent),
      E(274, 43, 16, 16, P.accent, {}),
      // charging stop
      E(157, 73, 12, 12, P.warn, {}),
      T('⚡', 152, 50, 22, 20, { size: 9, fill: P.warn, align: 'center' }),
      // distance labels
      T('0 mi', 36, 156, 40, 12, { size: 8, fill: P.muted }),
      T('183 mi', 265, 64, 50, 12, { size: 8, fill: P.muted }),
    ]}),

    // ── Route summary ──
    F(20, 500, 335, 72, P.surface2, { r: 10, ch: [
      T('San Francisco → Los Angeles', 16, 12, 280, 18, { size: 14, weight: 600, fill: P.fg }),
      T('383 mi  ·  1 charge stop  ·  ~5h 40m', 16, 36, 300, 14, { size: 11, fill: P.muted }),
      T('↗', 305, 22, 20, 20, { size: 16, fill: P.accent }),
    ]}),

    // ── Charging stop card ──
    F(20, 584, 335, 68, P.warn + '14', { r: 10, stroke: P.warn + '44', sw: 1, ch: [
      T('⚡', 14, 22, 24, 24, { size: 16 }),
      T('Charge stop at Kettleman City', 44, 12, 250, 16, { size: 12, weight: 600, fill: P.warn }),
      T('Mile 183  ·  30 min  ·  Tesla Supercharger', 44, 32, 270, 14, { size: 10, fill: P.muted }),
      T('Required', 268, 24, 52, 14, { size: 9, fill: P.warn, align: 'right' }),
    ]}),

    // CTA
    F(20, 668, 335, 52, P.accent, { r: 10, ch: [
      T('Start Navigation', 0, 15, 335, 22, { size: 15, weight: 700, fill: P.bg, align: 'center' }),
    ]}),

    F(0, 732, 375, 80, P.surface, { ch: [
      Line(0, 0, 375, P.border),
      ...[['⚡','Power',0], ['🗺','Trip',1], ['📊','Stats',2], ['⚙','Settings',3]].map(([icon, label, j]) => {
        const nx = 20 + j * 84;
        return [
          F(nx + 18, 10, 48, 48, j===1 ? P.accent+'22' : '#00000000', { r: 24 }),
          T(icon, nx+22, 16, 40, 24, { size: 18, fill: j===1 ? P.accent : P.muted }),
          T(label, nx+8, 42, 68, 14, { size: 10, fill: j===1 ? P.accent : P.muted, align: 'center', weight: j===1?600:400 }),
        ];
      }).flat(),
    ]}),
  ]});
}

function mobileAnalytics(ox) {
  return F(ox, 0, 375, 812, P.bg, { clip: true, ch: [
    T('9:41', 16, 16, 60, 16, { size: 12, weight: 600 }),
    T('VOLTA', 20, 48, 160, 20, { size: 14, weight: 800, ls: 4 }),

    T('Energy Stats', 20, 82, 260, 28, { size: 22, weight: 800, fill: P.fg }),

    // ── Period selector ──
    F(20, 120, 335, 36, P.surface, { r: 18, ch: [
      ...['Day', 'Week', 'Month', 'Year'].map((label, i) => {
        const active = i === 1;
        return F(4 + i * 82, 4, 78, 28, active ? P.accent : '#00000000', { r: 14, ch: [
          T(label, 0, 6, 78, 16, { size: 11, fill: active ? P.bg : P.muted, weight: active ? 700 : 400, align: 'center' }),
        ]});
      }),
    ]}),

    // ── Efficiency score ──
    F(20, 172, 335, 100, P.surface, { r: 12, ch: [
      ...Glow(168, 50, 30, P.charge),
      T('EFFICIENCY SCORE', 16, 14, 200, 12, { size: 9, fill: P.muted, ls: 1.5 }),
      T('94', 16, 32, 80, 44, { size: 40, weight: 900, fill: P.charge, ls: -2 }),
      T('/ 100', 76, 52, 50, 20, { size: 14, fill: P.muted }),
      T('↑ +3 from last week', 16, 80, 200, 14, { size: 11, fill: P.charge }),
      // mini bar
      F(200, 40, 116, 8, P.border, { r: 4 }),
      F(200, 40, 109, 8, P.charge, { r: 4 }),
    ]}),

    // ── Energy usage chart ──
    T('ENERGY USED  ·  THIS WEEK', 20, 288, 260, 14, { size: 9, fill: P.muted, ls: 1.5 }),
    F(20, 308, 335, 140, P.surface, { r: 12, ch: [
      // y-axis labels
      ...['60', '40', '20', '0'].map((v, i) =>
        T(v, 4, 14 + i * 28, 24, 14, { size: 8, fill: P.muted, align: 'right' })
      ),
      // grid lines
      ...Array.from({ length: 4 }, (_, i) => Line(32, 14 + i * 28, 290, P.border)),
      // bars
      ...['M','T','W','T','F','S','S'].map((day, i) => {
        const vals = [42, 28, 55, 18, 61, 38, 44];
        const bh = Math.round(vals[i] * 0.9);
        return [
          F(36 + i * 40, 110 - bh, 28, bh, i === 4 ? P.accent : P.accent + '55', { r: 3 }),
          T(day, 36 + i * 40, 118, 28, 12, { size: 8, fill: P.muted, align: 'center' }),
        ];
      }).flat(),
    ]}),

    // ── Summary stats ──
    ...[
      ['TOTAL MILES',  '412 mi',    P.fg],
      ['ENERGY USED',  '89.4 kWh',  P.accent],
      ['CO₂ SAVED',    '42.1 lbs',  P.charge],
      ['COST',         '$21.70',    P.warn],
    ].flatMap(([label, val, color], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = 20 + col * 168;
      const sy = 464 + row * 88;
      return [
        F(sx, sy, 155, 76, P.surface, { r: 10, ch: [
          T(label, 12, 10, 131, 12, { size: 9, fill: P.muted, ls: 1 }),
          T(val,   12, 28, 131, 28, { size: 22, weight: 700, fill: color }),
        ]}),
      ];
    }),

    F(0, 732, 375, 80, P.surface, { ch: [
      Line(0, 0, 375, P.border),
      ...[['⚡','Power',0], ['🗺','Trip',1], ['📊','Stats',2], ['⚙','Settings',3]].map(([icon, label, j]) => {
        const nx = 20 + j * 84;
        return [
          F(nx + 18, 10, 48, 48, j===2 ? P.accent+'22' : '#00000000', { r: 24 }),
          T(icon, nx+22, 16, 40, 24, { size: 18, fill: j===2 ? P.accent : P.muted }),
          T(label, nx+8, 42, 68, 14, { size: 10, fill: j===2 ? P.accent : P.muted, align: 'center', weight: j===2?600:400 }),
        ];
      }).flat(),
    ]}),
  ]});
}

function mobileVehicle(ox) {
  return F(ox, 0, 375, 812, P.bg, { clip: true, ch: [
    T('9:41', 16, 16, 60, 16, { size: 12, weight: 600 }),
    T('< Back', 16, 48, 80, 20, { size: 14, fill: P.muted }),
    T('Vehicle', 20, 82, 260, 28, { size: 22, weight: 800, fill: P.fg }),

    // ── Vehicle card ──
    F(20, 120, 335, 140, P.surface, { r: 16, ch: [
      ...Glow(167, 70, 60, P.accent),
      // abstract car silhouette using frames
      F(60, 50, 215, 50, P.accent + '18', { r: 12 }),
      F(90, 30, 155, 30, P.accent + '10', { r: 8 }),
      E(80, 80, 30, 20, P.border, {}),
      E(225, 80, 30, 20, P.border, {}),
      T('Model Y', 16, 12, 160, 20, { size: 16, weight: 700, fill: P.fg }),
      T('2024  ·  AWD  ·  Long Range', 16, 34, 200, 14, { size: 11, fill: P.muted }),
      StatusPill(210, 12, 'UNLOCKED', P.charge),
    ]}),

    // ── Live metrics grid ──
    T('LIVE METRICS', 20, 276, 200, 14, { size: 9, fill: P.muted, ls: 2 }),
    ...[
      ['⚡', 'Battery',     '78%',    P.accent],
      ['🌡', 'Cabin Temp',  '72°F',   P.charge],
      ['💨', 'Motor',       '34 kW',  P.fg],
      ['🔋', 'Regen',       '8.2 kW', P.warn],
      ['📍', 'Location',    'Parked', P.muted],
      ['🔒', 'Doors',       'Locked', P.charge],
    ].map(([icon, label, val, color], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      return F(20 + col * 168, 296 + row * 84, 155, 72, P.surface, { r: 10, ch: [
        T(icon, 12, 16, 24, 24, { size: 18 }),
        T(label, 44, 12, 100, 14, { size: 10, fill: P.muted }),
        T(val,   44, 30, 100, 22, { size: 18, weight: 700, fill: color }),
      ]});
    }),

    // ── Tire pressure ──
    T('TIRE PRESSURE', 20, 560, 200, 14, { size: 9, fill: P.muted, ls: 2 }),
    F(20, 580, 335, 96, P.surface, { r: 12, ch: [
      // abstract car top-view with 4 tires
      F(80, 20, 175, 56, P.surface2, { r: 8 }),
      ...[
        [20, 12, '42', P.charge], [255, 12, '41', P.charge],
        [20, 56, '43', P.warn  ], [255, 56, '42', P.charge],
      ].map(([tx, ty, psi, color]) => [
        F(tx, ty, 36, 24, P.surface2, { r: 4 }),
        T(psi, tx, ty+4, 36, 16, { size: 12, weight: 700, fill: color, align: 'center' }),
      ]).flat(),
      T('PSI', 152, 38, 30, 16, { size: 9, fill: P.muted, align: 'center' }),
    ]}),

    F(0, 732, 375, 80, P.surface, { ch: [
      Line(0, 0, 375, P.border),
      ...[['⚡','Power',0], ['🗺','Trip',1], ['📊','Stats',2], ['⚙','Settings',3]].map(([icon, label, j]) => {
        const nx = 20 + j * 84;
        return [
          F(nx + 18, 10, 48, 48, '#00000000', { r: 24 }),
          T(icon, nx+22, 16, 40, 24, { size: 18, fill: P.muted }),
          T(label, nx+8, 42, 68, 14, { size: 10, fill: P.muted, align: 'center' }),
        ];
      }).flat(),
    ]}),
  ]});
}

// ══════════════════════════════════════════════════════════════════════════════
// DESKTOP SCREENS (1440 × 900)
// ══════════════════════════════════════════════════════════════════════════════
const SW = 280; // sidebar width
const DH = 900;

function desktopDashboard(ox) {
  const cw = 1440 - SW;
  return F(ox, 0, 1440, DH, P.bg, { clip: true, ch: [
    // ── Sidebar ──
    F(0, 0, SW, DH, P.surface, { ch: [
      VLine(SW-1, 0, DH, P.border),
      // ambient glow at top
      ...Glow(140, 60, 50, P.accent),
      T('VOLTA', 32, 32, 140, 24, { size: 16, weight: 900, ls: 5, fill: P.accent }),
      Line(0, 72, SW, P.border),
      // nav items
      ...['⚡  Dashboard', '🗺  Trips', '⚡  Charging', '📊  Analytics', '🔧  Service', '⚙  Settings'].map((item, i) => {
        const active = i === 0;
        return [
          ...(active ? [F(0, 88 + i*52, 3, 36, P.accent, {})] : []),
          F(active?12:0, 88+i*52, SW-(active?12:0), 36, active ? P.accent+'18' : '#00000000', { r: active?6:0 }),
          T(item, 28, 95+i*52, SW-56, 22, { size: 13, fill: active ? P.accent : P.muted, weight: active?600:400 }),
        ];
      }).flat(),
      // vehicle card at bottom
      Line(0, DH-120, SW, P.border),
      F(20, DH-108, SW-40, 88, P.surface2, { r: 10, ch: [
        E(12, 20, 36, 36, P.accent+'22', {}),
        T('⚡', 14, 24, 32, 32, { size: 18, align: 'center' }),
        T('Model Y 2024', 56, 16, 160, 18, { size: 13, weight: 600, fill: P.fg }),
        T('78% · 247 mi range', 56, 38, 160, 14, { size: 11, fill: P.muted }),
        F(56, 60, 120, 6, P.border, { r: 3 }),
        F(56, 60, 94, 6, P.accent, { r: 3 }),
      ]}),
    ]}),

    // ── Top bar ──
    F(SW, 0, cw, 64, P.bg, { ch: [
      Line(0, 63, cw, P.border),
      T('Dashboard', 32, 18, 300, 28, { size: 20, weight: 700, fill: P.fg }),
      T('Good evening, Rakis', 32, 44, 300, 16, { size: 12, fill: P.muted }),
      StatusPill(cw-200, 20, 'CHARGING · L2', P.charge),
      F(cw-100, 16, 72, 32, P.accent+'22', { r: 16, ch: [
        T('🔔', 0, 6, 72, 20, { size: 14, align: 'center' }),
      ]}),
    ]}),

    // ── Hero stat cards ──
    ...([
      ['BATTERY',   '78%',    '+2% / hr',  P.accent,  ''],
      ['RANGE',     '247 mi', 'Full: 316',  P.fg,      ''],
      ['CHARGING',  '11.2 kW','L2 · Est 1h', P.charge, ''],
      ['EFFICIENCY','94 / 100','↑ +3 pts',  P.charge,  ''],
    ].map(([label, val, sub, color], i) => {
      const crd = (cw - 80 - 3*20) / 4;
      const cx = SW + 32 + i * (crd + 20);
      return F(cx, 80, crd, 100, P.surface, { r: 12, ch: [
        ...Glow(crd/2, 50, 20, color),
        T(label,  16, 14, crd-32, 14, { size: 9, fill: P.muted, ls: 1.5 }),
        T(val,    16, 34, crd-32, 36, { size: 28, weight: 800, fill: color, ls: -1 }),
        T(sub,    16, 74, crd-32, 14, { size: 11, fill: P.muted }),
      ]});
    })),

    // ── Main: large battery visual + chart ──
    F(SW+32, 196, 420, 400, P.surface, { r: 16, ch: [
      T('BATTERY STATUS', 24, 20, 280, 14, { size: 9, fill: P.muted, ls: 2 }),
      // giant ring
      ...Glow(210, 220, 90, P.accent),
      ...BatteryRing(210, 180, 0.78, P.accent),
      T('78', 165, 156, 90, 68, { size: 56, weight: 900, fill: P.accent, align: 'center', ls: -3 }),
      T('%', 255, 170, 30, 24, { size: 18, fill: P.muted }),
      T('CHARGED', 162, 232, 96, 14, { size: 9, fill: P.muted, ls: 2, align: 'center' }),
      T('247 mi remaining', 120, 260, 180, 20, { size: 15, weight: 600, fill: P.fg, align: 'center' }),
      Line(0, 296, 420, P.border),
      // mini stats row
      ...['TEMP\n72°F', 'VOLTAGE\n396V', 'CURRENT\n28A'].map((txt, i) => {
        const [label, val] = txt.split('\n');
        return [
          VLine(i > 0 ? 140*i : 0, 296, 104, P.border),
          T(label, 14 + i*140, 310, 120, 14, { size: 9, fill: P.muted, ls: 1 }),
          T(val,   14 + i*140, 330, 120, 24, { size: 18, weight: 700, fill: [P.charge, P.fg, P.accent][i] }),
        ];
      }).flat(),
    ]}),

    // ── Power history chart ──
    F(SW+32+440, 196, cw-480, 400, P.surface, { r: 16, ch: [
      T('POWER CONSUMPTION', 24, 20, 300, 14, { size: 9, fill: P.muted, ls: 2 }),
      T('Past 24 hours', 24, 42, 200, 14, { size: 12, fill: P.muted }),
      Line(0, 64, cw-480, P.border),
      // chart area
      ...Array.from({ length: 24 }, (_, i) => {
        const bh = Math.max(10, Math.round(60 + Math.sin(i*0.6)*35 + Math.cos(i*1.2)*25 + (i>18?40:0)));
        const isCharge = i > 18;
        return F(20 + i*((cw-540)/24), 280-bh, Math.floor((cw-540)/24)-2, bh,
          isCharge ? P.charge : P.accent, { r: 2, opacity: 0.4 + (isCharge?0.4:0) });
      }),
      T('12am', 20, 294, 40, 12, { size: 8, fill: P.muted }),
      T('6am',  (cw-540)/4+20, 294, 30, 12, { size: 8, fill: P.muted }),
      T('12pm', (cw-540)/2+20, 294, 40, 12, { size: 8, fill: P.muted }),
      T('6pm',  3*(cw-540)/4+20, 294, 30, 12, { size: 8, fill: P.muted }),
      T('Now',  cw-548, 294, 30, 12, { size: 8, fill: P.muted }),
      // legend
      F(cw-540, 20, 12, 12, P.accent, { r: 2 }),
      T('Driving', cw-524, 20, 60, 12, { size: 10, fill: P.muted }),
      F(cw-450, 20, 12, 12, P.charge, { r: 2 }),
      T('Charging', cw-434, 20, 70, 12, { size: 10, fill: P.muted }),
    ]}),

    // ── Recent trips + charging footer ──
    F(SW+32, 612, 420, 240, P.surface, { r: 16, ch: [
      T('RECENT TRIPS', 24, 16, 200, 14, { size: 9, fill: P.muted, ls: 2 }),
      Line(0, 40, 420, P.border),
      ...['Home → Downtown · 8.4 mi',
          'Downtown → Airport · 14.2 mi',
          'Airport → Home · 14.2 mi',
      ].flatMap((trip, i) => [
        T(trip, 20, 56+i*56, 300, 18, { size: 13, fill: P.fg }),
        T(['94%','91%','88%'][i]+' eff', 360, 56+i*56, 40, 18, { size: 12, fill: P.charge, align: 'right' }),
        ...(i<2 ? [Line(0, 56+i*56+36, 420, P.border)] : []),
      ]),
    ]}),

    F(SW+32+440, 612, cw-480, 240, P.surface, { r: 16, ch: [
      T('CHARGING SCHEDULE', 24, 16, 280, 14, { size: 9, fill: P.muted, ls: 2 }),
      Line(0, 40, cw-480, P.border),
      T('Smart charging enabled', 20, 56, 300, 18, { size: 13, fill: P.charge, weight: 600 }),
      T('Optimizing for off-peak rates · Next: 11PM–6AM', 20, 80, 400, 16, { size: 12, fill: P.muted }),
      F(20, 110, 200, 36, P.accent, { r: 8, ch: [
        T('Charge Now', 0, 9, 200, 18, { size: 13, weight: 700, fill: P.bg, align: 'center' }),
      ]}),
      F(236, 110, 160, 36, '#00000000', { r: 8, stroke: P.border, sw: 1, ch: [
        T('Schedule', 0, 9, 160, 18, { size: 13, fill: P.muted, align: 'center' }),
      ]}),
    ]}),
  ]});
}

function desktopChargingMap(ox) {
  const cw = 1440 - SW;
  return F(ox, 0, 1440, DH, P.bg, { clip: true, ch: [
    // sidebar (same structure)
    F(0, 0, SW, DH, P.surface, { ch: [
      VLine(SW-1, 0, DH, P.border),
      T('VOLTA', 32, 32, 140, 24, { size: 16, weight: 900, ls: 5, fill: P.accent }),
      Line(0, 72, SW, P.border),
      ...['⚡  Dashboard', '🗺  Trips', '⚡  Charging', '📊  Analytics', '🔧  Service', '⚙  Settings'].map((item, i) => {
        const active = i === 2;
        return [
          ...(active ? [F(0, 88+i*52, 3, 36, P.accent, {})] : []),
          F(active?12:0, 88+i*52, SW-(active?12:0), 36, active?P.accent+'18':'#00000000', { r: active?6:0 }),
          T(item, 28, 95+i*52, SW-56, 22, { size: 13, fill: active?P.accent:P.muted, weight: active?600:400 }),
        ];
      }).flat(),
    ]}),

    // top bar
    F(SW, 0, cw, 64, P.bg, { ch: [
      Line(0, 63, cw, P.border),
      T('Charging Network', 32, 18, 400, 28, { size: 20, weight: 700, fill: P.fg }),
      F(cw-280, 14, 240, 36, P.surface, { r: 18, ch: [
        T('🔍  Search charging stations...', 16, 8, 200, 20, { size: 12, fill: P.muted }),
      ]}),
    ]}),

    // ── Abstract map area (left 2/3) ──
    F(SW+32, 80, 780, DH-112, P.surface, { r: 16, ch: [
      // grid bg (map-like)
      ...Array.from({ length: 8 }, (_, i) => Line(0, i*100, 780, P.border + '40')),
      ...Array.from({ length: 7 }, (_, i) => VLine(i*110, 0, DH-112, P.border + '40')),
      // charging station dots (scattered)
      ...([
        [120, 180, P.charge, true,  'Supercharger · 8 stalls'],
        [340, 280, P.charge, false, 'ChargePoint · 4 stalls'],
        [520, 160, P.accent, false, 'EVgo · 2 stalls'],
        [200, 420, P.charge, true,  'Supercharger · 12 stalls'],
        [620, 340, P.warn,   false, 'Blink · 3 stalls (busy)'],
        [440, 460, P.charge, false, 'ChargePoint · 6 stalls'],
        [680, 220, P.accent, true,  'Supercharger · 6 stalls'],
      ].flatMap(([sx, sy, color, available]) => [
        ...Glow(sx, sy, 12, color),
        E(sx-8, sy-8, 16, 16, color, { opacity: available ? 1 : 0.4 }),
      ])),
      // current location dot
      ...Glow(390, 380, 16, P.fg),
      E(382, 372, 16, 16, P.fg, {}),
      E(386, 376, 8, 8, P.bg, {}),
      // range circle
      E(310, 300, 160, 160, P.accent, { opacity: 0.05 }),
      E(322, 312, 136, 136, P.accent, { stroke: P.accent, sw: 1, opacity: 0.15 }),
    ]}),

    // ── Station list (right panel) ──
    F(SW+32+800, 80, cw-840, DH-112, P.surface, { r: 16, ch: [
      T('NEARBY STATIONS', 20, 16, 260, 14, { size: 9, fill: P.muted, ls: 2 }),
      Line(0, 40, cw-840, P.border),
      ...([
        ['Tesla Supercharger', 'Market St', '0.4 mi', '8/8', P.charge, '250kW'],
        ['Tesla Supercharger', 'Embarcadero', '1.2 mi', '5/12', P.charge, '250kW'],
        ['ChargePoint', 'Union Square', '0.8 mi', '2/4', P.accent, '50kW'],
        ['EVgo', 'SoMa', '1.5 mi', '1/2', P.warn, '100kW'],
        ['Blink', 'Mission', '2.1 mi', '0/3', P.hot, '7kW'],
      ].flatMap(([name, addr, dist, stalls, color, power], i) => {
        const sy = 52 + i * 100;
        return [
          F(12, sy, cw-864, 88, i===0 ? P.accent+'10' : '#00000000', { r: 10 }),
          E(20, sy+20, 10, 10, color, {}),
          T(name,  36, sy+10, 200, 18, { size: 13, weight: 600, fill: P.fg }),
          T(addr,  36, sy+32, 200, 14, { size: 11, fill: P.muted }),
          T(power, 36, sy+52, 80,  14, { size: 11, fill: color }),
          T(dist,  cw-880, sy+10, 60, 18, { size: 13, fill: P.muted, align: 'right' }),
          T(stalls + ' open', cw-880, sy+32, 70, 14, { size: 11, fill: color, align: 'right' }),
          ...(i<4 ? [Line(12, sy+88, cw-864, P.border)] : []),
        ];
      })),
    ]}),
  ]});
}

function desktopAnalytics(ox) {
  const cw = 1440 - SW;
  return F(ox, 0, 1440, DH, P.bg, { clip: true, ch: [
    F(0, 0, SW, DH, P.surface, { ch: [
      VLine(SW-1, 0, DH, P.border),
      T('VOLTA', 32, 32, 140, 24, { size: 16, weight: 900, ls: 5, fill: P.accent }),
      Line(0, 72, SW, P.border),
      ...['⚡  Dashboard', '🗺  Trips', '⚡  Charging', '📊  Analytics', '🔧  Service', '⚙  Settings'].map((item, i) => {
        const active = i === 3;
        return [
          ...(active ? [F(0, 88+i*52, 3, 36, P.accent, {})] : []),
          F(active?12:0, 88+i*52, SW-(active?12:0), 36, active?P.accent+'18':'#00000000', { r: active?6:0 }),
          T(item, 28, 95+i*52, SW-56, 22, { size: 13, fill: active?P.accent:P.muted, weight: active?600:400 }),
        ];
      }).flat(),
    ]}),

    F(SW, 0, cw, 64, P.bg, { ch: [
      Line(0, 63, cw, P.border),
      T('Analytics', 32, 18, 300, 28, { size: 20, weight: 700, fill: P.fg }),
      // period tabs
      ...['Week','Month','Quarter','Year'].map((t, i) => {
        const active = i === 1;
        return F(cw-380+i*88, 16, 80, 32, active?P.accent:'#00000000', { r: 16, ch: [
          T(t, 0, 7, 80, 18, { size: 12, fill: active?P.bg:P.muted, weight: active?700:400, align: 'center' }),
        ]});
      }),
    ]}),

    // ── Top KPI row ──
    ...([
      ['TOTAL DISTANCE', '1,842 mi', '↑ 12%',  P.fg],
      ['ENERGY CONSUMED','401 kWh',  '↑ 8%',   P.accent],
      ['CHARGING COST',  '$89.40',   '↓ 3%',   P.warn],
      ['CO₂ AVOIDED',    '187 lbs',  '↑ 8%',   P.charge],
      ['AVG EFFICIENCY', '94 / 100', '↑ 3pts', P.charge],
    ].map(([label, val, delta, color], i) => {
      const crd = (cw - 80 - 4*20) / 5;
      const cx = SW + 32 + i*(crd+20);
      return F(cx, 80, crd, 88, P.surface, { r: 12, ch: [
        T(label, 12, 12, crd-24, 12, { size: 8, fill: P.muted, ls: 1 }),
        T(val,   12, 30, crd-24, 28, { size: 22, weight: 800, fill: color, ls: -0.5 }),
        F(12, 68, 50, 6, color, { r: 3, opacity: 0.4 }),
        T(delta, crd-56, 68, 44, 10, { size: 9, fill: color, align: 'right' }),
      ]});
    })),

    // ── Main line chart ──
    F(SW+32, 184, cw-64, 260, P.surface, { r: 16, ch: [
      T('ENERGY USAGE & EFFICIENCY', 24, 16, 400, 14, { size: 9, fill: P.muted, ls: 2 }),
      Line(0, 44, cw-64, P.border),
      ...Array.from({ length: 30 }, (_, i) => {
        const bh = Math.max(8, Math.round(80 + Math.sin(i*0.7)*40 + Math.cos(i*1.3)*30));
        return F(24 + i*((cw-112)/30), 200-bh, Math.floor((cw-112)/30)-1, bh, P.accent, { r: 2, opacity: 0.35 + (i===29?0.45:0) });
      }),
      // efficiency line (simulated as dots)
      ...Array.from({ length: 30 }, (_, i) => {
        const ey = 80 + Math.round(Math.sin(i*0.5)*20 + Math.cos(i*0.9)*15);
        return E(24+i*((cw-112)/30), 210-ey, 6, 6, P.charge, { opacity: 0.8 });
      }),
      // x labels
      ...['Jan','Feb','Mar','Apr'].map((m, i) =>
        T(m, 24+i*Math.floor((cw-112)/4), 212, 40, 12, { size: 8, fill: P.muted })
      ),
    ]}),

    // ── Bottom: trip breakdown + charging heatmap ──
    F(SW+32, 460, (cw-64)*0.55, 400, P.surface, { r: 16, ch: [
      T('TRIP BREAKDOWN', 24, 16, 300, 14, { size: 9, fill: P.muted, ls: 2 }),
      Line(0, 44, (cw-64)*0.55, P.border),
      // donut-style breakdown (concentric arcs as ellipses)
      ...Glow(120, 180, 60, P.accent),
      E(60, 116, 120, 120, P.accent + '18', {}),
      E(72, 128, 96, 96, P.accent + '28', {}),
      E(84, 140, 72, 72, P.accent + '40', {}),
      E(96, 152, 48, 48, P.accent + '60', {}),
      E(108, 164, 24, 24, P.accent + 'cc', {}),
      T('68%', 96, 164, 48, 20, { size: 14, weight: 700, fill: P.accent, align: 'center' }),
      T('Highway', 96, 182, 48, 12, { size: 8, fill: P.muted, align: 'center' }),
      // legend
      ...(['Highway 68%', 'City 22%', 'Suburb 10%'].map((item, i) => {
        const [label, pct] = item.split(' ');
        const colors = [P.accent, P.charge, P.warn];
        return [
          E(260, 90+i*44, 10, 10, colors[i], {}),
          T(label, 276, 85+i*44, 80, 16, { size: 12, fill: P.fg }),
          T(pct, 276, 104+i*44, 80, 14, { size: 11, fill: P.muted }),
        ];
      }).flat()),
    ]}),

    F(SW+32 + Math.floor((cw-64)*0.55) + 20, 460, Math.floor((cw-64)*0.45) - 20, 400, P.surface, { r: 16, ch: [
      T('CHARGING HEATMAP', 24, 16, 300, 14, { size: 9, fill: P.muted, ls: 2 }),
      Line(0, 44, Math.floor((cw-64)*0.45) - 20, P.border),
      // 7×24 heatmap grid
      ...Array.from({ length: 7 }, (_, day) =>
        Array.from({ length: 12 }, (_, hr) => {
          const intensity = Math.random() * 0.8 + (hr > 8 && hr < 11 ? 0.2 : 0);
          const color = intensity > 0.6 ? P.charge : intensity > 0.3 ? P.accent : P.muted;
          return F(24 + hr*22, 64 + day*28, 18, 22, color, { r: 3, opacity: intensity });
        })
      ).flat(),
      ...['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) =>
        T(d, 4, 68+i*28, 18, 18, { size: 8, fill: P.muted })
      ),
    ]}),
  ]});
}

function desktopSettings(ox) {
  const cw = 1440 - SW;
  return F(ox, 0, 1440, DH, P.bg, { clip: true, ch: [
    F(0, 0, SW, DH, P.surface, { ch: [
      VLine(SW-1, 0, DH, P.border),
      T('VOLTA', 32, 32, 140, 24, { size: 16, weight: 900, ls: 5, fill: P.accent }),
      Line(0, 72, SW, P.border),
      ...['⚡  Dashboard', '🗺  Trips', '⚡  Charging', '📊  Analytics', '🔧  Service', '⚙  Settings'].map((item, i) => {
        const active = i === 5;
        return [
          ...(active ? [F(0, 88+i*52, 3, 36, P.accent, {})] : []),
          F(active?12:0, 88+i*52, SW-(active?12:0), 36, active?P.accent+'18':'#00000000', { r: active?6:0 }),
          T(item, 28, 95+i*52, SW-56, 22, { size: 13, fill: active?P.accent:P.muted, weight: active?600:400 }),
        ];
      }).flat(),
    ]}),

    F(SW, 0, cw, 64, P.bg, { ch: [
      Line(0, 63, cw, P.border),
      T('Settings', 32, 18, 300, 28, { size: 20, weight: 700, fill: P.fg }),
    ]}),

    // ── Profile / vehicle card ──
    F(SW+32, 80, cw-64, 100, P.surface, { r: 16, ch: [
      ...Glow(50, 50, 28, P.accent),
      E(16, 16, 56, 56, P.accent+'22', {}),
      T('R', 22, 22, 44, 44, { size: 24, weight: 900, fill: P.accent, align: 'center' }),
      T('Rakis', 88, 20, 300, 26, { size: 20, weight: 700, fill: P.fg }),
      T('rakis@hyperio.ai  ·  Model Y LR AWD 2024', 88, 50, 500, 16, { size: 13, fill: P.muted }),
      F(cw-200, 30, 120, 36, P.accent+'22', { r: 8, ch: [
        T('Edit Profile', 0, 9, 120, 18, { size: 12, fill: P.accent, align: 'center', weight: 600 }),
      ]}),
    ]}),

    // ── Settings sections ──
    ...([
      { title: 'Charging Preferences', y: 200, items: [
        ['Default Charge Limit', '80%'],
        ['Smart Charging', 'Enabled'],
        ['Off-Peak Only', 'On (11PM–6AM)'],
        ['Max Charge Rate', '11.2 kW'],
      ]},
      { title: 'Navigation', y: 200, col2: true, items: [
        ['Route Optimization', 'Range Priority'],
        ['Charge Stops', 'Automatic'],
        ['Traffic Avoidance', 'On'],
        ['Speed Alerts', 'Off'],
      ]},
      { title: 'Notifications', y: 520, items: [
        ['Charge Complete', 'Push + SMS'],
        ['Low Battery', 'Push'],
        ['Trip Reminders', 'On'],
        ['Software Updates', 'On'],
      ]},
      { title: 'Display & Units', y: 520, col2: true, items: [
        ['Distance', 'Miles'],
        ['Temperature', 'Fahrenheit'],
        ['Energy', 'kWh'],
        ['Dark Mode', 'Always'],
      ]},
    ]).flatMap(({ title, y, items, col2 }) => {
      const sx = SW + 32 + (col2 ? (cw-64)/2 + 20 : 0);
      const sw2 = (cw-64)/2 - 10;
      return [
        T(title.toUpperCase(), sx, y, 300, 14, { size: 9, fill: P.muted, ls: 1.5 }),
        F(sx, y+24, sw2, 16 + items.length*52, P.surface, { r: 12 }),
        ...items.flatMap(([label, val], i) => {
          const iy = y + 24 + 12 + i*52;
          return [
            T(label, sx+20, iy, 300, 20, { size: 13, fill: P.fg, opacity: 0.8 }),
            T(val, sx+sw2-120, iy, 100, 20, { size: 12, fill: P.muted, align: 'right' }),
            ...(i<items.length-1 ? [Line(sx+20, y+24+52+i*52, sw2-40, P.border)] : []),
          ];
        }),
      ];
    }),

    F(SW, DH-48, cw, 48, P.surface, { ch: [
      Line(0, 0, cw, P.border),
      T('VOLTA v4.2.1  ·  VIN: 5YJ3E1EA4KF000001', 32, 14, 400, 18, { size: 11, fill: P.muted }),
      T('Sign Out', cw-120, 14, 100, 18, { size: 12, fill: P.hot, opacity: 0.6, align: 'right' }),
    ]}),
  ]});
}

// ── Canvas layout ─────────────────────────────────────────────────────────────
const MW = 375, MGAP = 60;
const DW = 1440, DGAP = 100;
const MSX = i => i * (MW + MGAP);
const DSTART = 5 * (MW + MGAP) + 200;
const DSX = i => DSTART + i * (DW + DGAP);

// ── Build doc ─────────────────────────────────────────────────────────────────
const doc = {
  version: '2.8',
  variables: {
    bg:     { type: 'color', value: P.bg },
    accent: { type: 'color', value: P.accent },
    charge: { type: 'color', value: P.charge },
    fg:     { type: 'color', value: P.fg },
  },
  children: [
    mobileDashboard(MSX(0)),
    mobileCharging(MSX(1)),
    mobileTripPlanner(MSX(2)),
    mobileAnalytics(MSX(3)),
    mobileVehicle(MSX(4)),
    desktopDashboard(DSX(0)),
    desktopChargingMap(DSX(1)),
    desktopAnalytics(DSX(2)),
    desktopSettings(DSX(3)),
    // 10th screen: desktop trip history
    (function desktopTrips(ox) {
      const cw = 1440 - SW;
      return F(ox, 0, 1440, DH, P.bg, { clip: true, ch: [
        F(0, 0, SW, DH, P.surface, { ch: [
          VLine(SW-1, 0, DH, P.border),
          T('VOLTA', 32, 32, 140, 24, { size: 16, weight: 900, ls: 5, fill: P.accent }),
          Line(0, 72, SW, P.border),
          ...['⚡  Dashboard', '🗺  Trips', '⚡  Charging', '📊  Analytics', '🔧  Service', '⚙  Settings'].map((item, i) => {
            const active = i === 1;
            return [
              ...(active ? [F(0, 88+i*52, 3, 36, P.accent, {})] : []),
              F(active?12:0, 88+i*52, SW-(active?12:0), 36, active?P.accent+'18':'#00000000', { r: active?6:0 }),
              T(item, 28, 95+i*52, SW-56, 22, { size: 13, fill: active?P.accent:P.muted, weight: active?600:400 }),
            ];
          }).flat(),
        ]}),
        F(SW, 0, cw, 64, P.bg, { ch: [
          Line(0, 63, cw, P.border),
          T('Trip History', 32, 18, 300, 28, { size: 20, weight: 700, fill: P.fg }),
          F(cw-180, 16, 148, 32, P.accent, { r: 8, ch: [
            T('+ Plan New Trip', 0, 7, 148, 18, { size: 12, weight: 700, fill: P.bg, align: 'center' }),
          ]}),
        ]}),
        // summary cards
        ...([
          ['THIS MONTH', '412 mi', P.fg],
          ['AVG EFFICIENCY', '94%', P.charge],
          ['LONGEST TRIP', '183 mi', P.accent],
          ['TOTAL TRIPS', '38', P.fg],
        ].map(([label, val, color], i) => {
          const crd = (cw-80-3*20)/4;
          return F(SW+32+i*(crd+20), 80, crd, 80, P.surface, { r: 12, ch: [
            T(label, 14, 12, crd-28, 12, { size: 8, fill: P.muted, ls: 1 }),
            T(val, 14, 30, crd-28, 28, { size: 24, weight: 800, fill: color, ls: -1 }),
          ]});
        })),
        // trip table
        F(SW+32, 176, cw-64, DH-200, P.surface, { r: 16, ch: [
          ...(['DATE', 'ROUTE', 'DISTANCE', 'DURATION', 'EFFICIENCY', 'ENERGY', 'COST'].map((col, i) => {
            const xs = [16, 100, 360, 480, 580, 700, 820];
            return T(col, xs[i]||16+i*120, 16, 100, 14, { size: 9, fill: P.muted, ls: 1, weight: 600 });
          })),
          Line(0, 38, cw-64, P.border),
          ...([
            ['Mar 14', 'Home → Downtown', '8.4 mi', '22 min', '96%', '2.1 kWh', '$0.49'],
            ['Mar 14', 'Downtown → SFO', '14.2 mi', '31 min', '93%', '3.8 kWh', '$0.89'],
            ['Mar 13', 'SFO → Home', '14.2 mi', '35 min', '89%', '4.1 kWh', '$0.96'],
            ['Mar 13', 'Home → Palo Alto', '34.1 mi', '52 min', '94%', '9.2 kWh', '$2.16'],
            ['Mar 12', 'Palo Alto → SF', '34.1 mi', '48 min', '96%', '8.8 kWh', '$2.06'],
            ['Mar 11', 'SF → Napa', '62.3 mi', '1h 22m', '91%', '17.4 kWh', '$4.08'],
            ['Mar 10', 'Napa → SF', '62.3 mi', '1h 18m', '93%', '16.9 kWh', '$3.96'],
          ].flatMap((row, ri) => {
            const xs = [16, 100, 360, 480, 580, 700, 820];
            const effColor = parseFloat(row[4]) >= 95 ? P.charge : parseFloat(row[4]) >= 90 ? P.accent : P.warn;
            return [
              ...row.map((cell, ci) => T(cell, xs[ci]||16+ci*120, 52+ri*52, 120, 18, {
                size: 13, fill: ci===4 ? effColor : ci===6 ? P.warn : ci===0 ? P.muted : P.fg,
              })),
              ...(ri<6 ? [Line(0, 52+ri*52+36, cw-64, P.border)] : []),
            ];
          })),
        ]}),
      ]});
    })(DSX(4)),
  ],
};

// ── Publish ───────────────────────────────────────────────────────────────────
function renderElSVG(el, depth) {
  if (!el || depth > 5) return '';
  const x=el.x||0, y=el.y||0, w=Math.max(0,el.width||0), h=Math.max(0,el.height||0);
  const fill=el.fill||'none';
  const oAttr=(el.opacity!==undefined&&el.opacity<0.99)?` opacity="${el.opacity.toFixed(2)}"` :'';
  const rAttr=el.cornerRadius?` rx="${Math.min(el.cornerRadius,w/2,h/2)}"` :'';
  if(el.type==='frame'){const bg=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${rAttr}${oAttr}/>`;const kids=(el.children||[]).map(c=>renderElSVG(c,depth+1)).join('');return kids?`${bg}<g transform="translate(${x},${y})">${kids}</g>`:bg;}
  if(el.type==='ellipse'){return `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="${fill}"${oAttr}/>`;}
  if(el.type==='text'){const fh=Math.max(1,Math.min(h,(el.fontSize||13)*0.7));return `<rect x="${x}" y="${y+(h-fh)/2}" width="${w}" height="${fh}" fill="${fill}"${oAttr} rx="1"/>`;}
  return '';
}
function screenThumb(s,tw,th){const kids=(s.children||[]).map(c=>renderElSVG(c,0)).join('');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.width} ${s.height}" width="${tw}" height="${th}" style="display:block;border-radius:8px;flex-shrink:0"><rect width="${s.width}" height="${s.height}" fill="${s.fill||'#111'}"/>${kids}</svg>`;}

const encoded = Buffer.from(JSON.stringify(doc)).toString('base64');
const THUMB_H = 200;
const thumbsHTML = doc.children.map((s, i) => {
  const tw = Math.round(THUMB_H * (s.width / s.height));
  const label = i < 5 ? `MOBILE ${i+1}` : `DESKTOP ${i-4}`;
  return `<div style="text-align:center;flex-shrink:0">${screenThumb(s,tw,THUMB_H)}<div style="font-size:9px;letter-spacing:1px;opacity:.35;margin-top:8px;color:${P.fg}">${label}</div></div>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VOLTA — EV Companion App</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:${P.bg};color:${P.fg};font-family:'SF Mono','Fira Code',ui-monospace,monospace;min-height:100vh}
  nav{padding:20px 40px;border-bottom:1px solid ${P.accent}22;display:flex;justify-content:space-between;align-items:center}
  .logo{font-size:14px;font-weight:900;letter-spacing:6px;color:${P.accent}}
  .nav-tag{font-size:11px;color:${P.muted};letter-spacing:1px}
  .hero{padding:80px 40px 40px;max-width:1000px}
  .tag{font-size:10px;letter-spacing:3px;color:${P.accent};margin-bottom:20px}
  h1{font-size:clamp(52px,8vw,104px);font-weight:900;letter-spacing:-3px;line-height:0.95;margin-bottom:24px;color:${P.fg}}
  h1 span{color:${P.accent}}
  .sub{font-size:16px;opacity:.5;max-width:560px;line-height:1.7;margin-bottom:40px}
  .pills{display:flex;gap:10px;margin-bottom:44px;flex-wrap:wrap}
  .pill{padding:6px 14px;border-radius:20px;font-size:10px;font-weight:600;letter-spacing:1px;border:1px solid}
  .pill-blue{background:${P.accent}18;color:${P.accent};border-color:${P.accent}44}
  .pill-green{background:${P.charge}18;color:${P.charge};border-color:${P.charge}44}
  .pill-amber{background:${P.warn}18;color:${P.warn};border-color:${P.warn}44}
  .actions{display:flex;gap:14px;margin-bottom:70px;flex-wrap:wrap}
  .btn{padding:14px 28px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;border:none;text-decoration:none;font-family:inherit;letter-spacing:.5px;display:inline-block}
  .btn-p{background:${P.accent};color:${P.bg}}
  .btn-s{background:transparent;color:${P.fg};border:1px solid ${P.fg}33}
  .preview{padding:0 40px 80px}
  .preview-label{font-size:10px;letter-spacing:2px;opacity:.35;margin-bottom:24px}
  .thumbs{display:flex;gap:20px;overflow-x:auto;padding-bottom:12px;align-items:flex-end}
  .thumbs::-webkit-scrollbar{height:3px}.thumbs::-webkit-scrollbar-track{background:transparent}
  .thumbs::-webkit-scrollbar-thumb{background:${P.accent}44;border-radius:2px}
  .reflection{padding:40px;border-top:1px solid ${P.accent}18;max-width:800px}
  .r-label{font-size:10px;letter-spacing:2px;color:${P.accent};margin-bottom:20px}
  .r-text{font-size:14px;opacity:.55;line-height:1.9}
  .r-text strong{color:${P.fg};opacity:1;font-weight:600}
  footer{padding:28px 40px;border-top:1px solid ${P.accent}11;font-size:11px;opacity:.25;display:flex;justify-content:space-between}
</style>
</head>
<body>
<nav>
  <div class="logo">VOLTA</div>
  <div class="nav-tag">DESIGN CHALLENGE · MARCH 14, 2026</div>
</nav>
<section class="hero">
  <div class="tag">HEARTBEAT · EV COMPANION · 10 SCREENS</div>
  <h1>Electric.<br><span>Intelligent.</span><br>Everywhere.</h1>
  <p class="sub">A complete EV companion app — real-time battery monitoring, trip planning with charging stops, energy analytics, and a charging network map. 5 mobile + 5 desktop screens.</p>
  <div class="pills">
    <span class="pill pill-blue">ELECTRIC BLUE</span>
    <span class="pill pill-green">CHARGE GREEN</span>
    <span class="pill pill-amber">AMBER WARNING</span>
    <span class="pill pill-blue">DARK NAVY BASE</span>
    <span class="pill pill-green">RADIAL GLOW UI</span>
  </div>
  <div class="actions">
    <button class="btn btn-p" onclick="openInViewer()">▶ Open in Pen Viewer</button>
    <button class="btn btn-s" onclick="downloadPen()">↓ Download .pen</button>
    <button class="btn btn-s" onclick="shareOnX()">𝕏 Share</button>
    <a class="btn btn-s" href="https://zenbin.org/p/design-gallery-2">← Gallery</a>
  </div>
</section>
<section class="preview">
  <div class="preview-label">SCREEN PREVIEW · 5 MOBILE + 5 DESKTOP</div>
  <div class="thumbs">${thumbsHTML}</div>
</section>
<section class="reflection">
  <div class="r-label">DESIGN REFLECTION</div>
  <div class="r-text">
    <p><strong>What I found:</strong> Browsing Dribbble's popular shots tonight, RonDesignLab's Vehicle Controls shot (103 ❤ · 8.7k views) stopped me — electric blue on near-black, circular gauge overlays, a technical precision that felt genuinely different from SaaS dashboards. Nixtio's crypto dashboard sat right next to it: neon-on-dark data viz, split compositions mixing photography with interface. Godly's "Superpower" personal health site added the cinematic silhouette-against-gradient energy.</p>
    <br/>
    <p><strong>Challenge:</strong> Design VOLTA, an EV companion app that earns the electric-blue technical aesthetic — not just as decoration but as a semantic system where color = meaning (blue = power state, green = charge/good, amber = caution, red = critical).</p>
    <br/>
    <p><strong>Key decisions:</strong> (1) <strong>Glow as data density</strong> — radial Glow() helper creates layered concentric ellipses at 8–48% opacity, making important data points visually "warmer" without explicit charts. (2) <strong>Semantic palette</strong> — every color carries meaning; the UI communicates state before text is read. (3) <strong>Abstract map language</strong> — rather than a real map tile, the trip planner uses a grid + bezier-approximated route in pure shapes, keeping the aesthetic consistent while implying geography.</p>
    <br/>
    <p><strong>What I'd do differently:</strong> The circular battery gauge is the weakest element — it's concentric ellipses faking an arc, but there's no true arc/path primitive in .pen v2.8. A real swept-arc SVG path would make this read as a proper gauge. That's the next thing I'd push for in the format.</p>
  </div>
</section>
<footer>
  <span>RAM Design Studio · heartbeat challenge</span>
  <span>zenbin.org/p/volta-ev-app</span>
</footer>
<script>
const D='${encoded}';
function openInViewer(){try{const j=atob(D);JSON.parse(j);localStorage.setItem('pv_pending',JSON.stringify({json:j,name:'volta.pen'}));window.open('https://zenbin.org/p/pen-viewer-2','_blank');}catch(e){alert('Error: '+e.message);}}
function downloadPen(){try{const j=atob(D);const b=new Blob([j],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='volta.pen';a.click();URL.revokeObjectURL(a.href);}catch(e){alert('Error: '+e.message);}}
function shareOnX(){const text=encodeURIComponent('VOLTA — EV companion app design prototype ⚡ Built by RAM Design Studio');const url=encodeURIComponent(window.location.href);window.open('https://x.com/intent/tweet?text='+text+'&url='+url,'_blank');}
<\/script>
</body>
</html>`;

// Publish
function req(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

(async () => {
  const payload = JSON.stringify({ title: 'VOLTA — EV Companion App', html });
  console.log(`HTML size: ${(html.length/1024).toFixed(1)}KB`);
  for (const slug of ['volta-ev-app', 'volta-ev-app-' + Date.now().toString(36).slice(-4)]) {
    const r = await req({
      hostname: 'zenbin.org',
      path: `/v1/pages/${slug}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, payload);
    if (r.status === 201 || r.status === 200) {
      console.log(`✅ https://zenbin.org/p/${slug}`);
      break;
    }
    if (r.status !== 409) { console.error('Error:', r.status, r.body.slice(0,200)); break; }
  }
})();
