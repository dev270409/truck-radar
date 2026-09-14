import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/hash";

export async function POST(req: Request) {
  try {
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

      // 3. Create initial 3 KYC Documents
      const defaultDocs = [
        { tipo: "PARTITA_IVA" as const, name: "Certificato Partita IVA" },
        { tipo: "LICENZA_CONTO_TERZI" as const, name: "Licenza Trasporto Conto Terzi" },
        { tipo: "ALBO_TRASPORTATORI" as const, name: "Iscrizione Albo Autotrasportatori" },
      ];

      const kycRecordsToCreate = defaultDocs.map((docDef) => {
        const provided = (kycFiles || []).find((f: any) => f.tipo === docDef.tipo);
        return {
          companyId: company.id,
          tipo: docDef.tipo,
          fileUrl: provided?.fileUrl || `https://storage.logiflow.it/kyc/demo-${docDef.tipo.toLowerCase()}.pdf`,
          fileName: provided?.fileName || `${docDef.name}.pdf`,
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Errore durante la registrazione: " + (error.message || "Errore del server") },
      { status: 500 }
    );
  }
}
