/**
 * lib/email-theme.ts
 *
 * Quarantined color palette for transactional email + PDF generation.
 *
 * Why this exists: HTML emails and @react-pdf documents do NOT share
 * `app/globals.css` — Resend strips <link>/<style> in many clients, and
 * @react-pdf has its own StyleSheet. So we cannot rely on CSS variables.
 *
 * Rule: every email template (`lib/email*.ts`) and the PDF renderer
 * (`lib/site-walk/pdf/DeliverablePdf.tsx`) MUST import from this module
 * instead of inlining hex literals. When the brand color changes, this
 * is the only file to edit.
 *
 * Values mirror Graphite Glass tokens (`--graphite-*`, `--graphite-primary`).
 *
 * White-label: a future PR can resolve EMAIL_COLORS.primary at send-time
 * from `organizations.brand_settings.primary_color` and pass per-email.
 * For now the values are global brand defaults.
 */

export const EMAIL_COLORS = {
  /* Brand — graphite primary (#00E699) */
  primary: "#00E699",
  primaryHover: "#00C985",
  primaryOnDark: "#00E699",

  /* Surfaces */
  pageBg: "#f7f8fa",
  cardBg: "#ffffff",
  cardBorder: "#e5e7eb",
  headerBand: "#0B0F15",
  footerBand: "#0B0F15",
  footerBorder: "#2A3340",
  quoteBg: "#f1f5f9",
  quoteBorder: "#00E699",

  /* Text */
  textPrimary: "#111827",
  textBody: "#4b5563",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  textOnDark: "#FFFFFF",
  textOnPrimary: "#0B0F15",
  footerText: "#A3AED0",
  textInverseDark: "#374151",
  quoteText: "#4b5563",

  /* Status */
  warning: "#ef4444",

  /* PDF-only neutrals (react-pdf StyleSheet) */
  pdfBody: "#1f2937",
  pdfSubtleBg: "#f9fafb",
} as const;

export type EmailColors = typeof EMAIL_COLORS;
