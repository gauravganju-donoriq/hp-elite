import Image from "next/image";
import { CalendarCheck, Sparkles, Users } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-sidebar text-sidebar-foreground relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-brand-accent/20 blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center rounded-md bg-white px-3 py-1.5">
            <Image
              src="/hp-elite.png"
              alt="HP Elite & Beyond"
              width={180}
              height={48}
              priority
              className="h-9 w-auto"
            />
          </span>
        </div>
        <div className="relative space-y-6">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Staff scheduling for the academy, done right.
          </h2>
          <ul className="space-y-4 text-sm text-sidebar-foreground/80">
            <li className="flex items-center gap-3">
              <span className="bg-sidebar-accent flex size-9 items-center justify-center rounded-lg">
                <CalendarCheck className="size-4" />
              </span>
              Collect availability and publish schedules in minutes.
            </li>
            <li className="flex items-center gap-3">
              <span className="bg-sidebar-accent flex size-9 items-center justify-center rounded-lg">
                <Sparkles className="size-4" />
              </span>
              Auto-assign coaches with smart, role-aware profiles.
            </li>
            <li className="flex items-center gap-3">
              <span className="bg-sidebar-accent flex size-9 items-center justify-center rounded-lg">
                <Users className="size-4" />
              </span>
              Track hours and generate payroll-ready reports.
            </li>
          </ul>
        </div>
        <p className="text-sidebar-foreground/50 relative text-xs">
          &copy; {new Date().getFullYear()} HP Elite &amp; Beyond
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-4 sm:p-10">
        <div className="w-full max-w-sm space-y-4 sm:space-y-6">
          <div className="flex justify-center lg:hidden">
            <Image
              src="/hp-elite.png"
              alt="HP Elite & Beyond"
              width={160}
              height={42}
              priority
              className="h-8 w-auto"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
