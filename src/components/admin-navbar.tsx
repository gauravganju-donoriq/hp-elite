"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStaffIdentity } from "@/lib/staff-context";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { userName } = useStaffIdentity();

  const links = [
    { href: "/admin", label: "Schedules" },
    { href: "/admin/staff", label: "Staff Roster" },
  ];

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
          <Image
            src="/hp-elite.png"
            alt="HP Elite & Beyond"
            width={120}
            height={32}
            className="h-8 w-auto dark:invert"
            priority
          />
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
          {userName && (
            <span className="text-muted-foreground text-xs">{userName}</span>
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
