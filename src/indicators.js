// TradingView ta.ema: SMA of the first `period` valid values, then EMA.
export function ema(values, period) {
  const k = 2 / (period + 1);
  const out = new Array(values.length).fill(NaN);
  let run = 0;
  let seedIndex = -1;

  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) {
      run = 0;
      continue;
    }

    run += 1;

    if (run >= period) {
      seedIndex = i;
      break;
    }
  }

  if (seedIndex === -1) {
    return out;
  }

  let sum = 0;
  for (let i = seedIndex - period + 1; i <= seedIndex; i++) {
    sum += values[i];
  }

  out[seedIndex] = sum / period;

  for (let i = seedIndex + 1; i < values.length; i++) {
    if (!Number.isFinite(values[i]) || !Number.isFinite(out[i - 1])) {
      out[i] = NaN;
      continue;
    }

    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }

  return out;
}

// Pine Zlema_Func:
// zxLag = even length ? length / 2 : (length - 1) / 2  == floor(length / 2)
// zxEMAData = src + src - src[zxLag]
// ZLEMA = ta.ema(zxEMAData, length)
export function zlema(values, period) {
  const lag = Math.floor(period / 2);

  const adjusted = values.map((value, i) => {
    if (i < lag || !Number.isFinite(value) || !Number.isFinite(values[i - lag])) {
      return NaN;
    }

    return 2 * value - values[i - lag];
  });

  return ema(adjusted, period);
}
