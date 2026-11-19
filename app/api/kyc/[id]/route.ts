import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "La verifica KYC è gestita dal provider identità. Completa la verifica in /onboarding/verifica.",
    },
    { status: 403 }
  );
}
