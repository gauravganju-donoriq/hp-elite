"use client";

import { useState } from "react";
import { Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Team, Player } from "@/lib/types";
import { AddTeamDialog } from "./add-team-dialog";
import { AddPlayerDialog } from "./add-player-dialog";

interface TeamListProps {
  teams: Team[];
  onAddTeam: (team: Team) => void;
  onAddPlayer: (teamId: string, player: Player) => void;
}

const positionColors: Record<string, string> = {
  GK: "bg-yellow-100 text-yellow-800",
  DEF: "bg-blue-100 text-blue-800",
  MID: "bg-green-100 text-green-800",
  FWD: "bg-red-100 text-red-800",
};

export function TeamList({ teams, onAddTeam, onAddPlayer }: TeamListProps) {
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [addPlayerTeam, setAddPlayerTeam] = useState<Team | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Teams ({teams.length})
        </h2>
        <Button onClick={() => setShowAddTeam(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No teams yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add teams to this tournament.
          </p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {teams.map((team) => (
            <AccordionItem
              key={team.id}
              value={team.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="font-semibold">{team.name}</span>
                  <Badge variant="outline">{team.shortName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {team.players.length} players
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {team.players.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-24">Position</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.players.map((player) => (
                          <TableRow key={player.id}>
                            <TableCell className="font-mono">
                              {player.number}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {player.firstName} {player.lastName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={positionColors[player.position]}
                              >
                                {player.position}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No players added yet.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddPlayerTeam(team)}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Add Player
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <AddTeamDialog
        open={showAddTeam}
        onClose={() => setShowAddTeam(false)}
        onSave={onAddTeam}
      />
      {addPlayerTeam && (
        <AddPlayerDialog
          open={!!addPlayerTeam}
          teamName={addPlayerTeam.name}
          onClose={() => setAddPlayerTeam(null)}
          onSave={(player) => {
            onAddPlayer(addPlayerTeam.id, player);
            setAddPlayerTeam(null);
          }}
        />
      )}
    </div>
  );
}
