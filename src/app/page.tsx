import { redirect } from "next/navigation";
import { getSession, landingFor } from "@/lib/session";

export default async function RootPage() {
  const profile = await getSession();
  redirect(profile ? landingFor(profile.role) : "/sign-in");
}
