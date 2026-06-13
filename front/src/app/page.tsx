import { redirect } from "next/navigation";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession(getSessionSecret());
  redirect(session.user ? "/app" : "/login");
}
