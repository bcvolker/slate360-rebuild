import { redirect } from "next/navigation";

export const metadata = { title: "My Account — Slate360" };

export default function MyAccountPage() {
  redirect("/more/account");
}
