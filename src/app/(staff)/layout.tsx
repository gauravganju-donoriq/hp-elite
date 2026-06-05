"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StaffNavbar } from "@/components/staff-navbar";
import { UnlinkedAccount } from "@/components/unlinked-account";
import { useStaffIdentity } from "@/lib/staff-context";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, unlinked, loading } = useStaffIdentity();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAdmin) {
      router.replace("/admin");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isAdmin) return null;

  if (unlinked) {
    return (
      <>
        <StaffNavbar />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <UnlinkedAccount />
        </main>
      </>
    );
  }

  return (
    <>
      <StaffNavbar />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
