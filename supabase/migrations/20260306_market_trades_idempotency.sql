alter table public.market_trades
  add column if not exists idempotency_key uuid unique;
