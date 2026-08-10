import { zlema } from "./indicators.js";

export function getSignal(closes) {
  const fast = zlema(closes, 14);
  const slow = zlema(closes, 26);

  const macd = fast.map((v, i) => v - slow[i]);

  const signal = zlema(macd, 9);

  const hist = macd.map((v, i) => v - signal[i]);

  const last = hist.length - 1;

  const prev = hist[last - 1];
  const curr = hist[last];

  if (prev <= 0 && curr > 0) {
  return "BUY";
}

if (prev >= 0 && curr < 0) {
  return "SELL";
}

  return "HOLD";
}