"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStaffIdentity } from "@/lib/staff-context";
import { AlertCircle, LogOut } from "lucide-react";

export function UnlinkedAccount() {
  const { userEmail, clearIdentity } = useStaffIdentity();
  return (
    <div className="flex items-center justify-center py-8 sm:py-16">
      <Card className="w-full max-w-md border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:py-8">
          <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 sm:size-12">
            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 sm:size-6" />
          </span>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Account not linked yet</h2>
            <p className="text-sm text-muted-foreground">
              You&apos;re signed in
              {userEmail ? (
                <>
                  {" "}
                  as <span className="font-medium text-foreground">{userEmail}</span>
                </>
              ) : null}
              , but your account isn&apos;t linked to a staff profile yet. Ask an
              admin to link you in <em>Staff Roster</em>, then refresh this page.
            </p>
          </div>
          <Button variant="outline" onClick={clearIdentity}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
