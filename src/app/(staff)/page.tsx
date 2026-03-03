"use client";

import { useRouter } from "next/navigation";
import { useStaffIdentity } from "@/lib/staff-context";
import { useScheduling } from "@/lib/context";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  "head-coach": "Head Coach",
  "assistant-coach": "Assistant Coach",
  volunteer: "Volunteer",
  intern: "Intern",
};

export default function StaffSelectPage() {
  const router = useRouter();
  const { identity, setIdentity } = useStaffIdentity();
  const { staff } = useScheduling();

  useEffect(() => {
    if (identity) {
      router.replace("/dashboard");
    }
  }, [identity, router]);

  if (identity) return null;

  const sortedStaff = [...staff].sort(
    (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  );

  function handleSelect(staffId: string) {
    setIdentity({ staffId });
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-3xl font-bold">
          <CalendarDays className="h-8 w-8" />
          HP Elite Staff Portal
        </div>
        <p className="text-muted-foreground">
          Select your name to view your schedule and submit availability.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Who are you?</CardTitle>
          <CardDescription>Choose your name from the roster.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {sortedStaff.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelect(member.id)}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className="font-medium">
                  {member.firstName} {member.lastName}
                </span>
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABELS[member.role] || member.role}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
