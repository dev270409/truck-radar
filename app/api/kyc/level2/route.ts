import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { KycDocType } from "@prisma/client";

const requiredLevel2Types: KycDocType[] = [
  "LICENZA_CONTO_TERZI",
  "ALBO_TRASPORTATORI",
  "LICENZA_REN",
  "POLIZZA_ASSICURATIVA_CMR",
  "DURC",
  "DELEGA_POTERI_FIRMA",
];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo l'Admin può gestire i documenti KYC di Livello 2." }, { status: 403 });
    }

    const body = await req.json();
    const { kycFiles } = body; // Array of { tipo: string, fileUrl: string, fileName: string }

    if (!Array.isArray(kycFiles) || kycFiles.length === 0) {
      return NextResponse.json({ error: "Nessun documento fornito." }, { status: 400 });
    }

    // Validate that at least the core Level 2 docs are provided
    const providedTypes = kycFiles.map((f: any) => f.tipo);
    const missingCore = ["LICENZA_CONTO_TERZI", "ALBO_TRASPORTATORI", "LICENZA_REN", "POLIZZA_ASSICURATIVA_CMR", "DURC"]
      .filter(t => !providedTypes.includes(t));
    
    if (missingCore.length > 0) {
      return NextResponse.json({ 
        error: `Mancano documenti core Livello 2: ${missingCore.join(", ")}` 
      }, { status: 400 });
    }

    const tenantDb = getTenantDb(session.user.companyId);

    // Check if company already has Level 2 docs
    const existingLevel2 = await tenantDb.kycDocuments.findMany({
      where: { tipo: { in: requiredLevel2Types } }
    });

    // Upsert each document
    for (const file of kycFiles) {
      if (!requiredLevel2Types.includes(file.tipo as any)) continue;
      
      const existing = existingLevel2.find(e => e.tipo === file.tipo);
      if (existing) {
        await tenantDb.kycDocuments.update({
          where: { id: existing.id },
          data: {
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            status: "IN_ATTESA",
            updatedAt: new Date()
          }
        });
      } else {
        await tenantDb.kycDocuments.create({
          data: {
            companyId: session.user.companyId,
            tipo: file.tipo as KycDocType,
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            status: "IN_ATTESA",
          }
        });
      }
    }

    // Check if all Level 2 docs are now present
    const allLevel2 = await tenantDb.kycDocuments.findMany({
      where: { tipo: { in: requiredLevel2Types } }
    });
    const hasAllLevel2 = requiredLevel2Types.every(t => allLevel2.some(d => d.tipo === t));

    return NextResponse.json({
      success: true,
      message: "Documenti Livello 2 caricati con successo",
      hasAllLevel2,
      level2Count: allLevel2.length
    });

  } catch (error: any) {
    console.error("Level 2 KYC upload error:", error);
    return NextResponse.json(
      { error: "Errore durante il caricamento documenti Livello 2: " + (error.message || "Errore del server") },
      { status: 500 }
    );
  }
}