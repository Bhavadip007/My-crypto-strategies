import { zlema } from "./indicators.js";

let isReady = false;
let lastRawSignal = null;

export function resetSignalState() {
  isReady = false;
  lastRawSignal = null;
}

export function getSignal(closes) {
  const fast = zlema(closes, 14);
  const slow = zlema(closes, 26);

  const macd = fast.map((v, i) => v - slow[i]);

  const signalLine = zlema(macd, 9);

  const hist = macd.map((v, i) => v - signalLine[i]);

  const prev = hist[hist.length - 2];
  const curr = hist[hist.length - 1];

  if (prev == null || curr == null) {
    return "HOLD";
  }

  let raw = "HOLD";

  if (prev < 0 && curr > 0) {
    raw = "BUY";
  } else if (prev > 0 && curr < 0) {
    raw = "SELL";
  }

  // First check after bot start: remember current state, do not trade
  if (!isReady) {
    isReady = true;
    lastRawSignal = raw;
    return "HOLD";
  }

  // Order only when a NEW signal appears, not while it stays the same
  if (raw !== "HOLD" && raw !== lastRawSignal) {
    lastRawSignal = raw;
    return raw;
  }

  lastRawSignal = raw;
  return "HOLD";
}
