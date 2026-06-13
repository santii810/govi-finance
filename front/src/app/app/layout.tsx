import { redirect } from "next/navigation";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(getSessionSecret());

  if (!session.user) {
    redirect("/login");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
