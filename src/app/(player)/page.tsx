"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTournaments } from "@/lib/context";
import { usePlayer } from "@/lib/player-context";

export default function PlayerSelectPage() {
  const router = useRouter();
  const { tournaments } = useTournaments();
  const { identity, setIdentity } = usePlayer();

  const [tournamentId, setTournamentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");

  useEffect(() => {
    if (identity) {
      router.push("/dashboard");
    }
  }, [identity, router]);

  const activeTournaments = tournaments.filter(
    (t) => t.status !== "completed"
  );
  const selectedTournament = tournaments.find((t) => t.id === tournamentId);
  const teams = selectedTournament?.teams ?? [];
  const selectedTeam = teams.find((t) => t.id === teamId);
  const players = selectedTeam?.players ?? [];

  function handleContinue() {
    if (!tournamentId || !teamId || !playerId) return;
    setIdentity({ tournamentId, teamId, playerId });
    router.push("/dashboard");
  }

  if (identity) return null;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome, Player!</CardTitle>
          <CardDescription>
            Select your tournament and team to manage your availability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tournament</Label>
            <Select
              value={tournamentId}
              onValueChange={(v) => {
                setTournamentId(v);
                setTeamId("");
                setPlayerId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tournament..." />
              </SelectTrigger>
              <SelectContent>
                {activeTournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tournamentId && (
            <div className="space-y-2">
              <Label>Team</Label>
              <Select
                value={teamId}
                onValueChange={(v) => {
                  setTeamId(v);
                  setPlayerId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {teamId && (
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your name..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} (#{p.number} &middot;{" "}
                      {p.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="w-full mt-2"
            disabled={!tournamentId || !teamId || !playerId}
            onClick={handleContinue}
          >
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
