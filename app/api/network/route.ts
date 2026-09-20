import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNetworkDirectory } from "@/lib/network";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const directory = await getNetworkDirectory(session.user.companyId);
  return NextResponse.json({ directory });
}