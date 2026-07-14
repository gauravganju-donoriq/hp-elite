import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { AvailabilityStatus } from "@/lib/types";

export interface AvailabilityStatusConfig {
  label: string;
  /** Short label used in dense contexts (grids, chips). */
  shortLabel: string;
  description: string;
  Icon: LucideIcon;
  /** Solid selected/active button styling. */
  btnClass: string;
  /** Softer tinted styling for unselected affordances. */
  btnTint: string;
  /** Calendar/list cell background wash. */
  cellBg: string;
  /** Legend / status dot. */
  dot: string;
  /** Pill / badge styling. */
  badgeClass: string;
  /** Accent used for solid indicators. */
  solid: string;
}

export const AVAILABILITY_STATUS: Record<
  AvailabilityStatus,
  AvailabilityStatusConfig
> = {
  available: {
    label: "Available",
    shortLabel: "Yes",
    description: "I can work this session",
    Icon: CheckCircle2,
    btnClass:
      "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    btnTint:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    cellBg: "bg-emerald-50 dark:bg-emerald-950/30",
    dot: "bg-emerald-500",
    badgeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
    solid: "text-emerald-600",
  },
  unavailable: {
    label: "Unavailable",
    shortLabel: "No",
    description: "I cannot work this session",
    Icon: XCircle,
    btnClass:
      "border-red-500 bg-red-500 text-white hover:bg-red-600 shadow-sm",
    btnTint:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    cellBg: "bg-red-50 dark:bg-red-950/30",
    dot: "bg-red-500",
    badgeClass:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
    solid: "text-red-600",
  },
  maybe: {
    label: "Maybe",
    shortLabel: "Maybe",
    description: "I might be able to work",
    Icon: HelpCircle,
    btnClass:
      "border-amber-500 bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
    btnTint:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    cellBg: "bg-amber-50 dark:bg-amber-950/30",
    dot: "bg-amber-500",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    solid: "text-amber-600",
  },
  pending: {
    label: "Not set",
    shortLabel: "—",
    description: "You haven't responded yet",
    Icon: Clock,
    btnClass:
      "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200",
    btnTint:
      "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
    cellBg: "",
    dot: "bg-slate-300",
    badgeClass:
      "bg-muted text-muted-foreground border-border",
    solid: "text-muted-foreground",
  },
};

export function StatusIcon({
  status,
  className,
}: {
  status: AvailabilityStatus;
  className?: string;
}) {
  const Icon = AVAILABILITY_STATUS[status].Icon;
  return <Icon className={className} />;
}
