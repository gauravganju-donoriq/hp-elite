"use client";

import { AdminNavbar } from "@/components/admin-navbar";
import { StaffNavbar } from "@/components/staff-navbar";
import { useStaffIdentity } from "@/lib/staff-context";

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useStaffIdentity();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {isAdmin ? <AdminNavbar /> : <StaffNavbar />}
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
