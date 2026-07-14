import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "brand" | "success" | "warning" | "danger";
type Columns = 2 | 3 | 4 | 5;

const GRID_COLUMNS: Record<Columns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
};

const TONE: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  brand: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function OverviewStats({
  columns = 3,
  className,
  ...props
}: React.ComponentProps<"div"> & { columns?: Columns }) {
  return (
    <div
      data-slot="overview-stats"
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border bg-border shadow-sm",
        GRID_COLUMNS[columns],
        className
      )}
      {...props}
    />
  );
}

export function OverviewStat({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  icon: LucideIcon;
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div
      data-slot="overview-stat"
      className={cn(
        "flex min-w-0 items-center gap-2 bg-card p-2.5 sm:gap-3 sm:p-5",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-10",
          TONE[tone]
        )}
      >
        <Icon className="size-3.5 sm:size-5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 sm:gap-x-2">
          <span className="text-base font-bold tabular-nums sm:text-xl lg:text-2xl">{value}</span>
          <span className="min-w-0 truncate text-xs font-medium sm:text-sm">{label}</span>
        </div>
        {detail && (
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
