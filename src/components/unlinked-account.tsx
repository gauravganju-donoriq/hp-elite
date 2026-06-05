"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStaffIdentity } from "@/lib/staff-context";
import { AlertCircle } from "lucide-react";

export function UnlinkedAccount() {
  const { userEmail, clearIdentity } = useStaffIdentity();
  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-md w-full border-yellow-200 bg-yellow-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Account not linked yet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You&apos;re signed in
            {userEmail ? (
              <>
                {" "}
                as <span className="font-medium">{userEmail}</span>
              </>
            ) : null}
            , but your account isn&apos;t linked to a staff profile yet.
          </p>
          <p>
            Please ask an admin to link your account in <em>Staff Roster</em>.
            Once linked, refresh this page.
          </p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={clearIdentity}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
