"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  Calendar,
  MapPin,
  Clock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePlayer } from "@/lib/player-context";
import { useTournaments } from "@/lib/context";
import { getTeamName } from "@/lib/data";

export default function PlayerDashboardPage() {
  const router = useRouter();
  const { identity } = usePlayer();
  const { tournaments, availability } = useTournaments();

  useEffect(() => {
    if (!identity) router.push("/");
  }, [identity, router]);

  if (!identity) return null;

  const tournament = tournaments.find(
    (t) => t.id === identity.tournamentId
  );
  if (!tournament) return null;

  const team = tournament.teams.find((t) => t.id === identity.teamId);
  const player = team?.players.find((p) => p.id === identity.playerId);
  if (!team || !player) return null;

  const myAvailability = availability.find(
    (a) =>
      a.playerId === identity.playerId &&
      a.tournamentId === identity.tournamentId
  );
  const slotCount = myAvailability?.slots.length ?? 0;

  const start = new Date(tournament.startDate);
  const end = new Date(tournament.endDate);
  const totalDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const teamMatches = tournament.matches.filter(
    (m) =>
      m.homeTeamId === identity.teamId || m.awayTeamId === identity.teamId
  );
  const upcomingMatches = teamMatches.filter((m) => !m.played);
  const playedMatches = teamMatches.filter((m) => m.played);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome, {player.firstName}!
        </h1>
        <p className="text-muted-foreground">
          {tournament.name} &middot; {team.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Availability</CardDescription>
            <CardTitle className="text-3xl">{slotCount}/{totalDays}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              days marked as available
            </p>
            <Link href="/availability" className="mt-3 block">
              <Button size="sm" className="w-full">
                <CalendarCheck className="mr-2 h-4 w-4" />
                Update Availability
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Matches</CardDescription>
            <CardTitle className="text-3xl">{upcomingMatches.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              matches scheduled for your team
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Played Matches</CardDescription>
            <CardTitle className="text-3xl">{playedMatches.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              matches completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Upcoming Matches</h2>
          {upcomingMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming matches scheduled yet.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingMatches.map((match) => (
                <Card key={match.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {getTeamName(tournament.teams, match.homeTeamId)} vs{" "}
                        {getTeamName(tournament.teams, match.awayTeamId)}
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">
                        {match.stage === "group"
                          ? match.group
                          : match.stage === "semi-final"
                            ? "Semi-Final"
                            : "Final"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(match.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {match.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {match.location}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Team</h2>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <CardTitle>{team.name}</CardTitle>
                <Badge variant="outline">{team.shortName}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {team.players.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm ${
                      p.id === identity.playerId ? "bg-primary/5 font-medium" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.firstName} {p.lastName}
                      {p.id === identity.playerId && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      #{p.number} &middot; {p.position}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
