"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleCard } from "@/components/schedule-card";
import { useScheduling } from "@/lib/context";

export default function AdminDashboardPage() {
  const { schedules } = useScheduling();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <p className="text-muted-foreground">
            Manage coaching session schedules and staff availability.
          </p>
        </div>
        <Link href="/admin/schedules/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        </Link>
      </div>

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No schedules yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first schedule to start managing sessions.
          </p>
          <Link href="/admin/schedules/create" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Schedule
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <ScheduleCard key={s.id} schedule={s} />
          ))}
        </div>
      )}
    </div>
  );
}
