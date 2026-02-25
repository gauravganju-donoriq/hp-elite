"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/data";
import { MatchResultDialog } from "./match-result-dialog";

interface KnockoutBracketProps {
  matches: Match[];
  teams: Team[];
  onUpdateMatch: (match: Match) => void;
}

function BracketMatch({
  match,
  teams,
  label,
  onClick,
}: {
  match: Match | undefined;
  teams: Team[];
  label: string;
  onClick?: () => void;
}) {
  if (!match) {
    return (
      <Card className="w-64 opacity-50">
        <CardContent className="p-3 text-center text-sm text-muted-foreground">
          {label} - TBD
        </CardContent>
      </Card>
    );
  }

  const homeName = getTeamName(teams, match.homeTeamId);
  const awayName = getTeamName(teams, match.awayTeamId);
  const isTbd = match.homeTeamId === "tbd" || match.awayTeamId === "tbd";

  return (
    <Card
      className={`w-64 cursor-pointer transition-shadow hover:shadow-md ${
        match.played ? "border-green-200" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="px-3 py-1.5 text-xs text-center text-muted-foreground border-b bg-muted/50">
          {label}
        </div>
        <div className="divide-y">
          <div
            className={`flex items-center justify-between px-3 py-2 ${
              match.played &&
              match.homeScore !== null &&
              match.awayScore !== null &&
              match.homeScore > match.awayScore
                ? "bg-green-50 font-bold"
                : ""
            }`}
          >
            <span className="text-sm">{homeName}</span>
            <span className="text-sm font-mono">
              {match.played ? match.homeScore : "-"}
            </span>
          </div>
          <div
            className={`flex items-center justify-between px-3 py-2 ${
              match.played &&
              match.homeScore !== null &&
              match.awayScore !== null &&
              match.awayScore > match.homeScore
                ? "bg-green-50 font-bold"
                : ""
            }`}
          >
            <span className="text-sm">{awayName}</span>
            <span className="text-sm font-mono">
              {match.played ? match.awayScore : "-"}
            </span>
          </div>
        </div>
        {match.played && (
          <div className="px-3 py-1 text-center">
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 text-xs"
            >
              FT
            </Badge>
          </div>
        )}
        {isTbd && !match.played && (
          <div className="px-3 py-1 text-center">
            <span className="text-xs text-muted-foreground">
              Waiting for group results
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KnockoutBracket({
  matches,
  teams,
  onUpdateMatch,
}: KnockoutBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const semi1 = matches.find((m) => m.id === "semi-1");
  const semi2 = matches.find((m) => m.id === "semi-2");
  const final1 = matches.find((m) => m.id === "final-1");

  const semiFinals = matches.filter((m) => m.stage === "semi-final");
  const finals = matches.filter((m) => m.stage === "final");

  if (semiFinals.length === 0 && finals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">Knockout stage not set up</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Complete the group stage fixtures first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Click on a match to enter the result. Winner of each group advances.
      </p>

      <div className="flex items-center justify-center gap-8 flex-wrap">
        {/* Semi-Finals column */}
        <div className="flex flex-col gap-8">
          <BracketMatch
            match={semi1}
            teams={teams}
            label="Semi-Final 1"
            onClick={() => semi1 && setSelectedMatch(semi1)}
          />
          <BracketMatch
            match={semi2}
            teams={teams}
            label="Semi-Final 2"
            onClick={() => semi2 && setSelectedMatch(semi2)}
          />
        </div>

        {/* Connector lines */}
        <div className="hidden md:flex flex-col items-center justify-center h-48">
          <div className="w-12 border-t-2 border-muted-foreground/30" />
          <div className="h-full border-r-2 border-muted-foreground/30" />
          <div className="w-12 border-t-2 border-muted-foreground/30" />
        </div>

        {/* Final column */}
        <div className="flex flex-col items-center gap-2">
          <BracketMatch
            match={final1}
            teams={teams}
            label="Final"
            onClick={() => final1 && setSelectedMatch(final1)}
          />
          {final1?.played &&
            final1.homeScore !== null &&
            final1.awayScore !== null && (
              <div className="mt-2 text-center">
                <Badge className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1">
                  Champion:{" "}
                  {getTeamName(
                    teams,
                    final1.homeScore > final1.awayScore
                      ? final1.homeTeamId
                      : final1.awayTeamId
                  )}
                </Badge>
              </div>
            )}
        </div>
      </div>

      <MatchResultDialog
        match={selectedMatch}
        teams={teams}
        open={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onSave={onUpdateMatch}
      />
    </div>
  );
}
