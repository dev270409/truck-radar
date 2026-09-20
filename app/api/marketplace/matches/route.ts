import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findReturnMatches } from "@/lib/marketplace";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const luogoRitiro = String(url.searchParams.get("origine") ?? "").trim();
  const luogoConsegna = String(url.searchParams.get("destinazione") ?? "").trim();
  const dataRitiro = String(url.searchParams.get("dataRitiro") ?? "");
  const vehicleCategory = String(url.searchParams.get("categoria") ?? "").toUpperCase() || null;

  if (!luogoRitiro || !luogoConsegna) {
    return NextResponse.json({ error: "origine e destinazione obbligatorie." }, { status: 400 });
  }

  const matches = await findReturnMatches(session.user.companyId, {
    luogoRitiro,
    luogoConsegna,
    dataRitiro: dataRitiro ? new Date(dataRitiro) : new Date(),
    vehicleCategory,
  });

  return NextResponse.json({ matches });
}