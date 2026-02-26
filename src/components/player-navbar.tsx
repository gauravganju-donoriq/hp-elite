"use client";

import Link from "next/link";
import { CalendarCheck, LogOut, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/lib/player-context";
import { useTournaments } from "@/lib/context";

export function PlayerNavbar() {
  const { identity, clearIdentity } = usePlayer();
  const { tournaments } = useTournaments();

  const tournament = identity
    ? tournaments.find((t) => t.id === identity.tournamentId)
    : null;
  const team = tournament?.teams.find((t) => t.id === identity?.teamId);
  const player = team?.players.find((p) => p.id === identity?.playerId);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        <Link href={identity ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-lg">
          <Trophy className="h-5 w-5" />
          <span>Player Portal</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          {identity && player && (
            <>
              <Link
                href="/dashboard"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/availability"
                className="text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Availability
              </Link>
              <span className="text-muted-foreground">
                {player.firstName} {player.lastName}
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
            className="text-muted-foreground transition-colors hover:text-foreground text-xs"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
