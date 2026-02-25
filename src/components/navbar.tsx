"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Trophy className="h-5 w-5" />
          <span>Tournament Manager</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/tournaments/create"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            New Tournament
          </Link>
        </nav>
      </div>
    </header>
  );
}
