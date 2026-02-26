"use client";

import Link from "next/link";
import { Shield, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
          <Trophy className="h-5 w-5" />
          <span>Tournament Manager</span>
          <Badge variant="secondary" className="ml-1 gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link
            href="/admin"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/tournaments/create"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            New Tournament
          </Link>
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Player Portal
          </Link>
        </nav>
      </div>
    </header>
  );
}
