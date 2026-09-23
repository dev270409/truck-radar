import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { hashPassword } from "@/lib/hash";
import { getPlanLimits } from "@/lib/plans";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const users = await tenantDb.users.findMany({
    select: {
      id: true,
      email: true,
      nome: true,
      cognome: true,
      telefono: true,
      role: true,
      isActive: true,
      vehicleId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Only ADMIN can create AUTISTA or COMMITTENTE users
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Accesso negato: solo gli amministratori possono creare nuovi utenti." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, password, nome, cognome, telefono, role, vehicleId } = body;

    if (!email || !password || !nome || !cognome || !role) {
      return NextResponse.json(
        { error: "Tutti i campi obbligatori (email, password, nome, cognome, ruolo) devono essere presenti." },
        { status: 400 }
      );
    }

    if (!["AUTISTA", "COMMITTENTE", "UFFICIO"].includes(role)) {
      return NextResponse.json(
        { error: "L'admin può creare unicamente utenti con ruolo AUTISTA, COMMITTENTE o UFFICIO." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const tenantDb = getTenantDb(session.user.companyId);

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
        vehicleId: newUser.vehicleId,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
