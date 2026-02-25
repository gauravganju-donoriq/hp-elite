"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Group, Match, Team } from "@/lib/types";
import { calculateStandings } from "@/lib/fixture-utils";
import { getTeamName } from "@/lib/data";

interface GroupCardProps {
  group: Group;
  teams: Team[];
  matches: Match[];
}

export function GroupCard({ group, teams, matches }: GroupCardProps) {
  const standings = calculateStandings(group, matches);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{group.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Team</TableHead>
              <TableHead className="text-center w-10">P</TableHead>
              <TableHead className="text-center w-10">W</TableHead>
              <TableHead className="text-center w-10">D</TableHead>
              <TableHead className="text-center w-10">L</TableHead>
              <TableHead className="text-center w-10">GD</TableHead>
              <TableHead className="text-center w-12 font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((s, idx) => (
              <TableRow
                key={s.teamId}
                className={idx === 0 ? "bg-green-50" : ""}
              >
                <TableCell className="font-medium">
                  {getTeamName(teams, s.teamId)}
                </TableCell>
                <TableCell className="text-center">{s.played}</TableCell>
                <TableCell className="text-center">{s.won}</TableCell>
                <TableCell className="text-center">{s.drawn}</TableCell>
                <TableCell className="text-center">{s.lost}</TableCell>
                <TableCell className="text-center">
                  {s.goalDifference > 0 ? "+" : ""}
                  {s.goalDifference}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {s.points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
