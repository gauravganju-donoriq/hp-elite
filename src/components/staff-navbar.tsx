"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
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

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
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

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
          {displayName && (
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b mb-2 pb-2">
              {displayName}
            </div>
          )}
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/dashboard"
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          {identity && (
            <Link
              href="/availability"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                pathname === "/availability"
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <CalendarCheck className="h-4 w-4" />
              My Availability
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground w-full text-left"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
