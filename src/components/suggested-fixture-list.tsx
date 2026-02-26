"use client";

import { useState, useMemo } from "react";
import { Sparkles, Check, X, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tournament, SuggestedMatch, Match } from "@/lib/types";
import { useTournaments } from "@/lib/context";
import { getTeamName } from "@/lib/data";
import { suggestFixtures } from "@/lib/fixture-utils";
import { toast } from "sonner";

interface SuggestedFixtureListProps {
  tournament: Tournament;
}

export function SuggestedFixtureList({
  tournament,
}: SuggestedFixtureListProps) {
  const { availability, addMatches, updateTournament } = useTournaments();
  const [suggestions, setSuggestions] = useState<SuggestedMatch[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState(false);

  const existingGroupMatches = tournament.matches.filter(
    (m) => m.stage === "group"
  );

  function handleGenerate() {
    const result = suggestFixtures(
      tournament.groups,
      tournament.teams,
      availability,
      tournament.id,
      tournament.startDate,
      tournament.endDate,
      tournament.matches
    );
    setSuggestions(result);
    setDismissed(new Set());
    setGenerated(true);
    if (result.length === 0) {
      toast.info("No new fixtures to suggest. All group matchups are already scheduled.");
    }
  }

  function handleAccept(suggestion: SuggestedMatch) {
    const match: Match = {
      id: `match-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tournamentId: tournament.id,
      homeTeamId: suggestion.homeTeamId,
      awayTeamId: suggestion.awayTeamId,
      homeScore: null,
      awayScore: null,
      date: suggestion.date,
      time: suggestion.time,
      location: tournament.location,
      stage: "group",
      group: suggestion.group,
      matchday: existingGroupMatches.length + 1,
      played: false,
    };
    addMatches(tournament.id, [match]);
    if (tournament.status === "upcoming") {
      updateTournament(tournament.id, { status: "in_progress" });
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    toast.success(
      `Match scheduled: ${getTeamName(tournament.teams, suggestion.homeTeamId)} vs ${getTeamName(tournament.teams, suggestion.awayTeamId)}`
    );
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  function handleAcceptAll() {
    const remaining = suggestions.filter((s) => !dismissed.has(s.id));
    const matches: Match[] = remaining.map((suggestion, i) => ({
      id: `match-auto-${Date.now()}-${i}`,
      tournamentId: tournament.id,
      homeTeamId: suggestion.homeTeamId,
      awayTeamId: suggestion.awayTeamId,
      homeScore: null,
      awayScore: null,
      date: suggestion.date,
      time: suggestion.time,
      location: tournament.location,
      stage: "group" as const,
      group: suggestion.group,
      matchday: existingGroupMatches.length + i + 1,
      played: false,
    }));
    if (matches.length > 0) {
      addMatches(tournament.id, matches);
      if (tournament.status === "upcoming") {
        updateTournament(tournament.id, { status: "in_progress" });
      }
      toast.success(`${matches.length} matches scheduled!`);
    }
    setSuggestions([]);
  }

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissed.has(s.id)
  );

  if (tournament.groups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Auto-Suggest Fixtures
            </CardTitle>
            <CardDescription>
              Automatically find the best match dates based on player
              availability.
            </CardDescription>
          </div>
          <Button onClick={handleGenerate} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            {generated ? "Re-generate" : "Suggest Fixtures"}
          </Button>
        </div>
      </CardHeader>
      {generated && visibleSuggestions.length > 0 && (
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {visibleSuggestions.length} suggestion
              {visibleSuggestions.length !== 1 ? "s" : ""}
            </span>
            <Button size="sm" onClick={handleAcceptAll}>
              <Check className="mr-2 h-3 w-3" />
              Accept All
            </Button>
          </div>

          <div className="space-y-2">
            {visibleSuggestions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="font-medium text-sm">
                    {getTeamName(tournament.teams, s.homeTeamId)} vs{" "}
                    {getTeamName(tournament.teams, s.awayTeamId)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {s.group}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(s.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" }
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.availableHomePlayers}/{s.totalHomePlayers} +{" "}
                      {s.availableAwayPlayers}/{s.totalAwayPlayers} players
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      s.score >= 6
                        ? "bg-green-100 text-green-700"
                        : s.score >= 4
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-orange-100 text-orange-700"
                    }
                  >
                    Score: {s.score}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleAccept(s)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDismiss(s.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
      {generated && visibleSuggestions.length === 0 && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No suggestions remaining. All group matchups have been scheduled or
            dismissed.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
