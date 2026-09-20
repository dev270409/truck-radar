import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeBadges } from "@/lib/badges";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const badges = await computeBadges(session.user.companyId);
  const earned = badges.filter((b) => b.earnedAt);

  return NextResponse.json({ badges, earned: earned.length, earnedAt: earned.map((b) => b.code) });
}