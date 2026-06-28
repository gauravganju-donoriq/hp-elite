"use client";

import { useState } from "react";
import { useScheduling } from "@/lib/context";
import type { AutoAssignProfile, AutoAssignRule, StaffRole } from "@/lib/types";
import {
  ROLE_LABELS,
  STAFF_ROLES,
  describePlan,
} from "@/lib/auto-assign-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function emptyRule(): AutoAssignRule {
  return { roles: ["junior"], preferSeniorFirst: true };
}

function RuleEditor({
  rule,
  index,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  rule: AutoAssignRule;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (next: AutoAssignRule) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  function toggleRole(role: StaffRole) {
    const has = rule.roles.includes(role);
    const nextRoles = has
      ? rule.roles.filter((r) => r !== role)
      : [...rule.roles, role];
    if (nextRoles.length === 0) return; // keep at least one role
    onChange({ ...rule, roles: nextRoles });
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          Step {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px]">Roles to pull from</Label>
        <div className="flex flex-wrap gap-1.5">
          {STAFF_ROLES.map((role) => {
            const active = rule.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={cn(
                  "rounded border px-2 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                )}
              >
                {ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px]">Max to fill (optional)</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={1}
            placeholder="Any"
            value={rule.max ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...rule,
                max: v === "" ? undefined : Math.max(1, parseInt(v) || 1),
              });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Order</Label>
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => onChange({ ...rule, preferSeniorFirst: true })}
              className={cn(
                "flex-1 rounded px-2 py-1 text-[11px] transition-colors",
                rule.preferSeniorFirst
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Most exp.
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...rule, preferSeniorFirst: false })}
              className={cn(
                "flex-1 rounded px-2 py-1 text-[11px] transition-colors",
                !rule.preferSeniorFirst
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Least exp.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AutoAssignProfilesPanel() {
  const {
    autoAssignProfiles,
    addAutoAssignProfile,
    updateAutoAssignProfile,
    removeAutoAssignProfile,
  } = useScheduling();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [rules, setRules] = useState<AutoAssignRule[]>([emptyRule()]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...autoAssignProfiles].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );

  function openAdd() {
    setEditId(null);
    setName("");
    setSlug("");
    setSortOrder((autoAssignProfiles.length + 1) * 10);
    setRules([emptyRule()]);
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    const p = autoAssignProfiles.find((x) => x.id === id);
    if (!p) return;
    setEditId(id);
    setName(p.name);
    setSlug(p.id);
    setSortOrder(p.sortOrder);
    setRules(p.plan.length > 0 ? p.plan.map((r) => ({ ...r })) : [emptyRule()]);
    setDialogOpen(true);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!editId) setSlug(slugify(value));
  }

  function updateRule(index: number, next: AutoAssignRule) {
    setRules((prev) => prev.map((r, i) => (i === index ? next : r)));
  }

  function moveRule(index: number, dir: -1 | 1) {
    setRules((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeRule(index: number) {
    setRules((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }
    if (rules.length === 0 || rules.some((r) => r.roles.length === 0)) {
      toast.error("Each step needs at least one role.");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        updateAutoAssignProfile(editId, {
          name: trimmedName,
          plan: rules,
          sortOrder,
        });
        toast.success("Profile updated.");
      } else {
        const finalSlug = slug.trim() || slugify(trimmedName);
        if (!finalSlug) {
          toast.error("Could not derive an id from the name.");
          setSaving(false);
          return;
        }
        if (autoAssignProfiles.some((p) => p.id === finalSlug)) {
          toast.error("A profile with that id already exists.");
          setSaving(false);
          return;
        }
        await addAutoAssignProfile({
          id: finalSlug,
          name: trimmedName,
          plan: rules,
          sortOrder,
        });
        toast.success("Profile created.");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!deleteId) return;
    const p = autoAssignProfiles.find((x) => x.id === deleteId);
    if (autoAssignProfiles.length <= 1) {
      toast.error("Keep at least one profile.");
      setDeleteId(null);
      return;
    }
    removeAutoAssignProfile(deleteId);
    toast.success(`${p?.name ?? "Profile"} removed.`);
    setDeleteId(null);
  }

  const deleteTarget: AutoAssignProfile | null = deleteId
    ? autoAssignProfiles.find((p) => p.id === deleteId) ?? null
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Auto-Assign Profiles
            </CardTitle>
            <CardDescription>
              Define how empty slots get filled. Each profile is an ordered set
              of steps (which roles, how many, and seniority order).
            </CardDescription>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  No profiles yet. Click &ldquo;Add Profile&rdquo; to create one.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {p.name}
                    {p.isBuiltin && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        Built-in
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[420px]">
                  <span className="text-xs text-muted-foreground">
                    {describePlan(p.plan)}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{p.sortOrder}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteId(p.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Profile" : "Add Profile"}
            </DialogTitle>
            <DialogDescription>
              Steps run in order, filling empty slots until they&apos;re full.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Most Experienced"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            {!editId && (
              <div className="space-y-2">
                <Label>Id (slug)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="auto-generated"
                />
                <p className="text-xs text-muted-foreground">
                  Used internally. Lowercase letters, numbers, and dashes only.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRules((prev) => [...prev, emptyRule()])}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add step
                </Button>
              </div>
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <RuleEditor
                    key={i}
                    rule={rule}
                    index={i}
                    isFirst={i === 0}
                    isLast={i === rules.length - 1}
                    onChange={(next) => updateRule(i, next)}
                    onMove={(dir) => moveRule(i, dir)}
                    onRemove={() => removeRule(i)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Summary</p>
              <p className="text-xs">{describePlan(rules)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editId ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete profile?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-foreground">
                    {deleteTarget.name}
                  </span>{" "}
                  will be removed. Sessions already assigned with it keep their
                  staff.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
