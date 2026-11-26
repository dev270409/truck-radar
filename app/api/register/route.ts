import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { safeLog } from "@/lib/safe-log";

const TAX_ID_REGEX = /^\d{11}$|^[A-Z0-9]{16}$/;

export async function POST(req: Request) {
  try {
    const rl = rateLimit(rateLimitKeyFromRequest(req, "register"), 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Troppe registrazioni. Riprova tra qualche minuto." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }
    const {
      ragioneSociale,
      partitaIva,
      indirizzo,
      telefono,
      email,
      password,
      nome,
      cognome,
      plan: requestedPlan,
    } = body as Record<string, unknown>;

    if (requestedPlan !== undefined && requestedPlan !== "BASE" && requestedPlan !== "PRO") {
      return NextResponse.json({ error: "Il piano selezionato non è valido." }, { status: 400 });
    }
    const subscriptionPlan = requestedPlan === "PRO" ? "PRO" : "BASE";

    if (!ragioneSociale || !partitaIva || !email || !password || !nome || !cognome) {
      return NextResponse.json(
        { error: "Compila tutti i campi obbligatori dell'azienda e dell'amministratore." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanTaxId = String(partitaIva).replace(/\s/g, "").toUpperCase();
    const passwordText = String(password);
    const companyName = String(ragioneSociale).trim();
    const address = String(indirizzo ?? "").trim();
    const phone = String(telefono ?? "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Email non valida." }, { status: 400 });
    }
    if (!TAX_ID_REGEX.test(cleanTaxId)) {
      return NextResponse.json(
        { error: "Inserisci una Partita IVA (11 cifre) o un Codice Fiscale (16 caratteri)." },
        { status: 400 }
      );
    }
    if (passwordText.length < 8 || passwordText.length > 72) {
      return NextResponse.json({ error: "La password deve avere tra 8 e 72 caratteri." }, { status: 400 });
    }
    if (!companyName || !address || !phone) {
      return NextResponse.json({ error: "Sede legale e telefono sono obbligatori." }, { status: 400 });
    }

    const existingCompany = await db.company.findUnique({
      where: { partitaIva: cleanTaxId },
    });
    if (existingCompany) {
      return NextResponse.json(
        { error: "Un'azienda con questa Partita IVA o Codice Fiscale risulta già registrata." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Un utente con questa email risulta già registrato." },
        { status: 400 }
      );
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 21);
    const hashedPassword = await hashPassword(passwordText);

    const result = await db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          ragioneSociale: companyName,
          partitaIva: cleanTaxId,
          indirizzo: address,
          telefono: phone,
          subscriptionStatus: "TRIAL",
          subscriptionPlan,
          trialEndsAt,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash: hashedPassword,
          nome: String(nome).trim(),
          cognome: String(cognome).trim(),
          telefono: phone,
          role: "ADMIN",
          companyId: company.id,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          companyId: company.id,
          action: "COMPANY_REGISTERED_TRIAL",
          entity: "Company",
          entityId: company.id,
          payload: { ragioneSociale: companyName, email: cleanEmail, trialEndsAt },
        },
      });

      return { company, adminUser };
    }, { timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: "Account creato. Prova gratuita di 21 giorni attiva.",
      companyId: result.company.id,
      email: result.adminUser.email,
      subscriptionPlan: result.company.subscriptionPlan,
      trialEndsAt: result.company.trialEndsAt,
    });
  } catch (error) {
    safeLog("error", "Registration failed", {
      message: error instanceof Error ? error.message : "errore",
    });
    return NextResponse.json(
      { error: "Errore durante la registrazione. Riprova tra qualche istante." },
      { status: 500 }
    );
  }
}
