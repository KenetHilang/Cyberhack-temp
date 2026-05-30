import type { Role } from "./constants";
import type { SessionUser } from "./auth";

// Explicit capability matrix. Every privileged Server Action checks this,
// independent of any UI gating — single source of truth for "who can do what".
export const PERMISSIONS = {
  "intake:create": ["WAREHOUSE", "ADMIN"],
  "qc:inspect": ["QC", "ADMIN"],
  "qc:override": ["QC", "ADMIN"],
  "schedule:create": ["PPIC", "ADMIN"],
  "schedule:advance": ["PPIC", "ADMIN"],
  "lot:place": ["WAREHOUSE", "ADMIN"],
  "dispatch:create": ["DISPATCH", "ADMIN"],
  "user:manage": ["ADMIN"],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_LABELS: Record<Permission, string> = {
  "intake:create": "Record raw-material intake",
  "qc:inspect": "Run QC inspection",
  "qc:override": "Override AI QC verdict",
  "schedule:create": "Schedule production",
  "schedule:advance": "Advance production stage",
  "lot:place": "Place / move lots in warehouse",
  "dispatch:create": "Dispatch lot to customer",
  "user:manage": "Manage users & roles",
};

export function can(user: Pick<SessionUser, "role">, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(user.role);
}

export class AuthorizationError extends Error {
  constructor(permission: Permission, role: Role) {
    super(`Role ${role} is not permitted to ${permission}`);
    this.name = "AuthorizationError";
  }
}

export function assertCan(user: SessionUser, permission: Permission): void {
  if (!can(user, permission)) throw new AuthorizationError(permission, user.role);
}
