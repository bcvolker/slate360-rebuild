import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type TradeMutationValue = string | number | boolean | null;

export type MarketTradeMutation = Record<string, TradeMutationValue>;

const OPTIONAL_MARKET_TRADE_COLUMNS = [
  "idempotency_key",
  "token_id",
  "clob_order_id",
  "take_profit_pct",
  "stop_loss_pct",
  "entry_mode",
] as const;

type OptionalMarketTradeColumn = (typeof OPTIONAL_MARKET_TRADE_COLUMNS)[number];

type MutationResult<TData> = {
  data: TData | null;
  error: PostgrestError | null;
  strippedColumns: OptionalMarketTradeColumn[];
};

function stripColumns(
  rowOrRows: MarketTradeMutation | MarketTradeMutation[],
  columns: ReadonlySet<OptionalMarketTradeColumn>,
) {
  const stripRow = (row: MarketTradeMutation): MarketTradeMutation => {
    const nextRow = { ...row };
    for (const column of columns) delete nextRow[column];
    return nextRow;
  };

  return Array.isArray(rowOrRows) ? rowOrRows.map(stripRow) : stripRow(rowOrRows);
}

function stripRowColumns(
  row: MarketTradeMutation,
  columns: ReadonlySet<OptionalMarketTradeColumn>,
): MarketTradeMutation {
  const nextRow = { ...row };
  for (const column of columns) delete nextRow[column];
  return nextRow;
}

export function getUnsupportedMarketTradeColumn(
  error: PostgrestError | null,
): OptionalMarketTradeColumn | null {
  const message = error?.message;
  if (!message) return null;

  for (const column of OPTIONAL_MARKET_TRADE_COLUMNS) {
    if (message.includes(`'${column}'`)) {
      return column;
    }
  }

  return null;
}

async function insertOnce<TData>(
  client: SupabaseClient,
  rows: MarketTradeMutation | MarketTradeMutation[],
  options?: { select?: string; single?: boolean },
): Promise<{ data: TData | null; error: PostgrestError | null }> {
  if (options?.single) {
    const response = options.select
      ? await client.from("market_trades").insert(rows).select(options.select).single()
      : await client.from("market_trades").insert(rows).select().single();

    return { data: (response.data as TData | null) ?? null, error: response.error };
  }

  if (options?.select) {
    const response = await client.from("market_trades").insert(rows).select(options.select);
    return { data: (response.data as TData | null) ?? null, error: response.error };
  }

  const response = await client.from("market_trades").insert(rows);
  return { data: (response.data as TData | null) ?? null, error: response.error };
}

async function updateOnce<TData>(
  client: SupabaseClient,
  tradeId: string,
  patch: MarketTradeMutation,
  options?: { select?: string; single?: boolean },
): Promise<{ data: TData | null; error: PostgrestError | null }> {
  if (options?.single) {
    const response = options.select
      ? await client.from("market_trades").update(patch).eq("id", tradeId).select(options.select).single()
      : await client.from("market_trades").update(patch).eq("id", tradeId).select().single();

    return { data: (response.data as TData | null) ?? null, error: response.error };
  }

  if (options?.select) {
    const response = await client.from("market_trades").update(patch).eq("id", tradeId).select(options.select);
    return { data: (response.data as TData | null) ?? null, error: response.error };
  }

  const response = await client.from("market_trades").update(patch).eq("id", tradeId);
  return { data: (response.data as TData | null) ?? null, error: response.error };
}

export async function insertMarketTradesWithFallback<TData = unknown>(
  client: SupabaseClient,
  rows: MarketTradeMutation | MarketTradeMutation[],
  options?: { select?: string; single?: boolean },
): Promise<MutationResult<TData>> {
  const strippedColumns = new Set<OptionalMarketTradeColumn>();

  while (true) {
    const response = await insertOnce<TData>(client, stripColumns(rows, strippedColumns), options);
    const unsupportedColumn = getUnsupportedMarketTradeColumn(response.error);

    if (!unsupportedColumn || strippedColumns.has(unsupportedColumn)) {
      return {
        data: response.data,
        error: response.error,
        strippedColumns: [...strippedColumns],
      };
    }

    strippedColumns.add(unsupportedColumn);
  }
}

export async function updateMarketTradeWithFallback<TData = unknown>(
  client: SupabaseClient,
  tradeId: string,
  patch: MarketTradeMutation,
  options?: { select?: string; single?: boolean },
): Promise<MutationResult<TData>> {
  const strippedColumns = new Set<OptionalMarketTradeColumn>();

  while (true) {
    const response = await updateOnce<TData>(client, tradeId, stripRowColumns(patch, strippedColumns), options);
    const unsupportedColumn = getUnsupportedMarketTradeColumn(response.error);

    if (!unsupportedColumn || strippedColumns.has(unsupportedColumn)) {
      return {
        data: response.data,
        error: response.error,
        strippedColumns: [...strippedColumns],
      };
    }

    strippedColumns.add(unsupportedColumn);
  }
}