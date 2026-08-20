export const signalState = {
  signal: "HOLD",
  histPrev: null,
  histCurr: null,
  candleTime: null,
  symbol: null,
  timeframe: null,
  position: null,
  waitingFor: "candle close",
  updatedAt: null,
};

export function setSignalState(patch) {
  Object.assign(signalState, patch, {
    updatedAt: new Date().toISOString(),
  });
}
