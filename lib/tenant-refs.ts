import { db } from "./db";

export async function vehicleBelongsToCompany(companyId: string, vehicleId: string): Promise<boolean> {
  const row = await db.vehicle.findFirst({
    where: { id: vehicleId, companyId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function tripBelongsToCompany(companyId: string, tripId: string): Promise<boolean> {
  const row = await db.trip.findFirst({
    where: { id: tripId, companyId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function userBelongsToCompany(companyId: string, userId: string): Promise<boolean> {
  const row = await db.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function fuelTankBelongsToCompany(companyId: string, tankId: string): Promise<boolean> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT id FROM "FuelTank" WHERE id = $1 AND "companyId" = $2 LIMIT 1`,
    tankId,
    companyId
  )) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function customerBelongsToCompany(companyId: string, customerId: string): Promise<boolean> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT id FROM "Customer" WHERE id = $1 AND "companyId" = $2 LIMIT 1`,
    customerId,
    companyId
  )) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function quoteBelongsToCompany(companyId: string, quoteId: string): Promise<boolean> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT id FROM "Quote" WHERE id = $1 AND "companyId" = $2 LIMIT 1`,
    quoteId,
    companyId
  )) as Array<{ id: string }>;
  return rows.length > 0;
}
