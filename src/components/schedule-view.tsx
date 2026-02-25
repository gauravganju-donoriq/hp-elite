"use client";

import { Match, Team } from "@/lib/types";
import { getTeamShortName } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScheduleViewProps {
  matches: Match[];
  teams: Team[];
}

export function ScheduleView({ matches, teams }: ScheduleViewProps) {
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const byDate: Record<string, Match[]> = {};
  for (const m of sortedMatches) {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  }

  const dates = Object.keys(byDate);

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No matches scheduled</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Generate fixtures to see the schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead className="w-[80px]">Time</TableHead>
              <TableHead>Match</TableHead>
              <TableHead className="w-[100px]">Stage</TableHead>
              <TableHead className="w-[120px]">Location</TableHead>
              <TableHead className="w-[80px] text-center">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dates.map((date) =>
              byDate[date].map((match, idx) => (
                <TableRow key={match.id}>
                  {idx === 0 ? (
                    <TableCell
                      className="font-medium align-top"
                      rowSpan={byDate[date].length}
                    >
                      <div className="flex flex-col">
                        <span>
                          {new Date(date).toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className="text-muted-foreground">
                    {match.time}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getTeamShortName(teams, match.homeTeamId)} vs{" "}
                    {getTeamShortName(teams, match.awayTeamId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {match.stage === "group"
                        ? match.group
                        : match.stage === "semi-final"
                          ? "Semi-Final"
                          : "Final"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {match.location}
                  </TableCell>
                  <TableCell className="text-center">
                    {match.played ? (
                      <span className="font-bold">
                        {match.homeScore} - {match.awayScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">--</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
