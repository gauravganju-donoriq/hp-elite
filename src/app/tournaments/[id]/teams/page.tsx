"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTournaments } from "@/lib/context";
import { TeamList } from "@/components/team-list";

export default function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { tournaments, addTeam, addPlayerToTeam } = useTournaments();
  const tournament = tournaments.find((t) => t.id === id);

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-2xl font-bold">Tournament not found</h2>
        <Link href="/" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/tournaments/${tournament.id}`}>
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {tournament.name}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">
          Manage teams and player rosters for {tournament.name}.
        </p>
      </div>

      <TeamList
        teams={tournament.teams}
        onAddTeam={(team) => addTeam(tournament.id, team)}
        onAddPlayer={(teamId, player) =>
          addPlayerToTeam(tournament.id, teamId, player)
        }
      />
    </div>
  );
}
