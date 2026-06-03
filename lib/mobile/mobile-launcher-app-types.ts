export type MobileLauncherAppAccent = "primary" | "info";

export type MobileLauncherAppView = {
  id: string;
  title: string;
  subtext: string;
  statusSubline: string | null;
  href: string;
  accent: MobileLauncherAppAccent;
  access: "entitled" | "upsell";
  entitlementKey: string;
  upsellBullets: [string, string, string];
};
