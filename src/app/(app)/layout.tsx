import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { getInbox } from "@/lib/queries/dashboard";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireSession();
  const inbox = getInbox(profile);
  const canRegister = ["admin", "project_coordinator", "field_staff", "data_entry"].includes(profile.role);

  return (
    <AppShell profile={profile} inbox={inbox} canRegister={canRegister}>
      {children}
    </AppShell>
  );
}
