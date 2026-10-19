/**
 * Role-based access control. Pure data and helpers, safe to import anywhere.
 *
 * Two layers:
 *  - Platform: Neon Auth user.role. "admin" = Acadify super admin (the /admin console).
 *  - Institute: institute_members.role. What someone can do inside their institute (/dashboard).
 */

export type PlatformRole = "admin" | "user";
export type InstituteRole = "principal" | "institute_admin" | "accountant" | "teacher" | "student" | "guardian";

export const INSTITUTE_ROLES: InstituteRole[] = ["principal", "institute_admin", "accountant", "teacher", "student", "guardian"];

export const ROLE_LABELS: Record<InstituteRole, string> = {
  principal: "Principal",
  institute_admin: "Institute Admin",
  accountant: "Accountant",
  teacher: "Teacher / Ustad",
  student: "Student",
  guardian: "Guardian",
};

/** In a madrasah the head is called Muhtamim; everywhere else, Principal. */
const MADRASAH_TYPES = new Set(["qawmi", "alia", "hifz"]);

/** The role's name as this institute calls it. */
export const roleLabel = (role: InstituteRole, instituteType?: string) =>
  role === "principal" && instituteType && MADRASAH_TYPES.has(instituteType) ? "Muhtamim" : ROLE_LABELS[role];

export const PERMISSIONS = [
  // Platform (super admin only)
  "platform:manage",
  // Institute
  "institute:settings",
  "members:manage",
  "students:read",
  "students:write",
  "attendance:read",
  "attendance:write",
  "sms:send",
  "fees:read",
  "fees:collect",
  "fees:manage",
  "exams:read",
  "exams:write",
  "hifz:read",
  "hifz:write",
  "boarding:read",
  "boarding:write",
  "sheets:read",
  "sheets:write",
  "reports:read",
  "self:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const STAFF_READ: Permission[] = ["students:read", "attendance:read", "exams:read", "hifz:read", "sheets:read", "boarding:read"];

export const ROLE_PERMISSIONS: Record<InstituteRole, Permission[]> = {
  principal: PERMISSIONS.filter((p) => p !== "platform:manage"),
  institute_admin: [
    "institute:settings",
    "members:manage",
    ...STAFF_READ,
    "students:write",
    "boarding:write",
    "attendance:write",
    "sms:send",
    "fees:read",
    "fees:manage",
    "exams:write",
    "sheets:write",
    "reports:read",
  ],
  accountant: ["students:read", "fees:read", "fees:collect", "fees:manage", "reports:read", "sms:send"],
  teacher: [...STAFF_READ, "attendance:write", "exams:write", "hifz:write", "boarding:write", "sheets:write"],
  student: ["self:read"],
  guardian: ["self:read"],
};

export function can(role: InstituteRole | null | undefined, permission: Permission) {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

export const isSuperAdmin = (platformRole: string | null | undefined) => platformRole === "admin";

/** Institute roles that run the institute; like super admins, they confirm an emailed code at every sign-in. */
export const ADMIN_ROLES: InstituteRole[] = ["principal", "institute_admin"];

export const needsAdminCode = (platformRole: string | null | undefined, roles: InstituteRole[]) =>
  isSuperAdmin(platformRole) || roles.some((r) => ADMIN_ROLES.includes(r));

/** Roles each role may give (and take away) from the dashboard. Principals are added by Acadify. */
export const STAFF_ROLES_GRANTABLE: Partial<Record<InstituteRole, InstituteRole[]>> = {
  principal: ["institute_admin", "accountant", "teacher"],
  institute_admin: ["accountant", "teacher"],
};
