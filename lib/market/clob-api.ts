import { createHmac } from "crypto";

export interface ClobOrderParams {
  clob_host: string;
  api_key: string;
  api_secret: string;
  api_passphrase: string;
  wallet_address: string;
  token_id: string;
  outcome: string;
  amount: number;
  avg_price: number;
  CLOB_ORDER_TYPE: string;
  CLOB_FEE_RATE_BPS: string;
  CLOB_ORDER_PATH: string;
  nonce: string;
}

export async function submitClobOrder(params: ClobOrderParams) {
  const {
    clob_host,
    api_key,
    api_secret,
    api_passphrase,
    wallet_address,
    token_id,
    amount,
    avg_price,
    CLOB_ORDER_TYPE,
    CLOB_FEE_RATE_BPS,
    CLOB_ORDER_PATH,
    nonce
  } = params;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const orderBody = {
    orderType: CLOB_ORDER_TYPE,
    tokenID: token_id,
    price: avg_price.toFixed(4),
    side: "BUY",
    size: amount.toFixed(2),
    feeRateBps: CLOB_FEE_RATE_BPS,
    nonce,
    expiration: "0",
    makerAddress: wallet_address,
  };
  const bodyStr = JSON.stringify(orderBody);
  const message = timestamp + "POST" + CLOB_ORDER_PATH + bodyStr;
  const secretBytes = Buffer.from(api_secret, "base64");
  const signature = createHmac("sha256", secretBytes)
    .update(message)
    .digest("base64");

  const clobRes = await fetch(`${clob_host}${CLOB_ORDER_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "POLY_ADDRESS": wallet_address,
      "POLY-API-KEY": api_key,
      "POLY-SIGNATURE": signature,
      "POLY-TIMESTAMP": timestamp,
      "POLY-PASSPHRASE": api_passphrase,
    },
    body: bodyStr,
    signal: AbortSignal.timeout(12_000),
  });

  const clobRaw = await clobRes.text();
  let clobData: Record<string, unknown> = {};
  try {
    clobData = JSON.parse(clobRaw) as Record<string, unknown>;
  } catch {
    clobData = { raw: clobRaw };
  }

  return { clobRes, clobData };
}

export function getClobOrderId(clobData: Record<string, unknown>): string | null {
  const value = clobData.orderID ?? clobData.id;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
