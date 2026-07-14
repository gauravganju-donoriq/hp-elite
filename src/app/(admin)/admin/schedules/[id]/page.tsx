"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useScheduling } from "@/lib/context";
import type { Schedule } from "@/lib/types";
import { SessionSlotsPanel } from "@/components/session-slots-panel";
import { AvailabilityResponsePanel } from "@/components/availability-response-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OverviewStat, OverviewStats } from "@/components/overview-stats";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateDisplay, parseISODate } from "@/lib/dates";

function formatDate(dateStr: string) {
  const d = parseISODate(dateStr);
  return `${formatDateDisplay(dateStr).shortLong}, ${d.getUTCFullYear()}`;
}

function DeleteScheduleDialog({
  schedule,
  onConfirm,
}: {
  schedule: Schedule;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) setTyped("");
  }

  const canDelete = typed.trim() === schedule.name;

  function handleConfirm() {
    if (!canDelete) return;
    setOpen(false);
    onConfirm();
  }

  const sessionCount = schedule.sessions.length;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete this schedule?
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the schedule along with:
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>{sessionCount} session{sessionCount === 1 ? "" : "s"}</li>
          <li>all availability responses for those sessions</li>
          <li>all slot assignments</li>
          <li>
            <strong>all reports generated from this schedule</strong>
          </li>
        </ul>
        <div className="space-y-2">
          <Label htmlFor="delete-confirm" className="text-sm">
            Type <span className="font-semibold">{schedule.name}</span> to
            confirm.
          </Label>
          <Input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={schedule.name}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete}
            onClick={handleConfirm}
          >
            Delete Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditScheduleDialog({ schedule }: { schedule: Schedule }) {
  const { updateSchedule } = useScheduling();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(schedule.name);
  const [description, setDescription] = useState(schedule.description ?? "");
  const [startDate, setStartDate] = useState(schedule.startDate);
  const [endDate, setEndDate] = useState(schedule.endDate);

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setName(schedule.name);
      setDescription(schedule.description ?? "");
      setStartDate(schedule.startDate);
      setEndDate(schedule.endDate);
    }
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    updateSchedule(schedule.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate,
    });
    toast.success("Schedule updated.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription>Update the schedule details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Date</Label>
              <Input
                id="edit-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Date</Label>
              <Input
                id="edit-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    staff,
    schedules,
    availability,
    deleteSchedule,
    sessionSlots,
    loading,
  } = useScheduling();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold">Schedule not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const totalSessions = schedule.sessions.length;
  let totalRequired = 0;
  let totalAssigned = 0;
  let understaffedCount = 0;

  for (const session of schedule.sessions) {
    totalRequired += session.requiredStaff;
    const slots = sessionSlots.filter((s) => s.sessionId === session.id);
    const assigned = slots.filter((s) => s.assignedStaffId).length;
    totalAssigned += assigned;

    if (assigned < session.requiredStaff) understaffedCount++;
  }

  const scheduleSessionIds = new Set(schedule.sessions.map((s) => s.id));
  const respondedKeys = new Set(
    availability
      .filter((a) => scheduleSessionIds.has(a.sessionId))
      .map((a) => `${a.staffId}-${a.sessionId}`)
  );
  const totalStaff = staff.length;
  const respondedStaffCount =
    totalSessions === 0
      ? 0
      : staff.filter((member) =>
          schedule.sessions.every((s) =>
            respondedKeys.has(`${member.id}-${s.id}`)
          )
        ).length;

  function handleDelete() {
    deleteSchedule(schedule!.id);
    toast.success("Schedule deleted.");
    router.push("/admin");
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin")}
        className="-ml-2 w-fit text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to schedules
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {schedule.name}
          </h1>
          {schedule.description && (
            <p className="mt-1 text-muted-foreground">{schedule.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {formatDate(schedule.startDate)} – {formatDate(schedule.endDate)}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">
                {[...new Set(schedule.sessions.map((s) => s.location))].join(", ")}
              </span>
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <EditScheduleDialog schedule={schedule} />
          <DeleteScheduleDialog schedule={schedule} onConfirm={handleDelete} />
        </div>
      </div>

      <OverviewStats columns={4}>
        <OverviewStat
          label="Total sessions"
          value={totalSessions}
          detail="Training sessions"
          icon={CalendarDays}
        />
        <OverviewStat
          label="Slots filled"
          value={`${totalAssigned}/${totalRequired}`}
          detail="Assigned vs. needed"
          icon={CheckCircle2}
          tone="success"
        />
        <OverviewStat
          label="Responses complete"
          value={`${respondedStaffCount}/${totalStaff}`}
          detail="Answered every session"
          icon={Users}
          tone="brand"
        />
        <OverviewStat
          label="Understaffed"
          value={`${understaffedCount}/${totalSessions}`}
          detail="Sessions needing staff"
          icon={AlertTriangle}
          tone={understaffedCount > 0 ? "danger" : "success"}
        />
      </OverviewStats>

      <SessionSlotsPanel schedule={schedule} />

      <AvailabilityResponsePanel schedule={schedule} />
    </div>
  );
}
