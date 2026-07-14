import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "brand" | "success" | "warning" | "danger";

const TONE: Record<
  Tone,
  { icon: string; iconWrap: string; value: string }
> = {
  default: {
    icon: "text-muted-foreground",
    iconWrap: "bg-muted",
    value: "text-foreground",
  },
  brand: {
    icon: "text-primary",
    iconWrap: "bg-primary/10",
    value: "text-foreground",
  },
  success: {
    icon: "text-emerald-600",
    iconWrap: "bg-emerald-500/10",
    value: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: "text-amber-600",
    iconWrap: "bg-amber-500/10",
    value: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    icon: "text-red-600",
    iconWrap: "bg-red-500/10",
    value: "text-red-600 dark:text-red-400",
  },
};

export function StatCard({
  label,
  value,
  sub,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden p-3 shadow-sm transition-shadow hover:shadow-md sm:p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:text-[13px]">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8",
              t.iconWrap
            )}
          >
            <Icon className={cn("size-3.5 sm:size-4", t.icon)} />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5 sm:mt-2">
        <span className={cn("text-xl font-bold tabular-nums sm:text-2xl lg:text-3xl", t.value)}>
          {value}
        </span>
        {sub && (
          <span className="text-sm font-medium text-muted-foreground">{sub}</span>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </Card>
  );
}
