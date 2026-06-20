# Spec: Enterprise Console (desktop-only)

Status: **spec / planning** (no app code). Org admin surface for seats, permissions, oversight, and
the org token pool. **Desktop only** — never on the phone. Builds on existing org RBAC + seat
scaffolding. See `PLATFORM_PRODUCT_PLAN.md` §7.

## 1. What exists
- Org RBAC: `organization_members.role` (owner/admin/member/viewer).
- Per-member app seats: `org_member_app_access`, seat limits + `increment_app_seat`,
  `org_feature_flags.*_seat_limit/_seats_used`.
- Modular subscriptions (`org_app_subscriptions`), Stripe SKUs incl. `enterprise`.
- Per-project ACL: `project_members.role_id`, `folder_permissions` (see SlateDrop spec).
- Usage data: `site_walk_usage_events`, `digital_twin_usage_events`, `credit_transactions`,
  `project_notifications`, activity logs.

## 2. Console sections (desktop)
- **Members** — invite/deactivate, set org role, see status; bulk actions.
- **Seats & licensing** — assign/revoke per-app seats per member; seats used/available per app;
  upgrade/add seats; enterprise = custom seat count (quote, not self-serve checkout).
- **Permissions matrix** — per member: org role + per-project role + per-app access + folder
  permissions; an at-a-glance grid with drill-down. Reuses `folder_permissions` + `project_members`.
- **Oversight / audit dashboards** — the differentiator. Built from existing usage tables:
  - Activity: who captured what (walks, twins), when, which project.
  - Token consumption by member / project / app; trend + outliers.
  - Outputs: deliverables/reports created, shares sent, share views.
  - Exportable audit log (CSV/PDF).
- **Org token pool** — shared balance, per-member / per-project **caps + alerts**, top-up (at cost),
  auto-refill. Links to Token UX wallet.
- **Billing** — subscriptions, SKUs, invoices, seat counts, enterprise quote/contract status.
- **Branding** — org logo/colors that flow into projects, reports, share viewers.

## 3. Access & gating
- Visible to **owner/admin** only; server-gated (like Thermal's `notFound()` pattern).
- Desktop-only route group; not in any mobile nav.
- All mutations RLS- + role-guarded; service-role for seat counters (`increment_app_seat`).

## 4. Oversight data model (mostly reads; minimal new)
- Reads roll up `*_usage_events` (already append-only) via monthly views (e.g.
  `site_walk_usage_monthly`) extended with per-member/per-project grouping.
- Add an `audit_log` view (union of usage + notifications + activity) for export; no heavy new
  write path — the events already exist.
- Org token caps: a small `org_token_policy` table (per-member / per-project ceilings) checked at
  the **pre-flight gate** (Token UX §3).

## 5. Negotiated pricing / quotes
Enterprise tier = custom seats + token pool. Pricing page shows a **"Request a quote"** path
(sales-assisted) rather than self-serve checkout; on agreement, provision via the `enterprise` SKU +
seat grants. (Confirm published-enterprise-tier vs fully-custom — open item.)

## 6. Build order
1. Members + seats (read existing tables; assign/revoke via `increment_app_seat`).
2. Permissions matrix (compose `project_members` + `folder_permissions` + app access).
3. Oversight dashboards (usage rollups) + audit export.
4. Org token pool + caps wired into the pre-flight gate + alerts.
5. Billing surface + quote path + org branding.

## 7. Open items
- Enterprise pricing model: published tier vs fully custom/quote (CEO — leaning quote-based).
- Retention window for audit data; compliance/export format needs.
