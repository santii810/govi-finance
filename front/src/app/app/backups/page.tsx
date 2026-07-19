import { redirect } from "next/navigation";
import { BackupsPanel } from "@/components/backups-panel";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const session = await getSession(getSessionSecret());

  if (!session.user) {
    redirect("/login");
  }

  return <BackupsPanel />;
}
