-- RPC: atomically add purchased credits to an org's addon balance.
-- Called by the Stripe webhook when a credit pack purchase completes.

CREATE OR REPLACE FUNCTION public.add_purchased_credits(
  p_org_id uuid,
  p_amount integer
)
RETURNS void AS $$
BEGIN
  -- Atomic increment on org_app_subscriptions.credit_addon_balance
  INSERT INTO public.org_app_subscriptions (org_id, credit_addon_balance)
  VALUES (p_org_id, p_amount)
  ON CONFLICT (org_id)
  DO UPDATE SET credit_addon_balance = public.org_app_subscriptions.credit_addon_balance + EXCLUDED.credit_addon_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
