import { redirect } from "next/navigation";

export const metadata = {
  title: "Account — Slate360",
};

export default function AccountSettingsPage() {
  redirect("/settings");
}
