"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useTournaments } from "@/lib/context";
import { GroupCard } from "@/components/group-card";
import { StandingsTable } from "@/components/standings-table";
import { FixtureList } from "@/components/fixture-list";
import { ScheduleView } from "@/components/schedule-view";
import { KnockoutBracket } from "@/components/knockout-bracket";
import { generateGroupFixtures } from "@/lib/fixture-utils";
import { toast } from "sonner";
import { Match, Tournament } from "@/lib/types";

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { tournaments } = useTournaments();
  const tournament = tournaments.find((t) => t.id === id);

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-2xl font-bold">Tournament not found</h2>
        <p className="text-muted-foreground mt-1">
          This tournament may have been deleted.
        </p>
        <Link href="/" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return <TournamentDetail tournament={tournament} />;
}

function TournamentDetail({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const { updateMatch, addMatches, updateTournament } = useTournaments();
  const [activeTab, setActiveTab] = useState("groups");

  const groupMatches = tournament.matches.filter((m) => m.stage === "group");
  const hasGroupFixtures = groupMatches.length > 0;

  const handleGenerateFixtures = useCallback(() => {
    if (tournament.groups.length === 0) {
      toast.error("No groups configured for this tournament.");
      return;
    }
    const fixtures = generateGroupFixtures(
      tournament.id,
      tournament.groups,
      tournament.teams,
      tournament.startDate,
      tournament.location
    );
    addMatches(tournament.id, fixtures);
    if (tournament.status === "upcoming") {
      updateTournament(tournament.id, { status: "in_progress" });
    }
    toast.success(`Generated ${fixtures.length} group stage fixtures!`);
  }, [tournament, addMatches, updateTournament]);

  const handleUpdateMatch = useCallback(
    (match: Match) => {
      updateMatch(tournament.id, match);
      toast.success("Match result saved!");
    },
    [tournament.id, updateMatch]
  );

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <Badge
                className={statusColors[tournament.status]}
                variant="secondary"
              >
                {statusLabels[tournament.status]}
              </Badge>
            </div>
            {tournament.description && (
              <p className="text-muted-foreground mt-1">
                {tournament.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(tournament.startDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(tournament.endDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {tournament.location}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {tournament.teams.length} teams &middot;{" "}
                {tournament.numberOfGroups} groups
              </div>
            </div>
          </div>
          <Link href={`/tournaments/${tournament.id}/teams`}>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Manage Teams
            </Button>
          </Link>
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="knockout">Knockout</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-6 space-y-4">
          {!hasGroupFixtures && tournament.groups.length > 0 && (
            <div className="flex justify-center">
              <Button onClick={handleGenerateFixtures}>
                <Zap className="mr-2 h-4 w-4" />
                Generate Group Fixtures
              </Button>
            </div>
          )}
          {tournament.groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <h3 className="text-lg font-semibold">No groups configured</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add teams and configure groups to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tournament.groups.map((group) => (
                <GroupCard
                  key={group.name}
                  group={group}
                  teams={tournament.teams}
                  matches={tournament.matches}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fixtures" className="mt-6">
          <FixtureList
            matches={tournament.matches}
            teams={tournament.teams}
            onUpdateMatch={handleUpdateMatch}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <ScheduleView
            matches={tournament.matches}
            teams={tournament.teams}
          />
        </TabsContent>

        <TabsContent value="standings" className="mt-6 space-y-8">
          {tournament.groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <h3 className="text-lg font-semibold">No standings yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Play some matches to see the standings.
              </p>
            </div>
          ) : (
            tournament.groups.map((group) => (
              <StandingsTable
                key={group.name}
                group={group}
                teams={tournament.teams}
                matches={tournament.matches}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="knockout" className="mt-6">
          <KnockoutBracket
            matches={tournament.matches}
            teams={tournament.teams}
            onUpdateMatch={handleUpdateMatch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
