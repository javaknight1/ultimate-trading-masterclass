/* ============================================================
   Self-contained chart engine for the Trading Masterclass.
   Renders <div class="chart" ...> elements into inline SVG:
   - candlestick charts with synthetic scenarios + indicators
   - option payoff diagrams (legs priced via Black-Scholes)
   - Greek / Black-Scholes curves
   No external libraries. window.renderCharts(root) is the entry point.
   ============================================================ */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const cssv = n => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888');
  function COL() {
    return {
      up: cssv('--green'), dn: cssv('--red'), ink: cssv('--ink'), dim: cssv('--ink-dim'),
      faint: cssv('--ink-faint'), grid: cssv('--grid'), amber: cssv('--amber'),
      cyan: cssv('--cyan'), violet: cssv('--violet')
    };
  }
  const OVC = { sma20: '#4aa8ff', sma50: '#ffb020', sma200: '#a78bfa', ema9: '#46e88f', ema21: '#ff8fb0', bb: '#8294a8', vwap: '#d4dee8', psar: '#ffb020', fib: '#8294a8', trend: '#4aa8ff' };

  function E(tag, attrs, txt) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

  /* ---------------- scenario -> OHLC + auto annotations ---------------- */
  function genSeries(scn) {
    const N = 72, r = rng(hash(scn)), lv = new Array(N).fill(0), notes = [];
    const ramp = (a, b, p0, p1) => { for (let i = a; i <= b; i++) lv[i] = p0 + (p1 - p0) * ((i - a) / (b - a || 1)); };
    const wave = (a, b, base, amp, cyc) => { for (let i = a; i <= b; i++) lv[i] = base + amp * Math.sin(2 * Math.PI * cyc * ((i - a) / (b - a || 1))); };
    const addhump = (c, w, h) => { for (let i = 0; i < N; i++) lv[i] += h * Math.exp(-Math.pow((i - c) / w, 2)); };
    const flat = (a, b, p) => { for (let i = a; i <= b; i++) lv[i] = p; };
    const hl = (price, label, color) => notes.push({ type: 'hline', price, label, color });
    const arrow = (bar, dir) => notes.push({ type: 'arrow', bar, dir });
    const lab = (bar, price, text) => notes.push({ type: 'label', bar, price, text });

    switch (scn) {
      case 'uptrend': ramp(0, N - 1, 88, 134); break;
      case 'downtrend': ramp(0, N - 1, 132, 86); break;
      case 'range': wave(0, N - 1, 100, 8, 3.2); hl(108.5, 'resistance', 'dn'); hl(91.5, 'support', 'up'); break;
      case 'channel-up': ramp(0, N - 1, 90, 130); for (let i = 0; i < N; i++) lv[i] += 4 * Math.sin(2 * Math.PI * 5 * i / N); break;
      case 'channel-down': ramp(0, N - 1, 130, 90); for (let i = 0; i < N; i++) lv[i] += 4 * Math.sin(2 * Math.PI * 5 * i / N); break;
      case 'pullback-uptrend': ramp(0, N - 1, 88, 132); addhump(36, 6, -11); lab(36, 104, 'pullback'); break;
      case 'breakout-up': flat(0, 50, 102); wave(0, 50, 102, 3, 4); ramp(50, N - 1, 102, 126); hl(106, 'resistance', 'dn'); arrow(52, 'up'); lab(55, 118, 'breakout'); break;
      case 'breakdown': flat(0, 50, 100); wave(0, 50, 100, 3, 4); ramp(50, N - 1, 100, 78); hl(96, 'support', 'up'); arrow(52, 'dn'); lab(55, 86, 'breakdown'); break;
      case 'gap-up': flat(0, 35, 99); wave(0, 35, 99, 2, 3); flat(36, N - 1, 113); ramp(36, N - 1, 113, 120); notes.push({ type: 'zone', lo: 101, hi: 111, label: 'gap' }); break;
      case 'v-bottom': ramp(0, 36, 124, 88); ramp(36, N - 1, 88, 122); lab(36, 86, 'capitulation'); break;
      case 'head-shoulders': flat(0, N - 1, 104); addhump(16, 6, 11); addhump(36, 7, 20); addhump(56, 6, 11); ramp(62, N - 1, lv[62] || 104, 94); hl(104, 'neckline', 'dn'); lab(16, 117, 'LS'); lab(36, 126, 'H'); lab(56, 117, 'RS'); arrow(64, 'dn'); break;
      case 'inverse-hs': flat(0, N - 1, 100); addhump(16, 6, -11); addhump(36, 7, -20); addhump(56, 6, -11); ramp(62, N - 1, lv[62] || 100, 112); hl(100, 'neckline', 'up'); arrow(64, 'up'); break;
      case 'double-top': flat(0, N - 1, 106); addhump(20, 7, 18); addhump(48, 7, 18); ramp(56, N - 1, lv[56] || 106, 96); hl(123, 'resistance', 'dn'); lab(20, 126, 'top 1'); lab(48, 126, 'top 2'); arrow(58, 'dn'); break;
      case 'double-bottom': flat(0, N - 1, 114); addhump(20, 7, -18); addhump(48, 7, -18); ramp(56, N - 1, lv[56] || 114, 124); hl(97, 'support', 'up'); arrow(58, 'up'); break;
      case 'bull-flag': ramp(0, 22, 92, 122); ramp(22, 52, 122, 113); for (let i = 22; i <= 52; i++) lv[i] += 1.5 * Math.sin(2 * Math.PI * 3 * (i - 22) / 30); ramp(52, N - 1, 113, 130); lab(11, 110, 'pole'); lab(37, 122, 'flag'); arrow(54, 'up'); break;
      case 'bear-flag': ramp(0, 22, 128, 96); ramp(22, 52, 96, 105); for (let i = 22; i <= 52; i++) lv[i] += 1.5 * Math.sin(2 * Math.PI * 3 * (i - 22) / 30); ramp(52, N - 1, 105, 88); arrow(54, 'dn'); break;
      case 'ascending-triangle': for (let i = 0; i < N; i++) { const t = i / N; const hi = 120; const lo = 95 + 22 * t; lv[i] = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t)); } ramp(58, N - 1, lv[58], 130); hl(120, 'resistance', 'dn'); arrow(60, 'up'); break;
      case 'descending-triangle': for (let i = 0; i < N; i++) { const t = i / N; const lo = 96; const hi = 125 - 22 * t; lv[i] = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t)); } ramp(58, N - 1, lv[58], 84); hl(96, 'support', 'up'); arrow(60, 'dn'); break;
      case 'cup-handle': for (let i = 0; i <= 50; i++) { const t = i / 50; lv[i] = 118 - 26 * Math.sin(Math.PI * t); } ramp(50, 60, 118, 112); ramp(60, N - 1, 112, 128); lab(25, 90, 'cup'); lab(55, 110, 'handle'); arrow(62, 'up'); break;
      case 'golden-cross': ramp(0, 30, 116, 92); ramp(30, N - 1, 92, 128); lab(46, 100, 'golden cross'); break;
      case 'death-cross': ramp(0, 30, 92, 120); ramp(30, N - 1, 120, 86); lab(46, 116, 'death cross'); break;
      case 'rsi-divergence': ramp(0, 30, 96, 120); addhump(28, 8, 4); ramp(30, 50, 120, 112); ramp(50, 62, 112, 123); addhump(58, 7, 3); ramp(62, N - 1, 123, 110); lab(58, 130, 'higher high'); arrow(64, 'dn'); break;
      case 'squeeze': flat(0, 46, 100); wave(0, 46, 100, 1.4, 5); ramp(46, N - 1, 100, 124); lab(23, 95, 'squeeze (low vol)'); arrow(48, 'up'); break;
      case 'parabolic': for (let i = 0; i < N; i++) { const t = i / N; lv[i] = 92 + 46 * (Math.exp(3.2 * t) - 1) / (Math.exp(3.2) - 1); } ramp(66, N - 1, lv[66], lv[66] - 8); lab(60, 142, 'blow-off'); break;
      default: ramp(0, N - 1, 90, 130);
    }
    const bars = [];
    for (let i = 0; i < N; i++) {
      const noise = (r() - 0.5) * 1.5;
      const c = lv[i] + noise;
      const o = i === 0 ? lv[0] - noise * 0.5 : bars[i - 1].c;
      const hi = Math.max(o, c) + r() * 1.1 + 0.2, lo = Math.min(o, c) - r() * 1.1 - 0.2;
      const mv = Math.abs(c - o);
      const v = 0.5 + r() * 0.7 + mv * 0.55;
      bars.push({ o, h: hi, l: lo, c, v });
    }
    return { bars, notes };
  }

  /* ---------------- indicators ---------------- */
  const closes = b => b.map(x => x.c);
  function sma(a, p) { const o = []; for (let i = 0; i < a.length; i++) { if (i < p - 1) { o.push(null); continue; } let s = 0; for (let j = i - p + 1; j <= i; j++) s += a[j]; o.push(s / p); } return o; }
  function ema(a, p) { const o = [], k = 2 / (p + 1); let prev; for (let i = 0; i < a.length; i++) { if (a[i] == null) { o.push(null); continue; } prev = prev == null ? a[i] : a[i] * k + prev * (1 - k); o.push(prev); } return o; }
  function rsi(a, p) { p = p || 14; const o = [null]; let g = 0, l = 0; for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1]; const up = Math.max(d, 0), dn = Math.max(-d, 0); if (i <= p) { g += up; l += dn; if (i === p) { g /= p; l /= p; o.push(100 - 100 / (1 + g / (l || 1e-9))); } else o.push(null); } else { g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p; o.push(100 - 100 / (1 + g / (l || 1e-9))); } } return o; }
  function macd(a) { const e12 = ema(a, 12), e26 = ema(a, 26); const m = a.map((_, i) => e12[i] - e26[i]); const sig = ema(m.map(x => x), 9); const hist = m.map((x, i) => x - sig[i]); return { m, sig, hist }; }
  function stoch(b, p, d) { p = p || 14; d = d || 3; const k = []; for (let i = 0; i < b.length; i++) { if (i < p - 1) { k.push(null); continue; } let hi = -1e9, lo = 1e9; for (let j = i - p + 1; j <= i; j++) { hi = Math.max(hi, b[j].h); lo = Math.min(lo, b[j].l); } k.push(100 * (b[i].c - lo) / ((hi - lo) || 1e-9)); } const kk = k.map(x => x); const dd = sma(k.map(x => x == null ? 0 : x), d).map((x, i) => k[i] == null ? null : x); return { k: kk, d: dd }; }
  function atr(b, p) { p = p || 14; const tr = []; for (let i = 0; i < b.length; i++) { if (i === 0) { tr.push(b[i].h - b[i].l); continue; } tr.push(Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c))); } return ema(tr, p); }
  function obv(b) { const o = [0]; for (let i = 1; i < b.length; i++) o.push(o[i - 1] + (b[i].c > b[i - 1].c ? b[i].v : b[i].c < b[i - 1].c ? -b[i].v : 0)); return o; }
  function bbands(a, p, k) { p = p || 20; k = k || 2; const m = sma(a, p); const up = [], lo = []; for (let i = 0; i < a.length; i++) { if (i < p - 1) { up.push(null); lo.push(null); continue; } let s = 0; for (let j = i - p + 1; j <= i; j++) s += Math.pow(a[j] - m[i], 2); const sd = Math.sqrt(s / p); up.push(m[i] + k * sd); lo.push(m[i] - k * sd); } return { m, up, lo }; }
  function vwap(b) { let pv = 0, vv = 0; return b.map(x => { const tp = (x.h + x.l + x.c) / 3; pv += tp * x.v; vv += x.v; return pv / vv; }); }
  function regression(a) { const n = a.length; let sx = 0, sy = 0, sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sx += i; sy += a[i]; sxy += i * a[i]; sxx += i * i; } const b1 = (n * sxy - sx * sy) / (n * sxx - sx * sx); const b0 = (sy - b1 * sx) / n; return a.map((_, i) => b0 + b1 * i); }
  function psar(b) { let af = 0.02, ep = b[0].l, sar = b[0].h, up = false; const o = [sar]; for (let i = 1; i < b.length; i++) { sar = sar + af * (ep - sar); if (up) { if (b[i].l < sar) { up = false; sar = ep; ep = b[i].l; af = 0.02; } else { if (b[i].h > ep) { ep = b[i].h; af = Math.min(af + 0.02, 0.2); } } } else { if (b[i].h > sar) { up = true; sar = ep; ep = b[i].h; af = 0.02; } else { if (b[i].l < ep) { ep = b[i].l; af = Math.min(af + 0.02, 0.2); } } } o.push(sar); } return o; }

  /* ---------------- Black-Scholes ---------------- */
  function ncdf(x) { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = 0.3989423 * Math.exp(-x * x / 2); let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
  function npdf(x) { return 0.3989423 * Math.exp(-x * x / 2); }
  function bs(S, K, T, r, sig, call) {
    if (T <= 0) { const iv = call ? Math.max(S - K, 0) : Math.max(K - S, 0); return { price: iv, delta: call ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0, rho: 0 }; }
    const d1 = (Math.log(S / K) + (r + sig * sig / 2) * T) / (sig * Math.sqrt(T)), d2 = d1 - sig * Math.sqrt(T);
    const price = call ? S * ncdf(d1) - K * Math.exp(-r * T) * ncdf(d2) : K * Math.exp(-r * T) * ncdf(-d2) - S * ncdf(-d1);
    const delta = call ? ncdf(d1) : ncdf(d1) - 1;
    const gamma = npdf(d1) / (S * sig * Math.sqrt(T));
    const vega = S * npdf(d1) * Math.sqrt(T) / 100;
    const theta = (-(S * npdf(d1) * sig) / (2 * Math.sqrt(T)) - (call ? 1 : -1) * r * K * Math.exp(-r * T) * ncdf((call ? 1 : -1) * d2)) / 365;
    const rho = (call ? 1 : -1) * K * T * Math.exp(-r * T) * ncdf((call ? 1 : -1) * d2) / 100;
    return { price, delta, gamma, theta, vega, rho };
  }

  /* ---------------- SVG helpers ---------------- */
  function svgRoot(w, h) { const s = E('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet' }); return s; }
  function line(x1, y1, x2, y2, stroke, sw, dash) { const a = { x1, y1, x2, y2, stroke, 'stroke-width': sw || 1 }; if (dash) a['stroke-dasharray'] = dash; return E('line', a); }
  function poly(pts, stroke, sw, dash) { const a = { points: pts.map(p => p[0] + ',' + p[1]).join(' '), fill: 'none', stroke, 'stroke-width': sw || 1.4, 'stroke-linejoin': 'round' }; if (dash) a['stroke-dasharray'] = dash; return E('polyline', a); }
  function txt(x, y, s, fill, size, anchor) { return E('text', { x, y, fill, 'font-size': size || 9, 'text-anchor': anchor || 'start' }, s); }

  /* ---------------- candlestick chart ---------------- */
  function priceChart(opts) {
    const c = COL();
    const { bars, notes } = genSeries(opts.scenario || 'uptrend');
    const cl = closes(bars);
    const overlays = (opts.overlays || '').split(',').map(s => s.trim()).filter(Boolean);
    const pane = (opts.pane || '').trim();
    const W = 760, padL = 8, padR = 44, padT = 8;
    const priceH = 250, volH = 46, indH = pane ? 92 : 0, gap = 8;
    const H = padT + priceH + gap + volH + (indH ? gap + indH : 0) + 16;
    const innerW = W - padL - padR;
    const N = bars.length, bw = innerW / N;
    // price scale (include overlays/marks)
    let pmin = Math.min(...bars.map(b => b.l)), pmax = Math.max(...bars.map(b => b.h));
    (notes || []).forEach(nn => { if (nn.type === 'hline') { pmin = Math.min(pmin, nn.price); pmax = Math.max(pmax, nn.price); } if (nn.type === 'zone') { pmin = Math.min(pmin, nn.lo); pmax = Math.max(pmax, nn.hi); } });
    const padp = (pmax - pmin) * 0.06; pmin -= padp; pmax += padp;
    const yP = v => padT + priceH - (v - pmin) / (pmax - pmin) * priceH;
    const xC = i => padL + bw * (i + 0.5);
    const svg = svgRoot(W, H);
    // price gridlines + axis
    const ticks = 5;
    for (let t = 0; t <= ticks; t++) { const v = pmin + (pmax - pmin) * t / ticks; const y = yP(v); svg.appendChild(line(padL, y, padL + innerW, y, c.grid, 1)); svg.appendChild(txt(padL + innerW + 4, y + 3, v.toFixed(0), c.faint, 9)); }
    // marks: zones first (behind)
    (notes || []).forEach(nn => { if (nn.type === 'zone') { const y1 = yP(nn.hi), y2 = yP(nn.lo); svg.appendChild(E('rect', { x: padL, y: y1, width: innerW, height: Math.max(2, y2 - y1), fill: c.amber, opacity: 0.12 })); svg.appendChild(txt(padL + 4, y1 - 3, nn.label || '', c.amber, 9)); } });
    // candles
    bars.forEach((b, i) => { const x = xC(i); const col = b.c >= b.o ? c.up : c.dn; svg.appendChild(line(x, yP(b.h), x, yP(b.l), col, 1)); const yo = yP(b.o), yc = yP(b.c); svg.appendChild(E('rect', { x: x - bw * 0.32, y: Math.min(yo, yc), width: Math.max(bw * 0.64, 1), height: Math.max(Math.abs(yc - yo), 1), fill: col, opacity: 0.92 })); });
    // overlays
    function ov(name) {
      if (name === 'bb') { const { up, lo, m } = bbands(cl, 20, 2); [up, lo].forEach(arr => { const pts = arr.map((v, i) => v == null ? null : [xC(i), yP(v)]).filter(Boolean); svg.appendChild(poly(pts, OVC.bb, 1, '3,3')); }); const pm = m.map((v, i) => v == null ? null : [xC(i), yP(v)]).filter(Boolean); svg.appendChild(poly(pm, OVC.bb, 1)); return 'Bollinger(20,2)'; }
      if (name === 'fib') { const hi = Math.max(...cl), lo = Math.min(...cl); [0, 0.236, 0.382, 0.5, 0.618, 1].forEach(f => { const v = hi - (hi - lo) * f; svg.appendChild(line(padL, yP(v), padL + innerW, yP(v), OVC.fib, 1, '2,3')); svg.appendChild(txt(padL + 2, yP(v) - 2, (f * 100).toFixed(1) + '%', OVC.fib, 8)); }); return 'Fib retracement'; }
      if (name === 'psar') { const p = psar(bars); p.forEach((v, i) => svg.appendChild(E('circle', { cx: xC(i), cy: yP(v), r: 1.3, fill: OVC.psar }))); return 'Parabolic SAR'; }
      if (name === 'trend') { const reg = regression(cl); svg.appendChild(poly(reg.map((v, i) => [xC(i), yP(v)]), OVC.trend, 1.3, '5,3')); return 'trendline'; }
      let arr;
      if (name === 'vwap') arr = vwap(bars); else if (name.startsWith('sma')) arr = sma(cl, +name.slice(3)); else if (name.startsWith('ema')) arr = ema(cl, +name.slice(3)); else return null;
      const pts = arr.map((v, i) => v == null ? null : [xC(i), yP(v)]).filter(Boolean);
      svg.appendChild(poly(pts, OVC[name] || c.cyan, 1.4));
      return name.toUpperCase();
    }
    const legend = [];
    overlays.forEach(o => { const lbl = ov(o); if (lbl) legend.push([OVC[o] || c.cyan, lbl]); });
    // marks: hlines + arrows + labels (front)
    (notes || []).forEach(nn => {
      if (nn.type === 'hline') { const col = nn.color === 'up' ? c.up : nn.color === 'dn' ? c.dn : c.dim; const y = yP(nn.price); svg.appendChild(line(padL, y, padL + innerW, y, col, 1.2, '6,3')); svg.appendChild(txt(padL + 3, y - 3, nn.label || '', col, 9)); }
      if (nn.type === 'arrow') { const x = xC(nn.bar), b = bars[nn.bar]; const up = nn.dir === 'up'; const y = up ? yP(b.l) + 12 : yP(b.h) - 12; const col = up ? c.up : c.dn; const d = up ? `${x},${y - 7} ${x - 5},${y + 3} ${x + 5},${y + 3}` : `${x},${y + 7} ${x - 5},${y - 3} ${x + 5},${y - 3}`; svg.appendChild(E('polygon', { points: d, fill: col })); }
      if (nn.type === 'label') { svg.appendChild(txt(xC(nn.bar), yP(nn.price), nn.text, c.ink, 9, 'middle')); }
    });
    // custom marks from data-marks
    parseMarks(opts.marks).forEach(m => {
      if (m.k === 'support' || m.k === 'resistance') { const col = m.k === 'support' ? c.up : c.dn; const y = yP(m.a); svg.appendChild(line(padL, y, padL + innerW, y, col, 1.2, '6,3')); svg.appendChild(txt(padL + 3, y - 3, m.k, col, 9)); }
      else if (m.k === 'hline') { const y = yP(m.a); svg.appendChild(line(padL, y, padL + innerW, y, c.dim, 1.2, '6,3')); svg.appendChild(txt(padL + 3, y - 3, m.b || '', c.dim, 9)); }
      else if (m.k === 'zone') { const y1 = yP(Math.max(m.a, m.b)), y2 = yP(Math.min(m.a, m.b)); svg.appendChild(E('rect', { x: padL, y: y1, width: innerW, height: Math.max(2, y2 - y1), fill: c.amber, opacity: 0.12 })); }
      else if (m.k === 'up' || m.k === 'down') { const i = Math.round(m.a); if (bars[i]) { const x = xC(i), b = bars[i], up = m.k === 'up'; const y = up ? yP(b.l) + 12 : yP(b.h) - 12; const col = up ? c.up : c.dn; const d = up ? `${x},${y - 7} ${x - 5},${y + 3} ${x + 5},${y + 3}` : `${x},${y + 7} ${x - 5},${y - 3} ${x + 5},${y - 3}`; svg.appendChild(E('polygon', { points: d, fill: col })); } }
      else if (m.k === 'note') { const i = Math.round(m.a); svg.appendChild(txt(xC(i), yP(m.b), m.c || '', c.ink, 9, 'middle')); }
    });
    // volume pane
    const volTop = padT + priceH + gap;
    const vmax = Math.max(...bars.map(b => b.v));
    svg.appendChild(txt(padL, volTop + 9, 'VOL', c.faint, 8));
    bars.forEach((b, i) => { const h = b.v / vmax * (volH - 4); svg.appendChild(E('rect', { x: xC(i) - bw * 0.32, y: volTop + volH - h, width: Math.max(bw * 0.64, 1), height: h, fill: b.c >= b.o ? c.up : c.dn, opacity: 0.5 })); });
    svg.appendChild(line(padL, volTop, padL + innerW, volTop, c.grid, 1));
    // indicator pane
    if (pane) {
      const it = volTop + volH + gap;
      svg.appendChild(line(padL, it, padL + innerW, it, c.grid, 1));
      const yI = (v, lo, hi) => it + 8 + (1 - (v - lo) / (hi - lo)) * (indH - 16);
      const label = (s) => svg.appendChild(txt(padL, it + 11, s, c.faint, 8));
      if (pane === 'rsi') { label('RSI(14)'); [30, 50, 70].forEach(l => { svg.appendChild(line(padL, yI(l, 0, 100), padL + innerW, yI(l, 0, 100), c.grid, 1, l === 50 ? '' : '3,3')); svg.appendChild(txt(padL + innerW + 4, yI(l, 0, 100) + 3, l, c.faint, 8)); }); const R = rsi(cl, 14); svg.appendChild(poly(R.map((v, i) => v == null ? null : [xC(i), yI(v, 0, 100)]).filter(Boolean), c.violet, 1.4)); }
      else if (pane === 'macd') { label('MACD(12,26,9)'); const { m, sig, hist } = macd(cl); const all = m.concat(sig).filter(x => x != null && isFinite(x)); const lo = Math.min(...all), hi = Math.max(...all); svg.appendChild(line(padL, yI(0, lo, hi), padL + innerW, yI(0, lo, hi), c.grid, 1)); hist.forEach((v, i) => { if (v == null) return; const y0 = yI(0, lo, hi), y1 = yI(v, lo, hi); svg.appendChild(E('rect', { x: xC(i) - bw * 0.3, y: Math.min(y0, y1), width: Math.max(bw * 0.6, 1), height: Math.max(Math.abs(y1 - y0), 0.5), fill: v >= 0 ? c.up : c.dn, opacity: 0.5 })); }); svg.appendChild(poly(m.map((v, i) => isFinite(v) ? [xC(i), yI(v, lo, hi)] : null).filter(Boolean), c.cyan, 1.3)); svg.appendChild(poly(sig.map((v, i) => isFinite(v) ? [xC(i), yI(v, lo, hi)] : null).filter(Boolean), c.amber, 1.3)); }
      else if (pane === 'stoch') { label('Stoch(14,3)'); [20, 80].forEach(l => svg.appendChild(line(padL, yI(l, 0, 100), padL + innerW, yI(l, 0, 100), c.grid, 1, '3,3'))); const { k, d } = stoch(bars); svg.appendChild(poly(k.map((v, i) => v == null ? null : [xC(i), yI(v, 0, 100)]).filter(Boolean), c.cyan, 1.3)); svg.appendChild(poly(d.map((v, i) => v == null ? null : [xC(i), yI(v, 0, 100)]).filter(Boolean), c.amber, 1.3)); }
      else if (pane === 'atr') { label('ATR(14)'); const A = atr(bars); const v = A.filter(x => x != null); const lo = Math.min(...v), hi = Math.max(...v); svg.appendChild(poly(A.map((x, i) => x == null ? null : [xC(i), yI(x, lo, hi)]).filter(Boolean), c.amber, 1.4)); }
      else if (pane === 'obv') { label('OBV'); const O = obv(bars); const lo = Math.min(...O), hi = Math.max(...O); svg.appendChild(poly(O.map((x, i) => [xC(i), yI(x, lo, hi)]), c.cyan, 1.4)); }
    }
    return { svg, legend };
  }

  function parseMarks(s) { if (!s) return []; return s.split(';').map(p => p.trim()).filter(Boolean).map(p => { const seg = p.split(':'); return { k: seg[0], a: parseFloat(seg[1]), b: isNaN(parseFloat(seg[2])) ? seg[2] : parseFloat(seg[2]), c: seg[3] }; }); }

  /* ---------------- option payoff ---------------- */
  const LEGNAME = { lc: 'long call', sc: 'short call', lp: 'long put', sp: 'short put', ls: 'long stock', ss: 'short stock' };
  function payoffChart(opts) {
    const c = COL(); const S0 = 100, r = 0.04, T = 30 / 365, sig = 0.30;
    const legs = (opts.legs || '').split(',').map(s => s.trim()).filter(Boolean).map(s => { const p = s.split(':'); return { t: p[0], K: parseFloat(p[1] || S0), q: parseFloat(p[2] || 1) }; });
    let netCost = 0; const desc = [];
    legs.forEach(l => {
      if (l.t === 'ls') { netCost += S0 * l.q; }
      else if (l.t === 'ss') { netCost -= S0 * l.q; }
      else { const call = l.t[1] === 'c'; const pr = bs(S0, l.K, T, r, sig, call).price; const long = l.t[0] === 'l'; netCost += (long ? 1 : -1) * pr * l.q; desc.push((LEGNAME[l.t]) + ' ' + l.K); }
    });
    function pl(S) { let v = 0; legs.forEach(l => { if (l.t === 'ls') v += (S - S0) * l.q; else if (l.t === 'ss') v += (S0 - S) * l.q; else { const call = l.t[1] === 'c'; const intr = call ? Math.max(S - l.K, 0) : Math.max(l.K - S, 0); const pr = bs(S0, l.K, T, r, sig, call).price; const long = l.t[0] === 'l'; v += (long ? 1 : -1) * (intr - pr) * l.q; } }); return v; }
    const W = 760, H = 300, padL = 46, padR = 16, padT = 14, padB = 28;
    const xs = []; for (let S = 60; S <= 140; S += 0.5) xs.push(S);
    const pls = xs.map(pl);
    const ymin = Math.min(...pls, -2), ymax = Math.max(...pls, 2);
    const iw = W - padL - padR, ih = H - padT - padB;
    const xX = S => padL + (S - 60) / 80 * iw;
    const yY = v => padT + ih - (v - ymin) / (ymax - ymin) * ih;
    const svg = svgRoot(W, H);
    for (let t = 0; t <= 4; t++) { const v = ymin + (ymax - ymin) * t / 4; svg.appendChild(line(padL, yY(v), W - padR, yY(v), c.grid, 1)); svg.appendChild(txt(padL - 4, yY(v) + 3, (v >= 0 ? '+' : '') + v.toFixed(0), c.faint, 9, 'end')); }
    [60, 80, 100, 120, 140].forEach(S => { svg.appendChild(line(xX(S), padT, xX(S), padT + ih, c.grid, 1)); svg.appendChild(txt(xX(S), H - padB + 14, S, c.faint, 9, 'middle')); });
    svg.appendChild(line(padL, yY(0), W - padR, yY(0), c.dim, 1.4));
    svg.appendChild(line(xX(S0), padT, xX(S0), padT + ih, c.amber, 1, '4,3'));
    svg.appendChild(txt(xX(S0), padT + 9, 'spot', c.amber, 8, 'middle'));
    // profit/loss shaded line
    const ptsUp = [], ptsDn = [];
    xs.forEach((S, i) => { (pls[i] >= 0 ? ptsUp : ptsDn); });
    svg.appendChild(poly(xs.map((S, i) => [xX(S), yY(pls[i])]), c.cyan, 2));
    // breakevens
    for (let i = 1; i < xs.length; i++) { if ((pls[i - 1] < 0) !== (pls[i] < 0)) { const S = xs[i]; svg.appendChild(E('circle', { cx: xX(S), cy: yY(0), r: 3, fill: c.ink })); svg.appendChild(txt(xX(S), yY(0) - 6, 'BE ' + S.toFixed(1), c.ink, 8, 'middle')); } }
    const maxP = Math.max(...pls), maxL = Math.min(...pls);
    const legend = [[c.cyan, 'P/L at expiration'], [c.amber, 'spot ' + S0]];
    const cap = `Net ${netCost >= 0 ? 'debit' : 'credit'} ≈ ${Math.abs(netCost).toFixed(2)}/sh · max profit ${maxP > 1e4 ? 'unlimited' : '+' + maxP.toFixed(2)} · max loss ${maxL < -1e4 ? 'large' : maxL.toFixed(2)} (per share; ×100 per contract)`;
    return { svg, legend, autocap: cap };
  }

  /* ---------------- Greek / BS curves ---------------- */
  function curveChart(opts) {
    const c = COL(); const which = (opts.curve || 'call-value'); const K = 100, r = 0.04, T = 30 / 365, sig = 0.30;
    let xs = [], ys = [], y2 = null, xlab = 'underlying price', title2 = '', extra = '';
    const fill = f => { xs = []; ys = []; for (let S = 60; S <= 140; S += 0.5) { xs.push(S); ys.push(f(S)); } };
    if (which === 'call-value') { fill(S => bs(S, K, T, r, sig, true).price); y2 = xs.map(S => Math.max(S - K, 0)); extra = 'intrinsic'; }
    else if (which === 'put-value') { fill(S => bs(S, K, T, r, sig, false).price); y2 = xs.map(S => Math.max(K - S, 0)); extra = 'intrinsic'; }
    else if (which === 'payoff-long-call') { fill(S => Math.max(S - K, 0) - bs(100, K, T, r, sig, true).price); }
    else if (which === 'payoff-long-put') { fill(S => Math.max(K - S, 0) - bs(100, K, T, r, sig, false).price); }
    else if (which === 'delta') { fill(S => bs(S, K, T, r, sig, true).delta); }
    else if (which === 'gamma') { fill(S => bs(S, K, T, r, sig, true).gamma); }
    else if (which === 'vega') { fill(S => bs(S, K, T, r, sig, true).vega); }
    else if (which === 'rho') { fill(S => bs(S, K, T, r, sig, true).rho); }
    else if (which === 'theta') { fill(S => bs(S, K, T, r, sig, true).theta); }
    else if (which === 'time-decay') { xlab = 'days to expiration'; xs = []; ys = []; for (let d = 90; d >= 0; d -= 1) { xs.push(d); ys.push(bs(100, K, d / 365, r, sig, true).price); } }
    else if (which === 'iv-smile') { xlab = 'strike'; xs = []; ys = []; for (let K2 = 70; K2 <= 130; K2 += 1) { xs.push(K2); ys.push(28 + 0.006 * Math.pow(K2 - 100, 2) - 0.04 * (K2 - 100)); } title2 = 'implied vol %'; }
    else { fill(S => bs(S, K, T, r, sig, true).price); }
    const W = 760, H = 280, padL = 50, padR = 16, padT = 14, padB = 28;
    const iw = W - padL - padR, ih = H - padT - padB;
    const xmin = xs[0], xmax = xs[xs.length - 1];
    let all = ys.concat(y2 || []); const ymin = Math.min(...all), ymax = Math.max(...all);
    const xX = v => padL + (v - xmin) / (xmax - xmin) * iw;
    const yY = v => padT + ih - (v - ymin) / ((ymax - ymin) || 1) * ih;
    const svg = svgRoot(W, H);
    for (let t = 0; t <= 4; t++) { const v = ymin + (ymax - ymin) * t / 4; svg.appendChild(line(padL, yY(v), W - padR, yY(v), c.grid, 1)); svg.appendChild(txt(padL - 4, yY(v) + 3, v.toFixed(Math.abs(ymax) < 2 ? 2 : 0), c.faint, 9, 'end')); }
    for (let t = 0; t <= 4; t++) { const v = xmin + (xmax - xmin) * t / 4; svg.appendChild(line(xX(v), padT, xX(v), padT + ih, c.grid, 1)); svg.appendChild(txt(xX(v), H - padB + 14, v.toFixed(0), c.faint, 9, 'middle')); }
    if (ymin < 0 && ymax > 0) svg.appendChild(line(padL, yY(0), W - padR, yY(0), c.dim, 1.2));
    if (which.indexOf('value') >= 0 || which.indexOf('payoff') >= 0 || which === 'delta' || which === 'gamma') { svg.appendChild(line(xX(100), padT, xX(100), padT + ih, c.amber, 1, '4,3')); svg.appendChild(txt(xX(100), padT + 9, 'K=100', c.amber, 8, 'middle')); }
    if (y2) svg.appendChild(poly(xs.map((x, i) => [xX(x), yY(y2[i])]), c.dim, 1.3, '4,3'));
    svg.appendChild(poly(xs.map((x, i) => [xX(x), yY(ys[i])]), c.cyan, 2));
    svg.appendChild(txt(padL, padT + 9, xlab + (title2 ? '' : ''), c.faint, 8));
    const legend = [[c.cyan, which.replace(/-/g, ' ')]]; if (extra) legend.push([c.dim, extra]);
    return { svg, legend };
  }

  /* ---------------- dispatcher ---------------- */
  function renderOne(div) {
    try {
      const type = div.getAttribute('data-type') || 'price';
      let res, title = div.getAttribute('data-title') || '', cap = div.getAttribute('data-cap') || '';
      if (type === 'payoff') res = payoffChart({ legs: div.getAttribute('data-legs') });
      else if (type === 'curve') res = curveChart({ curve: div.getAttribute('data-curve') });
      else res = priceChart({ scenario: div.getAttribute('data-scenario'), overlays: div.getAttribute('data-overlays'), pane: div.getAttribute('data-pane'), marks: div.getAttribute('data-marks') });
      if (res.autocap && !cap) cap = res.autocap;
      div.textContent = '';
      const head = document.createElement('div'); head.className = 'chart-head';
      const ct = document.createElement('div'); ct.className = 'ct'; ct.textContent = title || '';
      head.appendChild(ct);
      const leg = document.createElement('div'); leg.className = 'cleg';
      (res.legend || []).forEach(([col, lbl]) => { const i = document.createElement('i'); const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = col; i.appendChild(sw); i.appendChild(document.createTextNode(lbl)); leg.appendChild(i); });
      head.appendChild(leg);
      div.appendChild(head);
      div.appendChild(res.svg);
      if (cap) { const cc = document.createElement('div'); cc.className = 'chart-cap'; cc.textContent = cap; div.appendChild(cc); }
      div.setAttribute('data-rendered', '1');
    } catch (e) {
      div.innerHTML = '<div class="chart-bad">chart error: ' + (e && e.message) + '</div>';
    }
  }
  window.renderCharts = function (root) {
    (root || document).querySelectorAll('.chart:not([data-rendered])').forEach(renderOne);
  };
  // patch go() so charts render on every lesson navigation, and render the current view now
  if (typeof window.go === 'function') { const _g = window.go; window.go = function (i) { _g(i); window.renderCharts(document.getElementById('content')); }; }
  window.renderCharts(document.getElementById('content'));
})();
