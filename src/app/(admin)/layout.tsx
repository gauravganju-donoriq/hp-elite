import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession, isAdmin } from "@/lib/api-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/dashboard");

  return <AppShell>{children}</AppShell>;
}
