import { AdminNavbar } from "@/components/admin-navbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNavbar />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
