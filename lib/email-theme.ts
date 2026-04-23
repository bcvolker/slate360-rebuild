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
 * White-label: a future PR can resolve EMAIL_COLORS.primary at send-time
 * from `organizations.brand_settings.primary_color` and pass per-email.
 * For now the values are global brand defaults.
 */

export const EMAIL_COLORS = {
  /* Brand */
  primary: "#3B82F6",          // Cobalt-500 — links, CTAs, headings
  primaryHover: "#2563EB",     // Cobalt-600
  primaryOnDark: "#60A5FA",    // Cobalt-400 — readable on header band

  /* Surfaces */
  pageBg: "#f7f8fa",           // outer email canvas (light, not dark — emails stay neutral)
  cardBg: "#ffffff",           // main email card
  cardBorder: "#e5e7eb",       // hairline borders inside cards
  headerBand: "#0B0F15",       // top bar of every email — matches in-app header (dark)
  footerBand: "#fafafa",       // footer band
  footerBorder: "#f1f1f1",
  quoteBg: "#f3f4f6",          // pull-quote / message block background
  quoteBorder: "#3B82F6",      // pull-quote left border (matches primary)

  /* Text */
  textPrimary: "#111827",      // headings, strong body
  textBody: "#4b5563",         // body copy
  textMuted: "#6b7280",        // secondary copy
  textFaint: "#9ca3af",        // legal / footer text
  textOnDark: "#FFFFFF",       // text on header band + CTA buttons
  textInverseDark: "#374151",  // company name on light card

  /* Status */
  warning: "#ef4444",          // expiry callouts

  /* PDF-only neutrals (react-pdf StyleSheet) */
  pdfBody: "#1f2937",          // default page text color
  pdfSubtleBg: "#f9fafb",      // subtle section background
} as const;

export type EmailColors = typeof EMAIL_COLORS;
