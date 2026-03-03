"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarDays, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import { cn } from "@/lib/utils";

export function StaffNavbar() {
  const { identity, clearIdentity } = useStaffIdentity();
  const { staff } = useScheduling();
  const pathname = usePathname();

  const currentStaff = identity
    ? staff.find((s) => s.id === identity.staffId)
    : null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <Link
          href={identity ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-bold text-lg"
        >
          <CalendarDays className="h-5 w-5" />
          <span>HP Elite</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          {identity && currentStaff && (
            <>
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
              <span className="text-muted-foreground">
                {currentStaff.firstName} {currentStaff.lastName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearIdentity}
                className="text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          <Link
            href="/admin"
            className="text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1 text-xs"
          >
            <Shield className="h-3 w-3" />
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
