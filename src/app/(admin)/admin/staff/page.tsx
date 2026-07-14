"use client";

import { useState } from "react";
import { useScheduling } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { OverviewStat, OverviewStats } from "@/components/overview-stats";
import { EmptyState } from "@/components/states";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  KeyRound,
  UserPlus,
  Award,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import type { Staff, StaffRole } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<StaffRole, string> = {
  lead: "Lead",
  experience: "Experience",
  junior: "Junior",
  trial: "Trial",
};

const ROLE_BADGE: Record<StaffRole, string> = {
  lead: "bg-primary/10 text-primary border-primary/20",
  experience:
    "bg-brand-accent/15 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900",
  junior: "bg-muted text-muted-foreground border-border",
  trial: "bg-muted text-muted-foreground border-border",
};

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <Badge variant="outline" className={cn("font-medium", ROLE_BADGE[role])}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}

const ROLE_STAT: Record<
  StaffRole,
  { icon: typeof Award; tone: "brand" | "success" | "default" }
> = {
  lead: { icon: Award, tone: "brand" },
  experience: { icon: Sparkles, tone: "success" },
  junior: { icon: GraduationCap, tone: "default" },
  trial: { icon: GraduationCap, tone: "default" },
};

export default function StaffManagementPage() {
  const { staff, updateStaff, removeStaff, refreshAll } = useScheduling();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("experience");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [saving, setSaving] = useState(false);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkStaffId, setLinkStaffId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [linking, setLinking] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetStaffId, setResetStaffId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  const sortedStaff = [...staff].sort(
    (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  );

  const editingMember = editId ? staff.find((s) => s.id === editId) : undefined;

  function openAdd() {
    setEditId(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRole("experience");
    setYearsExperience(0);
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    const member = staff.find((s) => s.id === id);
    if (!member) return;
    setEditId(id);
    setFirstName(member.firstName);
    setLastName(member.lastName);
    setEmail(member.email ?? "");
    setPassword("");
    setRole(member.role);
    setYearsExperience(member.yearsExperience ?? 0);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }

    setSaving(true);

    try {
      if (editId) {
        const member = staff.find((s) => s.id === editId);

        updateStaff(editId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          yearsExperience,
        });

        const trimmedEmail = email.trim();
        if (
          member?.userId &&
          trimmedEmail &&
          trimmedEmail.toLowerCase() !== (member.email ?? "").toLowerCase()
        ) {
          const res = await fetch("/api/admin/update-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: editId, email: trimmedEmail }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Failed to update email");
          }

          await refreshAll();
        }

        toast.success("Staff member updated.");
      } else {
        if (!email.trim() || !password.trim()) {
          toast.error("Email and password are required for new staff.");
          setSaving(false);
          return;
        }

        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`,
            staffRole: role,
            yearsExperience,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to create user");
        }

        await refreshAll();
        toast.success("Staff member created with login account.");
      }

      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save staff member.");
    } finally {
      setSaving(false);
    }
  }

  function handleRemove(id: string) {
    const member = staff.find((s) => s.id === id);
    if (!member) return;
    removeStaff(id);
    toast.success(`${member.firstName} ${member.lastName} removed.`);
  }

  function openLinkAccount(id: string) {
    setLinkStaffId(id);
    setLinkEmail("");
    setLinkPassword("");
    setLinkDialogOpen(true);
  }

  async function handleLinkAccount() {
    if (!linkStaffId || !linkEmail.trim() || !linkPassword.trim()) {
      toast.error("Email and password are required.");
      return;
    }

    setLinking(true);
    try {
      const res = await fetch("/api/admin/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: linkStaffId,
          email: linkEmail.trim(),
          password: linkPassword.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to link account");
      }

      await refreshAll();
      toast.success("Login account created and linked.");
      setLinkDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link account.");
    } finally {
      setLinking(false);
    }
  }

  function openResetPassword(id: string) {
    setResetStaffId(id);
    setResetPassword("");
    setResetConfirm("");
    setResetDialogOpen(true);
  }

  async function handleResetPassword() {
    if (!resetStaffId) return;
    if (resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: resetStaffId,
          newPassword: resetPassword,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reset password");
      }

      toast.success("Password reset successfully.");
      setResetDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  }

  const roleCounts = staff.reduce(
    (acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function renderAccount(member: Staff) {
    if (member.userId) {
      return (
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className="w-fit gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <KeyRound className="size-3" />
            Linked
          </Badge>
          {member.email && (
            <span className="text-xs text-muted-foreground">{member.email}</span>
          )}
        </div>
      );
    }
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => openLinkAccount(member.id)}
      >
        <UserPlus className="size-3.5" />
        Link Account
      </Button>
    );
  }

  function renderActions(member: Staff) {
    return (
      <div className="flex items-center gap-1">
        {member.userId && (
          <Button
            variant="ghost"
            size="icon-sm"
            title="Reset password"
            onClick={() => openResetPassword(member.id)}
          >
            <KeyRound className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          title="Edit"
          onClick={() => openEdit(member.id)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Remove"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => handleRemove(member.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Staff Roster"
        description="Manage coaching staff for the academy."
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editId ? "Edit Staff Member" : "Add Staff Member"}
                </DialogTitle>
                <DialogDescription>
                  {editId
                    ? "Update this staff member's details."
                    : "Create a staff profile with a login account."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                {!editId && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="staff@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Set a password"
                      />
                    </div>
                  </div>
                )}

                {editId && editingMember?.userId && (
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="staff@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to sign in. Changing it updates their login email.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={role}
                      onValueChange={(v) => setRole(v as StaffRole)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      min={0}
                      value={yearsExperience}
                      onChange={(e) =>
                        setYearsExperience(parseInt(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editId
                      ? "Save Changes"
                      : "Create Staff"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <OverviewStats columns={5}>
        <OverviewStat
          label="Total staff"
          value={staff.length}
          icon={Users}
          tone="brand"
          detail="Coaching team"
        />
        {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(
          ([roleKey, label]) => (
            <OverviewStat
              key={roleKey}
              label={
                roleKey === "experience" ? "Experienced" : `${label}s`
              }
              value={roleCounts[roleKey] || 0}
              icon={ROLE_STAT[roleKey].icon}
              tone={ROLE_STAT[roleKey].tone}
              detail={
                roleKey === "lead"
                  ? "Senior coaches"
                  : roleKey === "experience"
                    ? "Core coaches"
                    : roleKey === "junior"
                      ? "Developing coaches"
                      : "In evaluation"
              }
            />
          )
        )}
      </OverviewStats>

      {sortedStaff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff yet"
          description="Add your coaching staff to start collecting availability."
          action={
            <Button onClick={openAdd}>
              <Plus className="size-4" />
              Add Staff
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {sortedStaff.map((member) => (
              <Card key={member.id} className="gap-0 p-3 sm:p-4">
                <div>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {member.firstName} {member.lastName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <RoleBadge role={member.role} />
                      <span className="text-xs text-muted-foreground">
                        {member.yearsExperience ?? 0} yr
                        {(member.yearsExperience ?? 0) !== 1 ? "s" : ""} exp
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t pt-3">
                  <div className="min-w-0 flex-1">{renderAccount(member)}</div>
                  {renderActions(member)}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-[140px] pr-4 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="pl-4 font-medium">
                      {member.lastName}, {member.firstName}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.yearsExperience ?? 0} yr
                      {(member.yearsExperience ?? 0) !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>{renderAccount(member)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end">
                        {renderActions(member)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Login Account</DialogTitle>
            <DialogDescription>
              Create a login account for{" "}
              <span className="font-medium text-foreground">
                {staff.find((s) => s.id === linkStaffId)?.firstName}{" "}
                {staff.find((s) => s.id === linkStaffId)?.lastName}
              </span>
              . They will use these credentials to sign in and set availability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="staff@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <PasswordInput
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Set a password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkAccount} disabled={linking}>
              {linking ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium text-foreground">
                {staff.find((s) => s.id === resetStaffId)?.firstName}{" "}
                {staff.find((s) => s.id === resetStaffId)?.lastName}
              </span>
              . Share the new password with them so they can sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>New Password</Label>
              <PasswordInput
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <PasswordInput
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
