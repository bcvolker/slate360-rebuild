import { redirect } from "next/navigation";

/**
 * The standalone "My Twins" list is gone (redesign 2026-09-09): twins live under
 * their project. Old links land on the project cards.
 */
export default function DigitalTwinTwinsPage() {
  redirect("/digital-twin/projects");
}
