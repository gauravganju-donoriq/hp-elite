"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Match, Team } from "@/lib/types";
import { getTeamName } from "@/lib/data";

interface MatchResultDialogProps {
  match: Match | null;
  teams: Team[];
  open: boolean;
  onClose: () => void;
  onSave: (match: Match) => void;
}

export function MatchResultDialog({
  match,
  teams,
  open,
  onClose,
  onSave,
}: MatchResultDialogProps) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  function handleOpen() {
    if (match) {
      setHomeScore(match.homeScore?.toString() ?? "");
      setAwayScore(match.awayScore?.toString() ?? "");
    }
  }

  function handleSave() {
    if (!match) return;
    const hs = parseInt(homeScore);
    const as = parseInt(awayScore);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) return;

    onSave({
      ...match,
      homeScore: hs,
      awayScore: as,
      played: true,
    });
    onClose();
  }

  if (!match) return null;

  const homeName = getTeamName(teams, match.homeTeamId);
  const awayName = getTeamName(teams, match.awayTeamId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) handleOpen();
        else onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Match Result</DialogTitle>
          <DialogDescription>
            {match.stage === "group" ? match.group + " - " : ""}
            {match.stage === "semi-final"
              ? "Semi-Final"
              : match.stage === "final"
                ? "Final"
                : `Matchday ${match.matchday}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <Label className="text-center font-semibold">{homeName}</Label>
            <Input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="text-center text-2xl font-bold h-14 w-20"
              placeholder="0"
            />
          </div>
          <span className="text-2xl font-bold text-muted-foreground">vs</span>
          <div className="flex flex-col items-center gap-2 flex-1">
            <Label className="text-center font-semibold">{awayName}</Label>
            <Input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="text-center text-2xl font-bold h-14 w-20"
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Result</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
