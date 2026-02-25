"use client";

import { useState } from "react";
import { Match, Team } from "@/lib/types";
import { MatchCard } from "./match-card";
import { MatchResultDialog } from "./match-result-dialog";
import { Badge } from "@/components/ui/badge";

interface FixtureListProps {
  matches: Match[];
  teams: Team[];
  onUpdateMatch: (match: Match) => void;
}

export function FixtureList({
  matches,
  teams,
  onUpdateMatch,
}: FixtureListProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const groupMatches = matches.filter((m) => m.stage === "group");

  const byGroup: Record<string, Match[]> = {};
  for (const m of groupMatches) {
    const key = m.group ?? "Ungrouped";
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push(m);
  }

  if (groupMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No fixtures generated yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Go to the Groups tab and generate fixtures first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Click on a match to enter or edit the result.
      </p>
      {Object.entries(byGroup).map(([group, groupMatches]) => (
        <div key={group} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{group}</h3>
            <Badge variant="outline">{groupMatches.length} matches</Badge>
          </div>
          <div className="space-y-2">
            {groupMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teams={teams}
                onClick={() => setSelectedMatch(match)}
              />
            ))}
          </div>
        </div>
      ))}

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
