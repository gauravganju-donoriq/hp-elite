"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState, LoadingState } from "@/components/states";
import { ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function AdminsPage() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadAdmins = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) throw new Error("Failed to load admins");
      const data = (await res.json()) as AdminUser[];
      setAdmins(data);
    } catch {
      toast.error("Failed to load admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  function openAdd() {
    setEmail("");
    setName("");
    setPassword("");
    setDialogOpen(true);
  }

  async function handleAdd() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Email is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          name: name.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to add admin");
      }

      toast.success(
        data.promoted
          ? "Existing user promoted to admin."
          : "New admin account created."
      );
      setDialogOpen(false);
      await loadAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add admin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/admins/${removeTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove admin");
      }
      toast.success("Admin access removed.");
      setRemoveTarget(null);
      await loadAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove admin.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Administrators"
        description="Manage who has admin access to the scheduler."
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <ShieldPlus className="size-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Administrator</DialogTitle>
                <DialogDescription>
                  If the email already has an account, it will be promoted to
                  admin. Otherwise, set a password to create a new admin account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Name{" "}
                    <span className="text-muted-foreground">(new accounts)</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Password{" "}
                    <span className="text-muted-foreground">
                      (new accounts only)
                    </span>
                  </Label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank when promoting someone who already has an
                    account.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? "Saving..." : "Add Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <LoadingState label="Loading admins..." />
      ) : admins.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No admins yet"
          description="Add an administrator to manage schedules and staff."
          action={
            <Button onClick={openAdd}>
              <ShieldPlus className="size-4" />
              Add Admin
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {admins.map((admin) => (
              <Card key={admin.id} className="gap-0 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{admin.name || admin.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {admin.email}
                    </p>
                  </div>
                  {admin.id === currentUserId ? (
                    <Badge variant="outline" className="shrink-0">
                      You
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Remove admin access"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoveTarget(admin)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
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
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[120px] pr-4 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="pl-4 font-medium">
                      <span className="flex items-center gap-2">
                        {admin.name || admin.email}
                        {admin.id === currentUserId && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {admin.email}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end">
                        {admin.id !== currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Remove admin access"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveTarget(admin)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove admin access?</DialogTitle>
            <DialogDescription>
              {removeTarget ? (
                <>
                  <span className="font-medium text-foreground">
                    {removeTarget.name || removeTarget.email}
                  </span>{" "}
                  will lose admin access. Their login account is kept and
                  becomes a regular staff account.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
