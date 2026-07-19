import { redirect } from "next/navigation";
import { LogPanel } from "@/components/log-panel";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const session = await getSession(getSessionSecret());

  if (!session.user) {
    redirect("/login");
  }

  return <LogPanel defaultPersona={session.user.persona} />;
}
