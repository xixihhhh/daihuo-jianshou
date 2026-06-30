import { redirect } from "next/navigation";

// Home page redirects directly to the new "create-first" landing page at /start.
// Capabilities of the old home (project list + entry cards) have been merged into /start: upload/one-liner dual entry, resume recent projects, product library/batch/settings entry.
export default function HomePage() {
  redirect("/start");
}
