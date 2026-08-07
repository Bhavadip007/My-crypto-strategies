export function ema(values, period) {
  const k = 2 / (period + 1);
  let emaArr = [values[0]];

  for (let i = 1; i < values.length; i++) {
    emaArr.push(values[i] * k + emaArr[i - 1] * (1 - k));
  }

  return emaArr;
}

export function zlema(values, period) {
  const lag = Math.floor((period - 1) / 2);

  const adjusted = values.map((v, i) => {
    if (i < lag) return v;
    return v + (v - values[i - lag]);
  });

  return ema(adjusted, period);
}