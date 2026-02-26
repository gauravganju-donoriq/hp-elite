"use client";

import Link from "next/link";
import { Calendar, MapPin, Users, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tournament } from "@/lib/types";
import { useTournaments } from "@/lib/context";

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

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { deleteTournament } = useTournaments();

  const groupMatches = tournament.matches.filter((m) => m.stage === "group");
  const playedMatches = groupMatches.filter((m) => m.played);

  return (
    <Card className="group relative transition-shadow hover:shadow-lg">
      <Link href={`/admin/tournaments/${tournament.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">{tournament.name}</CardTitle>
            <Badge className={statusColors[tournament.status]} variant="secondary">
              {statusLabels[tournament.status]}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {tournament.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(tournament.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(tournament.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{tournament.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {tournament.teams.length} teams &middot;{" "}
                {tournament.numberOfGroups} groups
              </span>
            </div>
            {groupMatches.length > 0 && (
              <div className="mt-2 text-xs">
                {playedMatches.length}/{groupMatches.length} group matches
                played
              </div>
            )}
          </div>
        </CardContent>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          deleteTournament(tournament.id);
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </Card>
  );
}
