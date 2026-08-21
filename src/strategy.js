import { zlema } from "./indicators.js";

const FAST = 14;
const SLOW = 26;
const TRIGGER = 9;

export function computeMacd(closes) {
  const ma12 = zlema(closes, FAST);
  const ma26 = zlema(closes, SLOW);
  const macd = ma12.map((value, i) => value - ma26[i]);
  const signalLine = zlema(macd, TRIGGER);
  const hist = macd.map((value, i) => value - signalLine[i]);

  return { ma12, ma26, macd, signalLine, hist };
}

// Matches Pine:
// buySignal  = ta.crossover(hist, 0)
// sellSignal = ta.crossunder(hist, 0)
// Pass closes including the forming candle to match live up/down arrows.
export function getSignal(closes) {
  const { hist } = computeMacd(closes);
  const prev = hist[hist.length - 2];
  const curr = hist[hist.length - 1];

  if (!Number.isFinite(prev) || !Number.isFinite(curr)) {
    return { signal: "HOLD", histPrev: prev, histCurr: curr };
  }

  if (prev <= 0 && curr > 0) {
    return { signal: "BUY", histPrev: prev, histCurr: curr };
  }

  if (prev >= 0 && curr < 0) {
    return { signal: "SELL", histPrev: prev, histCurr: curr };
  }

  return { signal: "HOLD", histPrev: prev, histCurr: curr };
}
