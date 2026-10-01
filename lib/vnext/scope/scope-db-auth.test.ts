import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260924120000_client_scope_owner_only.sql", "utf8");

describe("client scope database authorization", () => {
  it("removes the authenticated write policy so PostgREST cannot update scope", () => {
    expect(sql).toContain("drop policy if exists project_client_capabilities_write");
    expect(sql).not.toContain("user_can_manage_org_or_project");
    expect(sql).not.toContain("user_can_manage_project");
  });

  it("rejects a direct RPC from any role other than service_role", () => {
    expect(sql).toContain("if auth.role() is distinct from 'service_role'");
    expect(sql).toContain("revoke all on function public.replace_project_client_scope(uuid, text[], uuid) from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.replace_project_client_scope(uuid, text[], uuid) to service_role");
  });
});
