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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <Button variant="destructive" size="sm">
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
        <Button variant="outline" size="sm">
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
          <div className="grid grid-cols-2 gap-4">
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
  const { staff, schedules, availability, deleteSchedule, updateSchedule, sessionSlots, loading } = useScheduling();

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{schedule.name}</h1>
          {schedule.description && (
            <p className="text-muted-foreground mt-1">{schedule.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {[...new Set(schedule.sessions.map((s) => s.location))].join(", ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditScheduleDialog schedule={schedule} />
          <DeleteScheduleDialog schedule={schedule} onConfirm={handleDelete} />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Training sessions in this schedule</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Slots Filled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalAssigned}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalRequired}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Staff assigned out of total slots needed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Responses Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {respondedStaffCount}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalStaff}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Staff who submitted availability for every session</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              Understaffed Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {understaffedCount}
              <span className="text-sm font-normal text-muted-foreground">
                /{totalSessions}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sessions that still need more staff assigned</p>
          </CardContent>
        </Card>
      </div>

      <SessionSlotsPanel schedule={schedule} />

      <AvailabilityResponsePanel schedule={schedule} />
    </div>
  );
}
