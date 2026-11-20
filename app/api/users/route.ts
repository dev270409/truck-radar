import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/tenant";
import { hashPassword } from "@/lib/hash";
import { getPlanLimits } from "@/lib/plans";
import { requireFeature } from "@/lib/api-guard";
import { resolvePermissions, sanitizePermissions } from "@/lib/permissions";

export async function GET() {
  const guard = await requireFeature("drivers");
  if (guard.error) return guard.error;
  const session = guard.session;

  const tenantDb = getTenantDb(session.user.companyId);
  const users = await tenantDb.users.findMany({
    select: {
      id: true,
      email: true,
      nome: true,
      cognome: true,
      telefono: true,
      role: true,
      permissions: true,
      isActive: true,
      vehicleId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      permissions: resolvePermissions(user.role, user.permissions),
    })),
  });
}

export async function POST(req: Request) {
  const guard = await requireFeature("users");
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await req.json();
    const { email, password, nome, cognome, telefono, role, vehicleId } = body;

    if (!email || !password || !nome || !cognome || !role) {
      return NextResponse.json(
        { error: "Tutti i campi obbligatori (email, password, nome, cognome, ruolo) devono essere presenti." },
        { status: 400 }
      );
    }

    if (role !== "AUTISTA" && role !== "UFFICIO") {
      return NextResponse.json(
        { error: "Ruolo non valido: sono ammessi AUTISTA e UFFICIO." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const tenantDb = getTenantDb(session.user.companyId);
    const customPermissions = sanitizePermissions(body.permissions);

    if (role === "AUTISTA") {
      const company = await tenantDb.getCompany();
      const limit = getPlanLimits(company?.subscriptionPlan).driverLimit;
      const autistiCount = await tenantDb.users.findMany({
        where: { role: "AUTISTA" },
        select: { id: true },
      });
      if (autistiCount.length >= limit) {
        return NextResponse.json(
          {
            error: `Limite piano raggiunto: il tuo piano consente massimo ${limit} autisti. Abbonati a un piano superiore per gestire squadre più grandi.`,
          },
          { status: 403 }
        );
      }
    }

    // Check existing email
    const existing = await tenantDb.users.findFirst({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Un utente con questa email esiste già nella tua azienda." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await tenantDb.users.create({
      data: {
        email: cleanEmail,
        passwordHash,
        nome,
        cognome,
        telefono,
        role,
        permissions: Object.keys(customPermissions).length > 0 ? customPermissions : undefined,
        vehicleId: role === "AUTISTA" ? vehicleId || null : null,
      },
    });

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        nome: newUser.nome,
        cognome: newUser.cognome,
        role: newUser.role,
        permissions: resolvePermissions(newUser.role, newUser.permissions),
        vehicleId: newUser.vehicleId,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore del server" }, { status: 500 });
  }
}
