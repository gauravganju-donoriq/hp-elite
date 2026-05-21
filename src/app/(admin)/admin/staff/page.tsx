"use client";

import { useState } from "react";
import { useScheduling } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Users, KeyRound, UserPlus } from "lucide-react";
import type { StaffRole } from "@/lib/types";
import { toast } from "sonner";

const ROLE_LABELS: Record<StaffRole, string> = {
  lead: "Lead",
  experience: "Experience",
  junior: "Junior",
  trial: "Trial",
};

const ROLE_VARIANTS: Record<StaffRole, "default" | "secondary" | "outline" | "destructive"> = {
  lead: "default",
  experience: "secondary",
  junior: "outline",
  trial: "outline",
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

  const sortedStaff = [...staff].sort(
    (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  );

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
    setEmail("");
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
        updateStaff(editId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          yearsExperience,
        });
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

  const roleCounts = staff.reduce(
    (acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Roster</h1>
          <p className="text-muted-foreground">
            Manage coaching staff for the academy.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editId ? "Edit Staff Member" : "Add Staff Member"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set a password"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as StaffRole)}
                  >
                    <SelectTrigger>
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
                    onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editId ? "Save Changes" : "Create Staff"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
        {(Object.entries(ROLE_LABELS) as [StaffRole, string][]).map(([roleKey, label]) => (
          <Card key={roleKey}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}s
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleCounts[roleKey] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.lastName}, {member.firstName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANTS[member.role]}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {member.yearsExperience ?? 0} yr{(member.yearsExperience ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    {member.userId ? (
                      <Badge variant="secondary" className="gap-1">
                        <KeyRound className="h-3 w-3" />
                        Linked
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openLinkAccount(member.id)}
                      >
                        <UserPlus className="h-3 w-3" />
                        Link Account
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(member.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRemove(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Link Login Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a login account for{" "}
            <span className="font-medium text-foreground">
              {staff.find((s) => s.id === linkStaffId)?.firstName}{" "}
              {staff.find((s) => s.id === linkStaffId)?.lastName}
            </span>
            . They will use these credentials to sign in and set their availability.
          </p>
          <div className="space-y-4 pt-2">
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
              <Input
                type="password"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Set a password"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLinkAccount} disabled={linking}>
                {linking ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
