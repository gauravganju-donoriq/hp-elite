"use client";

import { AppShell } from "@/components/app-shell";
import { LoadingState } from "@/components/states";
import { useStaffIdentity } from "@/lib/staff-context";

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useStaffIdentity();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Loading..." />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
