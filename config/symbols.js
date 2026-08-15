export const ALLOWED_SYMBOLS = [
  "BTCUSD",
  "ETHUSD",
  "SOLUSD",
  "XRPUSD",
  "DOGEUSD",
  "ZECUSD",
  "AAVEUSD",
  "HYPEUSD",
  "PAXGUSD",
  "PLTRBUSD",
  "VELVETUSD",
  "SKYAIUSD",
  "RIVERUSD",
  "MONUSD",
  "LABUSD",
  "KAITOUSD",
  "EVAAUSD",
  "BEATUSD",
  "ACTUSD",
];

export function isAllowedSymbol(symbol) {
  return ALLOWED_SYMBOLS.includes(symbol);
}
