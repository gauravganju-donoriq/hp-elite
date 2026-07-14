"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { UnlinkedAccount } from "@/components/unlinked-account";
import { LoadingState } from "@/components/states";
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
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Loading your workspace..." />
      </div>
    );
  }

  if (isAdmin) return null;

  if (unlinked) {
    return (
      <AppShell>
        <UnlinkedAccount />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
