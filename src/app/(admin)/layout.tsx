import { redirect } from "next/navigation";
import { AdminNavbar } from "@/components/admin-navbar";
import { getSession, isAdmin } from "@/lib/api-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/dashboard");

  return (
    <>
      <AdminNavbar />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
