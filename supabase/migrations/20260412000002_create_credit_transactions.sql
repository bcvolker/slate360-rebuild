-- Credit transaction ledger for idempotent credit add/deduct operations.

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount          integer NOT NULL,          -- positive = add, negative = deduct
  new_balance     integer NOT NULL,          -- balance after this transaction
  idempotency_key text UNIQUE NOT NULL,      -- prevents duplicate processing
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_transactions_org_id ON public.credit_transactions(org_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at);

-- RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Org members can read their own credit transactions
CREATE POLICY "Org members can read own credit transactions"
  ON public.credit_transactions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- Only service role writes credit transactions
CREATE POLICY "Service role manages credit transactions"
  ON public.credit_transactions FOR ALL
  USING (false);
