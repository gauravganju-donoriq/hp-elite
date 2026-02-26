"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/lib/player-context";
import { useTournaments } from "@/lib/context";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { TimeSlot } from "@/lib/types";
import { toast } from "sonner";

export default function AvailabilityPage() {
  const router = useRouter();
  const { identity } = usePlayer();
  const { tournaments, availability, setPlayerAvailability } = useTournaments();

  useEffect(() => {
    if (!identity) router.push("/");
  }, [identity, router]);

  if (!identity) return null;

  const tournament = tournaments.find(
    (t) => t.id === identity.tournamentId
  );
  if (!tournament) return null;

  const team = tournament.teams.find((t) => t.id === identity.teamId);
  const player = team?.players.find((p) => p.id === identity.playerId);
  if (!team || !player) return null;

  const myAvailability = availability.find(
    (a) =>
      a.playerId === identity.playerId &&
      a.tournamentId === identity.tournamentId
  );

  function handleSave(slots: TimeSlot[]) {
    setPlayerAvailability(
      identity!.playerId,
      identity!.teamId,
      identity!.tournamentId,
      slots
    );
    toast.success(`Availability saved! ${slots.length} days marked.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">My Availability</h1>
        <p className="text-muted-foreground">
          {tournament.name} &middot; {team.name} &middot; {player.firstName}{" "}
          {player.lastName}
        </p>
      </div>

      <AvailabilityCalendar
        startDate={tournament.startDate}
        endDate={tournament.endDate}
        slots={myAvailability?.slots ?? []}
        onSave={handleSave}
      />
    </div>
  );
}
