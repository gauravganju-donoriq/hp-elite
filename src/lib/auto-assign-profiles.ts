import type { AutoAssignRule, StaffRole } from "./types";

export const STAFF_ROLES: StaffRole[] = ["lead", "experience", "junior", "trial"];

export const ROLE_LABELS: Record<StaffRole, string> = {
  lead: "Lead",
  experience: "Experience",
  junior: "Junior",
  trial: "Trial",
};

function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as string[]).includes(value);
}

// Validates and normalizes a raw plan payload into a clean AutoAssignRule[].
// Returns null when the shape is invalid so callers can reject the request.
export function validatePlan(value: unknown): AutoAssignRule[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const plan: AutoAssignRule[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const rule = raw as Record<string, unknown>;

    if (!Array.isArray(rule.roles) || rule.roles.length === 0) return null;
    const roles: StaffRole[] = [];
    for (const r of rule.roles) {
      if (!isStaffRole(r)) return null;
      if (!roles.includes(r)) roles.push(r);
    }

    let max: number | undefined;
    if (rule.max !== undefined && rule.max !== null) {
      if (typeof rule.max !== "number" || !Number.isFinite(rule.max) || rule.max < 1) {
        return null;
      }
      max = Math.floor(rule.max);
    }

    if (typeof rule.preferSeniorFirst !== "boolean") return null;

    plan.push({ roles, max, preferSeniorFirst: rule.preferSeniorFirst });
  }
  return plan;
}

// Human-readable one-line summary of a plan, e.g. for tables/pickers.
export function describePlan(plan: AutoAssignRule[]): string {
  if (plan.length === 0) return "No rules";
  return plan
    .map((rule) => {
      const roles = rule.roles.map((r) => ROLE_LABELS[r]).join("/");
      const cap = rule.max ? ` (max ${rule.max})` : "";
      const order = rule.preferSeniorFirst ? "senior" : "junior";
      return `${roles}${cap} \u2014 ${order} first`;
    })
    .join("; ");
}
