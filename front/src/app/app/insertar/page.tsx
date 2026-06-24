import { redirect } from "next/navigation";
import { ManualInsertPanel } from "@/components/manual-insert-panel";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InsertarPage() {
  const session = await getSession(getSessionSecret());

  if (!session.user) {
    redirect("/login");
  }

  return <ManualInsertPanel defaultPersona={session.user.persona} />;
}
