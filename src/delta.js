import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "https://api.india.delta.exchange";

function sign(method, path, timestamp, body = "") {
  return crypto
    .createHmac("sha256", process.env.DELTA_API_SECRET)
    .update(method + timestamp + path + body)
    .digest("hex");
}

export async function placeMarketOrder(side, size, symbol) {
  const path = "/v2/orders";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const body = JSON.stringify({
    product_symbol: symbol,
    size,
    side: side.toLowerCase(),
    order_type: "market_order"
  });

  const signature = sign(
    "POST",
    path,
    timestamp,
    body
  );

  const headers = {
    "api-key": process.env.DELTA_API_KEY,
    signature,
    timestamp,
    "Content-Type": "application/json"
  };

  const res = await axios.post(
    `${BASE_URL}${path}`,
    JSON.parse(body),
    { headers }
  );
  console.dir(res.data, { depth: null });
  return res.data;
}

export async function getOpenPosition(symbol) {
  const underlying = String(symbol || "").replace(/USDT?$/i, "");
  const query = `?underlying_asset_symbol=${underlying}`;
  const path = "/v2/positions";

  const timestamp = Math.floor(
    Date.now() / 1000
  ).toString();

  const signature = sign(
    "GET",
    path + query,
    timestamp
  );

  const headers = {
    "api-key": process.env.DELTA_API_KEY,
    signature,
    timestamp
  };

  const res = await axios.get(
    `${BASE_URL}${path}${query}`,
    { headers }
  );

  return res.data;
}
