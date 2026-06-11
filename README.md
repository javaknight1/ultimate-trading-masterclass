# The Ultimate Trading & Technical Analysis Masterclass

A self-contained trading course — single HTML file, no server required. Trading-terminal theme, sidebar navigation, progress tracking, a **Try It** exercise every lesson, and a **built-in SVG chart engine** (no external libraries) that draws candlestick charts, indicators, option payoff diagrams, and Greek curves inline.

**16 parts · 122 lessons · 127 charts · from a brokerage quote to options strategies — example-driven, with the math.**

- **00 · Markets & Brokerage** — order types, market structure, the bid/ask, hidden costs
- **01 · Reading a Stock** — every number on a quote (cap, float, P/E, EPS, beta, EV/EBITDA, short interest…), calculated
- **02 · Financial Statements** · **03 · Valuation** — income/balance/cash-flow; multiples & DCF; what a company is worth
- **04 · TA vs FA** — the two philosophies, EMH, and how pros blend them
- **05 · Charting Foundations** · **06 · Patterns** — candles, support/resistance, trendlines; candlestick & chart patterns with honest reliability
- **07 · Trend** · **08 · Oscillators** · **09 · Volatility & Volume** — SMA/EMA, MACD, ADX; RSI, stochastics; Bollinger, ATR, VWAP, OBV, Fibonacci — each shown on a chart
- **10 · Options Basics** · **11 · The Greeks** — calls/puts, the chain; delta/gamma/theta/vega/rho with Black–Scholes curves
- **12 · Options Strategies** — covered calls, spreads, straddles, condors, butterflies, calendars — each with a payoff diagram
- **13 · Risk & Psychology** · **14 · Backtesting & Systems** · **15 · Macro & Other Markets**

**Educational only — not financial advice.** All charts use synthetic, illustrative data (fictional tickers); option prices are model estimates.

## The chart engine

`chart-engine.js` renders `<div class="chart" ...>` elements into inline SVG: 24 candlestick scenarios with auto-annotations and overlays (SMA/EMA/Bollinger/VWAP/PSAR/Fib) + indicator panes (RSI/MACD/Stochastic/ATR/OBV); option **payoff diagrams** (legs priced via a built-in Black–Scholes); and **Greek curves**. Writers reference charts with simple flat specs (e.g. `data-scenario='head-shoulders' data-overlays='sma50' data-pane='rsi'`).

## Build

Lesson content lives in `data/<part>.json`. The app is assembled from `index.template.html` (which holds the `/*__LESSONS__*/[]` and `/*__CHART_ENGINE__*/` markers) — lessons + the chart engine injected — into `index.html`:

```bash
node build.js
```

Idempotent and re-runnable; no runtime dependencies.

## Hosting

Static — deploys to Cloudflare via the included `wrangler.jsonc` (Workers Static Assets, directory `.`).
