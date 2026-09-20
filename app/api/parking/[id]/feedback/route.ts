import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addParkingFeedback } from "@/lib/parking";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  let body: { rating?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  if (!Number.isInteger(body.rating)) {
    return NextResponse.json({ error: "Valutazione 1..5 richiesta." }, { status: 400 });
  }

  let feedback;
  try {
    feedback = await addParkingFeedback(
      session.user.companyId,
      id,
      Number(body.rating),
      body.comment ? String(body.comment) : undefined
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!feedback) {
    return NextResponse.json({ error: "La tua azienda ha già valutato quest'area." }, { status: 409 });
  }
  return NextResponse.json({ feedback }, { status: 201 });
}