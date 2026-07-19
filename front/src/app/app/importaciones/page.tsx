import { redirect } from "next/navigation";
import { ImportacionesPanel } from "@/components/importaciones-panel";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ImportacionesPage() {
  const session = await getSession(getSessionSecret());

  if (!session.user) {
    redirect("/login");
  }

  return <ImportacionesPanel />;
}
