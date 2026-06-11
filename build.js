#!/usr/bin/env node
/*
 * build.js — assembles data/<part>.json + chart-engine.js into index.html.
 * Reads the shell from index.template.html (markers: /​*__LESSONS__*​/[] and /​*__CHART_ENGINE__*​/).
 * Idempotent / re-runnable.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const TPL = path.join(ROOT, 'index.template.html');
const HTML = path.join(ROOT, 'index.html');
const DATA = path.join(ROOT, 'data');
const ENGINE = path.join(ROOT, 'chart-engine.js');

const ORDER = [
  ['p0',  '00 · Markets & Brokerage', 0],
  ['p1',  '01 · Reading a Stock', 1],
  ['p2',  '02 · Financial Statements', 2],
  ['p3',  '03 · Valuation', 3],
  ['p4',  '04 · TA vs FA', 4],
  ['p5',  '05 · Charting Foundations', 5],
  ['p6',  '06 · Patterns', 6],
  ['p7',  '07 · Trend Indicators', 7],
  ['p8',  '08 · Oscillators', 8],
  ['p9',  '09 · Volatility & Volume', 9],
  ['p10', '10 · Options Basics', 10],
  ['p11', '11 · The Greeks', 11],
  ['p12', '12 · Options Strategies', 12],
  ['p13', '13 · Risk & Psychology', 13],
  ['p14', '14 · Backtesting & Systems', 14],
  ['p15', '15 · Macro & Other Markets', 15],
  ['p16', '16 · Platforms & Software', 16],
  ['p17', '17 · APIs & Automation', 17],
];

const cover = {
  id: 'cover', part: 'START', nav: 'Welcome', cover: true, html: `
<div class="cover">
<span class="lesson-kicker">market open · quote → options chain</span>
<h2 class="lesson-title">read the<br>tape.</h2>
<p class="lede">A rigorous, example-driven path from every number on a brokerage quote, to valuing a company, to all of technical analysis with real charts you analyze, to options, the Greeks, and the strategy playbook. Built-in candlestick charts, indicators, and payoff diagrams illustrate every concept.</p>
<div class="grid2">
  <div class="card"><div class="ct">🔢 Every number, explained</div><p>Market cap, float, P/E, EPS, beta, EV/EBITDA, short interest — what each means and how it is calculated, plus how to value a company with multiples and DCF.</p></div>
  <div class="card"><div class="ct">📈 Charts you actually analyze</div><p>Live SVG candlestick charts with SMA/EMA, RSI, MACD, Bollinger and more — every pattern and indicator shown on a chart, with an honest take on how reliable it is.</p></div>
  <div class="card"><div class="ct">Δ Options &amp; the Greeks</div><p>Calls, puts, the chain, and the Greeks (delta, gamma, theta, vega, rho) with Black–Scholes curves — then the full strategy toolbox, each with a payoff diagram.</p></div>
  <div class="card"><div class="ct">🛡 Risk first</div><p>Position sizing, expectancy, backtesting, journaling, and the psychology — the parts that actually keep you in the game.</p></div>
</div>
<h3>How this course is structured</h3>
<p>Eighteen parts, building in order: the stock and its numbers → fundamentals &amp; valuation → technical analysis → options, Greeks &amp; strategies → risk, systems, and the macro picture → the platforms, software &amp; APIs to put it all into practice. Mark lessons complete as you go; your progress bar lives in the sidebar.</p>
<div class="box danger"><div class="bt">Educational only — not financial advice.</div> Nothing here is a recommendation to buy or sell anything. All charts use <em>synthetic, illustrative</em> data (fictional tickers), and option prices are model estimates. Markets involve real risk of loss; do your own research.</div>
</div>
` };

function loadPart(id) {
  const chunks = fs.readdirSync(DATA)
    .filter(f => new RegExp('^' + id + '\\.c(\\d+)\\.json$').test(f))
    .sort((a, b) => +a.match(/\.c(\d+)\./)[1] - +b.match(/\.c(\d+)\./)[1]);
  const files = chunks.length ? chunks : [id + '.json'];
  return files.flatMap(f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
}

function main() {
  const all = [cover];
  let total = 0;
  for (const [id, label, n] of ORDER) {
    let arr;
    try { arr = loadPart(id); }
    catch (e) { console.error('LOAD ERROR for ' + id + ': ' + e.message); process.exit(1); }
    arr.forEach((les, i) => {
      les.part = label;
      les.num = n + '.' + (i + 1);
      les.kicker = 'Part ' + String(n).padStart(2, '0') + ' · Lesson ' + (i + 1);
      all.push(les);
    });
    total += arr.length;
    console.log('  ' + label.padEnd(30) + arr.length + ' lessons');
  }
  let html = fs.readFileSync(TPL, 'utf8');
  const MARK = '/*__LESSONS__*/[]';
  if (!html.includes(MARK)) { console.error('lesson marker not found'); process.exit(1); }
  let json = JSON.stringify(all).replace(/<\/script/gi, '<\\/script');
  html = html.replace(MARK, () => json);
  const engine = fs.readFileSync(ENGINE, 'utf8');
  if (!html.includes('/*__CHART_ENGINE__*/')) { console.error('chart-engine marker not found'); process.exit(1); }
  html = html.replace('/*__CHART_ENGINE__*/', () => engine);
  fs.writeFileSync(HTML, html);
  console.log('\nInjected ' + total + ' lessons (+cover) + chart engine → index.html (' + Math.round(html.length / 1024) + ' KB)');
}
main();
