"use client";

import { Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/data";

interface MatchCardProps {
  match: Match;
  teams: Team[];
  onClick?: () => void;
}

export function MatchCard({ match, teams, onClick }: MatchCardProps) {
  const homeName = getTeamName(teams, match.homeTeamId);
  const awayName = getTeamName(teams, match.awayTeamId);

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${
        match.played ? "border-green-200" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-right flex-1">
              <p className="font-semibold">{homeName}</p>
            </div>
            <div className="flex items-center gap-2 min-w-[80px] justify-center">
              {match.played ? (
                <span className="text-2xl font-bold">
                  {match.homeScore} - {match.awayScore}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">vs</span>
              )}
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold">{awayName}</p>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(match.date).toLocaleDateString("en-US", {
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
          {match.played && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 text-xs"
            >
              FT
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
