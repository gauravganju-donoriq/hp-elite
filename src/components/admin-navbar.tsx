"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminNavbar() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Schedules" },
    { href: "/admin/staff", label: "Staff Roster" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
          <CalendarDays className="h-5 w-5" />
          <span>HP Elite</span>
          <Badge variant="secondary" className="ml-1 gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
          >
            <Users className="h-3.5 w-3.5" />
            Staff Portal
          </Link>
        </nav>
      </div>
    </header>
  );
}
