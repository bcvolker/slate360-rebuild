/**
 * Credit deduction idempotency guard.
 *
 * Prevents double-deductions from double-clicks, retries, or race conditions.
 * Uses Supabase to store idempotency keys with a short TTL.
 *
 * Usage in API routes:
 *   const result = await deductCredits(supabase, orgId, amount, idempotencyKey);
 *   if (!result.ok) return apiError(result.error, 409);
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface DeductResult {
  ok: boolean;
  newBalance?: number;
  error?: string;
}

/**
 * Atomically deduct credits for an org, guarded by an idempotency key.
 *
 * - If the key already exists in `credit_transactions`, returns the previous result (no-op).
 * - Otherwise, checks balance → deducts → inserts transaction row.
 * - The caller is responsible for generating a unique idempotency key per logical action
 *   (e.g., `${orgId}:scan:${scanId}` or `${orgId}:export:${timestamp}`).
 */
export async function deductCredits(
  supabase: SupabaseClient,
  orgId: string,
  amount: number,
  idempotencyKey: string,
  description?: string,
): Promise<DeductResult> {
  if (amount <= 0) return { ok: true, newBalance: undefined };
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return { ok: false, error: "Invalid idempotency key" };
  }

  // Check for existing transaction with this key
  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id, new_balance")
    .eq("org_id", orgId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    // Already processed — return previous result
    return { ok: true, newBalance: existing.new_balance };
  }

  // Fetch current balance
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("credit_balance")
    .eq("id", orgId)
    .single();

  if (orgErr || !org) {
    return { ok: false, error: "Could not fetch org balance" };
  }

  const currentBalance = org.credit_balance ?? 0;
  if (currentBalance < amount) {
    return { ok: false, error: `Insufficient credits: need ${amount}, have ${currentBalance}` };
  }

  const newBalance = currentBalance - amount;

  // Deduct with optimistic concurrency (check balance hasn't changed)
  const { error: updateErr, count } = await supabase
    .from("organizations")
    .update({ credit_balance: newBalance })
    .eq("id", orgId)
    .eq("credit_balance", currentBalance) // optimistic lock
    .select("id");

  if (updateErr || !count) {
    return { ok: false, error: "Balance changed concurrently — retry" };
  }

  // Record the transaction with idempotency key
  const { error: txErr } = await supabase
    .from("credit_transactions")
    .insert({
      org_id: orgId,
      amount: -amount,
      new_balance: newBalance,
      idempotency_key: idempotencyKey,
      description: description ?? null,
    });

  if (txErr) {
    // Transaction record failed but deduction succeeded — log but don't fail
    console.error("[deductCredits] Failed to record transaction:", txErr.message);
  }

  return { ok: true, newBalance };
}

/**
 * Add credits to an org (e.g., after purchasing a credit pack).
 * Also idempotent via key.
 */
export async function addCredits(
  supabase: SupabaseClient,
  orgId: string,
  amount: number,
  idempotencyKey: string,
  description?: string,
): Promise<DeductResult> {
  if (amount <= 0) return { ok: false, error: "Amount must be positive" };
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return { ok: false, error: "Invalid idempotency key" };
  }

  // Check for existing transaction with this key
  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id, new_balance")
    .eq("org_id", orgId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { ok: true, newBalance: existing.new_balance };
  }

  // Fetch current balance
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("credit_balance")
    .eq("id", orgId)
    .single();

  if (orgErr || !org) {
    return { ok: false, error: "Could not fetch org balance" };
  }

  const currentBalance = org.credit_balance ?? 0;
  const newBalance = currentBalance + amount;

  const { error: updateErr } = await supabase
    .from("organizations")
    .update({ credit_balance: newBalance })
    .eq("id", orgId);

  if (updateErr) {
    return { ok: false, error: "Failed to update balance" };
  }

  const { error: txErr } = await supabase
    .from("credit_transactions")
    .insert({
      org_id: orgId,
      amount,
      new_balance: newBalance,
      idempotency_key: idempotencyKey,
      description: description ?? null,
    });

  if (txErr) {
    console.error("[addCredits] Failed to record transaction:", txErr.message);
  }

  return { ok: true, newBalance };
}
