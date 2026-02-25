"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Group, Match, Team } from "@/lib/types";
import { calculateStandings } from "@/lib/fixture-utils";
import { getTeamName } from "@/lib/data";

interface StandingsTableProps {
  group: Group;
  teams: Team[];
  matches: Match[];
}

export function StandingsTable({ group, teams, matches }: StandingsTableProps) {
  const standings = calculateStandings(group, matches);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{group.name}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center w-10">P</TableHead>
              <TableHead className="text-center w-10">W</TableHead>
              <TableHead className="text-center w-10">D</TableHead>
              <TableHead className="text-center w-10">L</TableHead>
              <TableHead className="text-center w-10">GF</TableHead>
              <TableHead className="text-center w-10">GA</TableHead>
              <TableHead className="text-center w-10">GD</TableHead>
              <TableHead className="text-center w-14 font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((s, idx) => (
              <TableRow
                key={s.teamId}
                className={idx === 0 ? "bg-green-50" : ""}
              >
                <TableCell>
                  {idx === 0 ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 text-xs"
                    >
                      Q
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{idx + 1}</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {getTeamName(teams, s.teamId)}
                </TableCell>
                <TableCell className="text-center">{s.played}</TableCell>
                <TableCell className="text-center">{s.won}</TableCell>
                <TableCell className="text-center">{s.drawn}</TableCell>
                <TableCell className="text-center">{s.lost}</TableCell>
                <TableCell className="text-center">{s.goalsFor}</TableCell>
                <TableCell className="text-center">{s.goalsAgainst}</TableCell>
                <TableCell className="text-center">
                  {s.goalDifference > 0 ? "+" : ""}
                  {s.goalDifference}
                </TableCell>
                <TableCell className="text-center font-bold text-lg">
                  {s.points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
