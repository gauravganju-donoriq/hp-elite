"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function StaffNavbar() {
  const router = useRouter();
  const { identity, userName } = useStaffIdentity();
  const { staff } = useScheduling();
  const pathname = usePathname();

  const currentStaff = identity
    ? staff.find((s) => s.id === identity.staffId)
    : null;

  const displayName = currentStaff
    ? `${currentStaff.firstName} ${currentStaff.lastName}`
    : userName || "";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-lg"
        >
          <Image
            src="/hp-elite.png"
            alt="HP Elite & Beyond"
            width={120}
            height={32}
            className="h-8 w-auto dark:invert"
            priority
          />
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className={cn(
              "transition-colors hover:text-foreground",
              pathname === "/dashboard"
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            Dashboard
          </Link>
          {identity && (
            <Link
              href="/availability"
              className={cn(
                "transition-colors hover:text-foreground flex items-center gap-1",
                pathname === "/availability"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              My Availability
            </Link>
          )}
          {displayName && (
            <span className="text-muted-foreground">{displayName}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
