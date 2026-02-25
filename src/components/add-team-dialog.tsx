"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team } from "@/lib/types";

interface AddTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (team: Team) => void;
}

export function AddTeamDialog({ open, onClose, onSave }: AddTeamDialogProps) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  function handleSave() {
    if (!name.trim() || !shortName.trim()) return;
    onSave({
      id: `team-${Date.now()}`,
      name: name.trim(),
      shortName: shortName.trim().toUpperCase(),
      color,
      players: [],
    });
    setName("");
    setShortName("");
    setColor("#3b82f6");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              placeholder="e.g. FC Phoenix"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortName">Short Name</Label>
            <Input
              id="shortName"
              placeholder="e.g. PHX"
              maxLength={4}
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Team Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Add Team</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
