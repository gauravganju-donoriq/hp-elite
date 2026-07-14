"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Clock,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Schedules",
    short: "Schedules",
    icon: LayoutGrid,
    match: (p) => p === "/admin" || p.startsWith("/admin/schedules"),
  },
  {
    href: "/schedule",
    label: "Schedule View",
    short: "Board",
    icon: CalendarDays,
    match: (p) => p === "/schedule",
  },
  {
    href: "/admin/staff",
    label: "Staff Roster",
    short: "Roster",
    icon: Users,
    match: (p) => p.startsWith("/admin/staff"),
  },
  {
    href: "/admin/reports",
    label: "Reports",
    short: "Reports",
    icon: BarChart3,
    match: (p) => p.startsWith("/admin/reports"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    short: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/admin/settings"),
  },
];

function buildStaffNav(hasIdentity: boolean): NavItem[] {
  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      short: "Home",
      icon: LayoutDashboard,
      match: (p) => p === "/dashboard",
    },
  ];
  if (hasIdentity) {
    items.push(
      {
        href: "/availability",
        label: "My Availability",
        short: "Availability",
        icon: CalendarCheck,
        match: (p) => p === "/availability",
      },
      {
        href: "/hours",
        label: "My Hours",
        short: "Hours",
        icon: Clock,
        match: (p) => p === "/hours",
      }
    );
  }
  items.push({
    href: "/schedule",
    label: "Schedule",
    short: "Schedule",
    icon: CalendarDays,
    match: (p) => p === "/schedule",
  });
  return items;
}

function Logo({
  className,
  /** Light pad behind the black mark — needed on dark chrome. */
  onDark,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const image = (
    <Image
      src="/hp-elite.png"
      alt="HP Elite & Beyond"
      width={140}
      height={36}
      priority
      className={cn("h-7 w-auto", className)}
    />
  );

  if (onDark) {
    return (
      <span className="inline-flex items-center rounded-md bg-white px-2 py-1">
        {image}
      </span>
    );
  }

  return image;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, userName, identity } = useStaffIdentity();
  const { staff } = useScheduling();

  const currentStaff = identity
    ? staff.find((s) => s.id === identity.staffId)
    : null;
  const displayName = currentStaff
    ? `${currentStaff.firstName} ${currentStaff.lastName}`
    : userName || "";

  const items = isAdmin ? ADMIN_NAV : buildStaffNav(Boolean(identity));
  const home = isAdmin ? "/admin" : "/dashboard";
  const bottomItems = items.slice(0, 5);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "HP";

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <Link href={home} className="flex items-center gap-2">
            <Logo onDark />
          </Link>
          {isAdmin && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-medium text-sidebar-accent-foreground">
              <Shield className="size-3" />
              Admin
            </span>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {displayName || "Signed in"}
              </p>
              <p className="text-sidebar-foreground/60 truncate text-xs">
                {isAdmin ? "Administrator" : "Coach"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-9 items-center justify-center rounded-lg transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="bg-background/90 sticky top-0 z-30 flex h-12 items-center border-b px-4 backdrop-blur sm:h-14 lg:hidden">
        <Link href={home} className="flex items-center">
          <Logo className="h-6 sm:h-7" />
        </Link>
      </header>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t backdrop-blur lg:hidden">
        {bottomItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[10px] font-medium transition-colors sm:gap-1 sm:text-[11px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-[18px] sm:size-5" />
              <span className="max-w-full truncate px-1">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
