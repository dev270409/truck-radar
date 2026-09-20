import { db } from "./db";

export interface ParkingAreaRow {
  id: string;
  companyId: string;
  name: string;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  security: boolean;
  illuminated: boolean;
  restaurant: boolean;
  showers: boolean;
  wifi: boolean;
  createdAt: Date;
}

export interface ParkingFeedbackRow {
  id: string;
  parkingAreaId: string;
  companyId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface NewParkingArea {
  name: string;
  address: string;
  city?: string | null;
  security: boolean;
  illuminated: boolean;
  restaurant: boolean;
  showers: boolean;
  wifi: boolean;
}

export async function createParkingArea(companyId: string, data: NewParkingArea): Promise<ParkingAreaRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "ParkingArea"
       ("companyId", name, address, city, security, illuminated, restaurant, showers, wifi)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    companyId,
    data.name,
    data.address,
    data.city ?? null,
    Boolean(data.security),
    Boolean(data.illuminated),
    Boolean(data.restaurant),
    Boolean(data.showers),
    Boolean(data.wifi)
  )) as ParkingAreaRow[];
  return rows[0];
}

export async function updateParkingArea(companyId: string, id: string, data: Partial<NewParkingArea>): Promise<ParkingAreaRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "ParkingArea" SET
       name = COALESCE($2, name),
       address = COALESCE($3, address),
       city = COALESCE($4, city),
       security = COALESCE($5, security),
       illuminated = COALESCE($6, illuminated),
       restaurant = COALESCE($7, restaurant),
       showers = COALESCE($8, showers),
       wifi = COALESCE($9, wifi)
     WHERE id = $1 AND "companyId" = $10
     RETURNING *`,
    id,
    data.name ?? null,
    data.address ?? null,
    data.city ?? null,
    data.security ?? null,
    data.illuminated ?? null,
    data.restaurant ?? null,
    data.showers ?? null,
    data.wifi ?? null,
    companyId
  )) as ParkingAreaRow[];
  return rows[0] ?? null;
}

export async function deleteParkingArea(companyId: string, id: string): Promise<boolean> {
  const rows = (await db.$executeRawUnsafe(
    `DELETE FROM "ParkingArea" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return rows > 0;
}

export async function addParkingFeedback(companyId: string, parkingAreaId: string, rating: number, comment?: string): Promise<ParkingFeedbackRow | null> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Valutazione 1..5.");
  }
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "ParkingFeedback" ("parkingAreaId", "companyId", rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("parkingAreaId", "companyId") DO NOTHING
     RETURNING *`,
    parkingAreaId,
    companyId,
    rating,
    comment ?? null
  )) as ParkingFeedbackRow[];
  return rows[0] ?? null;
}

export async function listParking(
  currentCompanyId?: string
): Promise<
  Array<ParkingAreaRow & { ratingAvg: number; feedbackCount: number; myRating: number | null }>
> {
  const areas = (await db.$queryRawUnsafe(
    `SELECT * FROM "ParkingArea" ORDER BY "createdAt" DESC`
  )) as ParkingAreaRow[];

  const ratings = (await db.$queryRawUnsafe(
    `SELECT "parkingAreaId", AVG(rating)::numeric(3,1) AS avg, COUNT(*)::int AS n
     FROM "ParkingFeedback" GROUP BY "parkingAreaId"`
  )) as Array<{ parkingAreaId: string; avg: number; n: number }>;

  const ratingMap = new Map(ratings.map((r) => [r.parkingAreaId, r]));

  const myRatings = currentCompanyId
    ? ((await db.$queryRawUnsafe(
        `SELECT "parkingAreaId", rating FROM "ParkingFeedback" WHERE "companyId" = $1`,
        currentCompanyId
      )) as Array<{ parkingAreaId: string; rating: number }>)
    : [];
  const myMap = new Map(myRatings.map((r) => [r.parkingAreaId, r.rating]));

  return areas.map((a) => ({
    ...a,
    ratingAvg: Number(ratingMap.get(a.id)?.avg ?? 0),
    feedbackCount: Number(ratingMap.get(a.id)?.n ?? 0),
    myRating: myMap.get(a.id) ?? null,
  }));
}