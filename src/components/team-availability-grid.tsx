"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tournament } from "@/lib/types";
import { useTournaments } from "@/lib/context";

interface TeamAvailabilityGridProps {
  tournament: Tournament;
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getAvailColor(available: number, total: number): string {
  if (total === 0) return "bg-muted";
  const ratio = available / total;
  if (ratio >= 1) return "bg-green-200 text-green-900";
  if (ratio >= 0.5) return "bg-yellow-100 text-yellow-900";
  if (ratio > 0) return "bg-orange-100 text-orange-900";
  return "bg-red-100 text-red-900";
}

export function TeamAvailabilityGrid({
  tournament,
}: TeamAvailabilityGridProps) {
  const { availability, getTeamAvailabilityForDate } = useTournaments();
  const [filterGroup, setFilterGroup] = useState("all");

  const allDates = useMemo(
    () => getDatesInRange(tournament.startDate, tournament.endDate),
    [tournament.startDate, tournament.endDate]
  );

  // Show first 14 days at a time for readability
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 14;
  const pagedDates = allDates.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );
  const totalPages = Math.ceil(allDates.length / PAGE_SIZE);

  const filteredTeams = useMemo(() => {
    if (filterGroup === "all") return tournament.teams;
    const group = tournament.groups.find((g) => g.name === filterGroup);
    if (!group) return tournament.teams;
    return tournament.teams.filter((t) => group.teamIds.includes(t.id));
  }, [filterGroup, tournament.teams, tournament.groups]);

  if (tournament.teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No teams to show</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add teams to see their availability.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">Player Availability Heatmap</h3>
          <p className="text-sm text-muted-foreground">
            Shows how many players per team are available each day.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Filter by Group</Label>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {tournament.groups.map((g) => (
                  <SelectItem key={g.name} value={g.name}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-200" /> All available
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-yellow-100" /> Partial
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-orange-100" /> Low
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-red-100" /> None
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="text-sm px-2 py-1 rounded border disabled:opacity-40 hover:bg-accent"
          >
            Prev
          </button>
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allDates.length)} of{" "}
            {allDates.length} days
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="text-sm px-2 py-1 rounded border disabled:opacity-40 hover:bg-accent"
          >
            Next
          </button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">
                Team
              </TableHead>
              {pagedDates.map((date) => {
                const d = new Date(date + "T12:00:00");
                return (
                  <TableHead key={date} className="text-center min-w-[54px] px-1">
                    <div className="text-xs leading-tight">
                      <div>
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="font-normal">
                        {d.getMonth() + 1}/{d.getDate()}
                      </div>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="truncate">{team.shortName}</span>
                  </div>
                </TableCell>
                {pagedDates.map((date) => {
                  const info = getTeamAvailabilityForDate(
                    team.id,
                    tournament.id,
                    date
                  );
                  const colorClass = getAvailColor(
                    info.available,
                    info.total
                  );

                  return (
                    <TableCell key={date} className="p-0 text-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={`w-full h-full min-h-[36px] text-xs font-medium ${colorClass} hover:opacity-80 transition-opacity`}
                          >
                            {info.available}/{info.total}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56">
                          <div className="space-y-2">
                            <div className="font-medium text-sm">
                              {team.name} -{" "}
                              {new Date(date + "T12:00:00").toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </div>
                            <div className="text-xs space-y-1">
                              {team.players.map((p) => {
                                const isAvail = info.playerIds.includes(p.id);
                                return (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between"
                                  >
                                    <span>
                                      {p.firstName} {p.lastName}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        isAvail
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }
                                    >
                                      {isAvail ? "Available" : "Unavailable"}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
