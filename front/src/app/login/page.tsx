import { redirect } from "next/navigation";
import { getSessionSecret } from "@/lib/config";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession(getSessionSecret());
  if (session.user) redirect("/app");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
          <p className="mt-2 text-sm text-muted">Inicia sesión para continuar</p>
          <p className="mt-1 text-xs text-muted">Usuario: Santi o Sandra</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
