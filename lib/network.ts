import { db } from "./db";
import { getVerifiedCompanyIds } from "./marketplace";
import { reputationOf } from "./reviews";
import { computeBadges } from "./badges";

export interface NetworkCompany {
  companyId: string;
  name: string;
  partitaIva: string;
  indirizzo: string | null;
  vehicles: number;
  drivers: number;
  reputation: number;
  reviewsCount: number;
  badges: string[];
  isMine: boolean;
}

export async function getNetworkDirectory(currentCompanyId: string): Promise<NetworkCompany[]> {
  const verified = await getVerifiedCompanyIds();

  const companies = await db.company.findMany({
    select: { id: true, ragioneSociale: true, partitaIva: true, indirizzo: true },
  });
  const companyIds = companies.map((c) => c.id);

  const vehicles = await db.vehicle.groupBy({ by: ["companyId"], _count: { _all: true } });
  const vehMap = new Map(vehicles.map((v) => [v.companyId, v._count._all]));
  const drivers = await db.user.groupBy({ by: ["companyId"], where: { role: "AUTISTA", isActive: true }, _count: { _all: true } });
  const drvMap = new Map(drivers.map((d) => [d.companyId, d._count._all]));

  const out: NetworkCompany[] = [];
  for (const c of companies) {
    if (!verified.has(c.id)) continue;
    const rep = await reputationOf(c.id);
    const badgeRows = await computeBadges(c.id);
    out.push({
      companyId: c.id,
      name: c.ragioneSociale,
      partitaIva: c.partitaIva,
      indirizzo: c.indirizzo ?? null,
      vehicles: vehMap.get(c.id) ?? 0,
      drivers: drvMap.get(c.id) ?? 0,
      reputation: rep.avg,
      reviewsCount: rep.count,
      badges: badgeRows.filter((b) => b.earnedAt).map((b) => b.code),
      isMine: c.id === currentCompanyId,
    });
  }

  out.sort((a, b) => {
    if (a.isMine) return -1;
    if (b.isMine) return 1;
    return b.reputation - a.reputation;
  });
  return out;
}