import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "AUTISTA") {
    return { error: NextResponse.json({ error: "Ruolo non attivo." }, { status: 403 }) } as const;
  }
  return { session } as const;
}

export function requireAdmin(role?: string | null) {
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }
  return null;
}
