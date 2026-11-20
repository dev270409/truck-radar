import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPermissionsForUser } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permissions-catalog";

const SESSION_ROLES = new Set(["ADMIN", "AUTISTA"]);
const FEATURE_ROLES = new Set(["ADMIN", "UFFICIO", "AUTISTA"]);

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) } as const;
  }
  if (!SESSION_ROLES.has(session.user.role)) {
    return { error: NextResponse.json({ error: "Ruolo non attivo." }, { status: 403 }) } as const;
  }
  return { session } as const;
}

export async function requireFeature(feature: PermissionKey) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) } as const;
  }
  if (!FEATURE_ROLES.has(session.user.role)) {
    return { error: NextResponse.json({ error: "Ruolo non attivo." }, { status: 403 }) } as const;
  }
  const access = await getPermissionsForUser(
    session.user.companyId,
    session.user.id
  );
  if (!access || !access.permissions[feature]) {
    return {
      error: NextResponse.json(
        { error: "Non hai i permessi per questa operazione." },
        { status: 403 }
      ),
    } as const;
  }
  return { session, permissions: access.permissions } as const;
}

export function requireAdmin(role?: string | null) {
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }
  return null;
}
