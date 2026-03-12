import { AdminNavbar } from "@/components/admin-navbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminNavbar />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
