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

export async function placeMarketOrder(side, size) {
  const path = "/v2/orders";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const body = JSON.stringify({
    product_symbol: "ETHUSD",
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

export async function placeStopLossOrder(
  side,
  stopPrice,
  size
) {
  const path = "/v2/orders";

  const timestamp = Math.floor(
    Date.now() / 1000
  ).toString();

  const body = JSON.stringify({
    product_symbol: "ETHUSD",
    size,
    side,
    order_type: "stop_market_order",
    stop_price: stopPrice,
    reduce_only: true
  });

  const signature = sign(
    "POST",
    path,
    timestamp,
    body
  );

  const headers = {
    "api-key":
      process.env.DELTA_API_KEY,
    signature,
    timestamp,
    "Content-Type":
      "application/json"
  };

  const res = await axios.post(
    `${BASE_URL}${path}`,
    JSON.parse(body),
    { headers }
  );

  return res.data;
}

export async function getOpenPosition() {
  const path = "/v2/positions";

  const timestamp = Math.floor(
    Date.now() / 1000
  ).toString();

  const signature = sign(
    "GET",
    path,
    timestamp
  );

  const headers = {
    "api-key": process.env.DELTA_API_KEY,
    signature,
    timestamp
  };

  const res = await axios.get(
    `${BASE_URL}${path}`,
    { headers }
  );

  return res.data;
}