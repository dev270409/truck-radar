import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { safeLog } from "@/lib/safe-log";

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
    const {
      // Step A: Company
      ragioneSociale,
      partitaIva,
      indirizzo,
      telefono,

      // Step B: Admin User
      email,
      password,
      nome,
      cognome,

      // Step C: KYC Files
      kycFiles, // Array of { tipo: 'PARTITA_IVA'|'LICENZA_CONTO_TERZI'|'ALBO_TRASPORTATORI', fileUrl: string, fileName: string }
    } = body;

    // Validation
    if (!ragioneSociale || !partitaIva || !email || !password || !nome || !cognome) {
      return NextResponse.json(
        { error: "Tutti i campi obbligatori dell'azienda e dell'admin devono essere compilati." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPiva = String(partitaIva).trim();
    // Livello 1 (SaaS Interno): PARTITA_IVA + DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE
    // Livello 2 (Borsa Carichi): LICENZA_CONTO_TERZI + ALBO_TRASPORTATORI + LICENZA_REN + POLIZZA_ASSICURATIVA_CMR + DURC + DELEGA_POTERI_FIRMA
    const requiredKycTypesLevel1 = ["PARTITA_IVA", "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE"];
    if (!Array.isArray(kycFiles) || requiredKycTypesLevel1.some((tipo) => !kycFiles.some((file: { tipo?: string; fileUrl?: string }) => file.tipo === tipo && file.fileUrl))) {
      return NextResponse.json({ error: "Carica i documenti KYC di Livello 1 (Partita IVA + Documento identità legale rappresentante) tramite il flusso protetto." }, { status: 400 });
    }

    // Check if email or partitaIva already exists
    const existingCompany = await db.company.findUnique({
      where: { partitaIva: cleanPiva },
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: "Un'azienda con questa Partita IVA risulta già registrata." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utente con questa email risulta già registrato." },
        { status: 400 }
      );
    }

    // 30 days trial date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const hashedPassword = await hashPassword(password);

    // Create Company, Admin User and KYC Documents in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create Company with TRIAL status
      const company = await tx.company.create({
        data: {
          ragioneSociale,
          partitaIva: cleanPiva,
          indirizzo,
          telefono,
          subscriptionStatus: "TRIAL",
          subscriptionPlan: "BASE",
          trialEndsAt,
        },
      });

      // 2. Create Admin User
      const adminUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash: hashedPassword,
          nome,
          cognome,
          telefono,
          role: "ADMIN",
          companyId: company.id,
          isActive: true,
        },
      });

      // 3. Create initial KYC Documents (Livello 1 - SaaS Interno)
      const level1Docs = [
        { tipo: "PARTITA_IVA" as const, name: "Certificato Partita IVA" },
        { tipo: "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE" as const, name: "Documento Identità Legale Rappresentante" },
      ];

      const kycRecordsToCreate = level1Docs.map((docDef) => {
        const provided = (kycFiles || []).find((f: any) => f.tipo === docDef.tipo);
        return {
          companyId: company.id,
          tipo: docDef.tipo,
          fileUrl: provided.fileUrl,
          fileName: provided.fileName || `${docDef.name}.pdf`,
          status: "IN_ATTESA" as const,
        };
      });

      await tx.kycDocument.createMany({
        data: kycRecordsToCreate,
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          companyId: company.id,
          action: "COMPANY_REGISTERED",
          entity: "Company",
          entityId: company.id,
          payload: { ragioneSociale, email: cleanEmail, trialEndsAt },
        },
      });

      return { company, adminUser };
    });

    return NextResponse.json({
      success: true,
      message: "Registrazione completata con successo! Account in periodo di prova (30 giorni).",
      companyId: result.company.id,
      email: result.adminUser.email,
    });
  } catch (error: any) {
    safeLog("error", "Registration failed", { message: error?.message });
    return NextResponse.json(
      { error: "Errore durante la registrazione: " + (error.message || "Errore del server") },
      { status: 500 }
    );
  }
}
