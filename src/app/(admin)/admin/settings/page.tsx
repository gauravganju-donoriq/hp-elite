"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScheduling } from "@/lib/context";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";
import { LogOut, Plus, Pencil, Trash2, Tag, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AutoAssignProfilesPanel } from "@/components/auto-assign-profiles-panel";
import {
  CLASS_TYPE_PALETTE,
  DEFAULT_COLOR_KEY,
  getPaletteEntry,
} from "@/lib/class-type-colors";
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

export default function SettingsPage() {
  const router = useRouter();
  const { classTypes, addClassType, updateClassType, removeClassType } =
    useScheduling();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [colorKey, setColorKey] = useState<string>(DEFAULT_COLOR_KEY);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedTypes = [...classTypes].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
  );

  function openAdd() {
    setEditId(null);
    setLabel("");
    setSlug("");
    setColorKey(DEFAULT_COLOR_KEY);
    setSortOrder((classTypes.length + 1) * 10);
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    const ct = classTypes.find((c) => c.id === id);
    if (!ct) return;
    setEditId(id);
    setLabel(ct.label);
    setSlug(ct.id);
    setColorKey(ct.colorKey);
    setSortOrder(ct.sortOrder);
    setDialogOpen(true);
  }

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!editId) {
      setSlug(slugify(value));
    }
  }

  async function handleSave() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      toast.error("Label is required.");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        updateClassType(editId, {
          label: trimmedLabel,
          colorKey,
          sortOrder,
        });
        toast.success("Class type updated.");
      } else {
        const finalSlug = slug.trim() || slugify(trimmedLabel);
        if (!finalSlug) {
          toast.error("Could not derive an id from the label.");
          setSaving(false);
          return;
        }
        if (classTypes.some((c) => c.id === finalSlug)) {
          toast.error("A class type with that id already exists.");
          setSaving(false);
          return;
        }
        await addClassType({
          id: finalSlug,
          label: trimmedLabel,
          colorKey,
          sortOrder,
        });
        toast.success("Class type created.");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save class type.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!deleteId) return;
    const ct = classTypes.find((c) => c.id === deleteId);
    removeClassType(deleteId);
    toast.success(`${ct?.label ?? "Class type"} removed.`);
    setDeleteId(null);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  const deleteTarget = deleteId
    ? classTypes.find((c) => c.id === deleteId)
    : null;

  const paletteOptions = Object.entries(CLASS_TYPE_PALETTE) as [
    string,
    { label: string; color: string; swatch: string },
  ][];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage class types and auto-assign profiles used across schedules."
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Class Type
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="size-4 text-primary" />
            Class Types
          </CardTitle>
          <CardDescription>
            These categories appear in the session configuration popover and
            color the schedule grid.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sortedTypes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-6 sm:py-8">
              No class types yet. Click &ldquo;Add Class Type&rdquo; to create
              one.
            </p>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="divide-y md:hidden">
                {sortedTypes.map((ct) => {
                  const palette = getPaletteEntry(ct.colorKey);
                  return (
                    <div
                      key={ct.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                            palette.color
                          )}
                        >
                          {ct.label}
                        </span>
                        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          <code className="max-w-32 truncate">{ct.id}</code>
                          <span>·</span>
                          <span>{palette.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(ct.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(ct.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Preview</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Id</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Sort</TableHead>
                      <TableHead className="w-[100px] pr-6 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTypes.map((ct) => {
                      const palette = getPaletteEntry(ct.colorKey);
                      return (
                        <TableRow key={ct.id}>
                          <TableCell className="pl-6">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                                palette.color
                              )}
                            >
                              {ct.label}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {ct.label}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground">
                              {ct.id}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "size-4 rounded-full border",
                                  palette.swatch
                                )}
                              />
                              <span className="text-xs">{palette.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {ct.sortOrder}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEdit(ct.id)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteId(ct.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AutoAssignProfilesPanel />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            Administrators
          </CardTitle>
          <CardDescription>
            Manage who has admin access, or grant admin rights to another user.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <Button variant="outline" asChild>
            <Link href="/admin/admins">
              <ShieldCheck className="size-4" />
              Manage Admins
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:hidden">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Sign out of your administrator account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" />
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Class Type" : "Add Class Type"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update the label, color, or sort order. The id cannot be changed."
                : "Create a new class type. The id is auto-generated from the label."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. HP Speed"
              />
            </div>
            <div className="space-y-2">
              <Label>Id (slug)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="auto-generated"
                disabled={!!editId}
              />
              {!editId && (
                <p className="text-xs text-muted-foreground">
                  Used internally on sessions. Lowercase letters, numbers, and dashes only.
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={colorKey} onValueChange={setColorKey}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paletteOptions.map(([key, entry]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-3 w-3 rounded-full border",
                              entry.swatch
                            )}
                          />
                          {entry.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="rounded border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <span
                className={cn(
                  "inline-flex items-center rounded border px-2 py-1 text-xs font-medium",
                  getPaletteEntry(colorKey).color
                )}
              >
                {label.trim() || "Class type label"}
              </span>
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
            <DialogTitle>Delete class type?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-foreground">
                    {deleteTarget.label}
                  </span>{" "}
                  will be removed. Any sessions currently using this class type will have their class type cleared.
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
    </div>
  );
}
