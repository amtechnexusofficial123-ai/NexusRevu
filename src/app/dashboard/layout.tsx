import { redirect } from "next/navigation";
import { getSessionAdminId } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const adminId = await getSessionAdminId();
  if (!adminId) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg text-ink">
            <img src="/nexusrevu-mark.svg" alt="" className="h-6 w-6" />
            Nexus<span className="text-brand">Revu</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-ink/70">
            <LogoutButton />
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
