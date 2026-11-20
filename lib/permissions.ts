import { db } from "./db";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  resolvePermissions,
  type PermissionKey,
  type PermissionMap,
} from "./permissions-catalog";

export async function getPermissionsForUser(
  companyId: string,
  userId: string
): Promise<{ role: string; permissions: PermissionMap } | null> {
  const user = await db.user.findFirst({
    where: { id: userId, companyId },
    select: { role: true, permissions: true },
  });
  if (!user) return null;
  return {
    role: user.role,
    permissions: resolvePermissions(user.role, user.permissions),
  };
}

export function permissionsForRole(role: string | null | undefined): PermissionMap {
  return { ...(DEFAULT_ROLE_PERMISSIONS[role ?? ""] ?? resolvePermissions(role, null)) };
}

export function hasPermission(
  permissions: Partial<PermissionMap> | null | undefined,
  key: PermissionKey
): boolean {
  return Boolean(permissions?.[key]);
}

export function sanitizePermissions(input: unknown): Partial<PermissionMap> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Partial<PermissionMap> = {};
  for (const key of ALL_PERMISSION_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

export { resolvePermissions };
