import { randomBytes } from "node:crypto";
import { db } from "./db";
import { hashPassword } from "./hash";
import { getPlanLimits } from "./plans";

export interface GeotabDriverItem {
  geotabDriverId: string;
  driverName: string;
  trips: number;
  lastTrip: Date | string | null;
  status: "COLLEGATO" | "ACCOUNT_ESISTENTE" | "DA_CREARE";
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  suggestedEmail: string;
}

export interface CreatedDriverCredential {
  geotabDriverId: string;
  driverName: string;
  userId: string;
  email: string;
  role: string;
  password: string | null;
  created: boolean;
}

export interface ConfirmDriversResult {
  created: CreatedDriverCredential[];
  linked: CreatedDriverCredential[];
  errors: string[];
  driversAssigned: number;
}

function normalizeName(value: string) {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])\S/g, (match) => match.toUpperCase())
    .trim();
}

function splitName(driverName: string) {
  const words = driverName.trim().split(/\s+/).filter(Boolean);
  const cognome = words.length > 1 ? words.pop() ?? "" : "";
  return { nome: titleCase(words.join(" ")), cognome: titleCase(cognome) };
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

async function uniqueAccessEmail(base: string) {
  const domain = "autisti.truck-radar.it";
  let attempt = 0;
  while (attempt < 50) {
    const local = attempt === 0 ? base : `${base}${attempt + 1}`;
    const email = `${local}@${domain}`;
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!existing) return email;
    attempt += 1;
  }
  return `${base}.${Date.now()}@${domain}`;
}

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (set: string) => set[randomBytes(1)[0] % set.length];
  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function listGeotabDrivers(companyId: string): Promise<GeotabDriverItem[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT "geotabDriverId", "driverName", count(*)::int AS trips, max("startAt") AS "lastTrip"
     FROM "GeotabTripSnapshot"
     WHERE "companyId" = $1 AND "driverName" IS NOT NULL AND "driverName" <> ''
     GROUP BY "geotabDriverId", "driverName"
     ORDER BY trips DESC`,
    companyId
  )) as Array<{
    geotabDriverId: string;
    driverName: string;
    trips: number;
    lastTrip: Date | string | null;
  }>;

  const links = (await db.$queryRawUnsafe(
    `SELECT l."geotabDriverId", l."userId", u.email, u."role"::text AS role
     FROM "GeotabDriverLink" l
     JOIN "User" u ON u.id = l."userId"
     WHERE l."companyId" = $1`,
    companyId
  )) as Array<{ geotabDriverId: string; userId: string; email: string; role: string }>;
  const linkById = new Map(links.map((link) => [link.geotabDriverId, link]));

  const users = await db.user.findMany({
    where: { companyId },
    select: { id: true, nome: true, cognome: true, email: true, role: true },
  });
  const userByName = new Map(
    users.map((user) => [normalizeName(`${user.nome} ${user.cognome}`), user])
  );

  return rows.map((row) => {
    const link = linkById.get(row.geotabDriverId);
    if (link) {
      return {
        ...row,
        status: "COLLEGATO",
        userId: link.userId,
        userEmail: link.email,
        userRole: link.role,
        suggestedEmail: link.email,
      };
    }
    const existing = userByName.get(normalizeName(row.driverName));
    if (existing) {
      return {
        ...row,
        status: "ACCOUNT_ESISTENTE",
        userId: existing.id,
        userEmail: existing.email,
        userRole: existing.role,
        suggestedEmail: existing.email,
      };
    }
    const { nome, cognome } = splitName(row.driverName);
    return {
      ...row,
      status: "DA_CREARE",
      userId: null,
      userEmail: null,
      userRole: null,
      suggestedEmail: `${slug(`${nome}.${cognome}`)}@autisti.truck-radar.it`,
    };
  });
}

export async function confirmGeotabDrivers(
  companyId: string,
  createdBy: string,
  geotabDriverIds: string[]
): Promise<ConfirmDriversResult> {
  const ids = [...new Set(geotabDriverIds)].filter(Boolean);
  const drivers = await listGeotabDrivers(companyId);
  const selected = drivers.filter((driver) => ids.includes(driver.geotabDriverId));
  const result: ConfirmDriversResult = { created: [], linked: [], errors: [], driversAssigned: 0 };
  if (selected.length === 0) {
    result.errors.push("Nessun autista Geotab selezionato.");
    return result;
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { subscriptionPlan: true },
  });
  const limit = getPlanLimits(company?.subscriptionPlan).driverLimit;
  const currentDrivers = await db.user.count({
    where: { companyId, role: "AUTISTA", isActive: true },
  });
  let createdCount = 0;

  for (const driver of selected) {
    try {
      if (driver.status === "COLLEGATO" || driver.status === "ACCOUNT_ESISTENTE") {
        if (driver.userId) {
          await db.$executeRawUnsafe(
            `INSERT INTO "GeotabDriverLink" ("companyId", "geotabDriverId", "driverName", "userId")
             VALUES ($1, $2, $3, $4)
             ON CONFLICT ("companyId", "geotabDriverId")
             DO UPDATE SET "userId" = EXCLUDED."userId", "driverName" = EXCLUDED."driverName"`,
            companyId,
            driver.geotabDriverId,
            driver.driverName,
            driver.userId
          );
          result.linked.push({
            geotabDriverId: driver.geotabDriverId,
            driverName: driver.driverName,
            userId: driver.userId,
            email: driver.userEmail ?? "",
            role: driver.userRole ?? "",
            password: null,
            created: false,
          });
        }
        continue;
      }

      if (currentDrivers + createdCount >= limit) {
        result.errors.push(
          `${driver.driverName}: limite piano raggiunto (${limit} autisti).`
        );
        continue;
      }

      const { nome, cognome } = splitName(driver.driverName);
      if (!nome) {
        result.errors.push(`${driver.driverName}: nome non valido.`);
        continue;
      }
      const base = slug(`${nome}.${cognome}`) || slug(driver.driverName) || "autista";
      const email = await uniqueAccessEmail(base);
      const password = generatePassword();
      const passwordHash = await hashPassword(password);

      const user = await db.user.create({
        data: {
          companyId,
          email,
          passwordHash,
          nome,
          cognome,
          role: "AUTISTA",
          isActive: true,
        },
      });
      await db.$executeRawUnsafe(
        `INSERT INTO "GeotabDriverLink" ("companyId", "geotabDriverId", "driverName", "userId")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("companyId", "geotabDriverId")
         DO UPDATE SET "userId" = EXCLUDED."userId", "driverName" = EXCLUDED."driverName"`,
        companyId,
        driver.geotabDriverId,
        driver.driverName,
        user.id
      );
      createdCount += 1;
      result.created.push({
        geotabDriverId: driver.geotabDriverId,
        driverName: driver.driverName,
        userId: user.id,
        email,
        role: "AUTISTA",
        password,
        created: true,
      });
    } catch (error) {
      result.errors.push(
        `${driver.driverName}: ${error instanceof Error ? error.message : "errore"}`
      );
    }
  }

  result.driversAssigned = await enrichDriversFromGeotab(companyId);

  await db.auditLog.create({
    data: {
      userId: createdBy,
      companyId,
      action: "GEOTAB_DRIVERS_CONFIRMED",
      entity: "GeotabDriverLink",
      entityId: ids.join(","),
      payload: {
        created: result.created.length,
        linked: result.linked.length,
        errors: result.errors.length,
        driversAssigned: result.driversAssigned,
      },
    },
  });

  return result;
}

/**
 * Dopo la creazione degli account, collega i viaggi già importati ai nuovi
 * autisti usando il nome conducente registrato da Geotab.
 */
export async function enrichDriversFromGeotab(companyId: string): Promise<number> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT m."tripId", s."driverName", t."dataRitiro"
     FROM "TripGeotabMatch" m
     JOIN "GeotabTripSnapshot" s
       ON s."companyId" = m."companyId" AND s."geotabTripId" = m."geotabTripId"
     JOIN "Trip" t ON t.id = m."tripId"
     WHERE m."companyId" = $1
       AND t."driverId" IS NULL
       AND s."driverName" IS NOT NULL AND s."driverName" <> ''`,
    companyId
  )) as Array<{ tripId: string; driverName: string; dataRitiro: Date | string }>;

  if (rows.length === 0) return 0;

  const users = await db.user.findMany({
    where: { companyId, role: "AUTISTA", isActive: true },
    select: { id: true, nome: true, cognome: true },
  });
  const userByName = new Map(
    users.map((user) => [normalizeName(`${user.nome} ${user.cognome}`), user.id])
  );

  const assignments = rows
    .map((row) => ({
      tripId: row.tripId,
      driverId: userByName.get(normalizeName(row.driverName)) ?? null,
      dataRitiro: new Date(row.dataRitiro),
    }))
    .filter((row): row is { tripId: string; driverId: string; dataRitiro: Date } =>
      Boolean(row.driverId)
    );

  if (assignments.length === 0) return 0;

  await db.$transaction(
    async (tx) => {
      for (const assignment of assignments) {
        await tx.trip.updateMany({
          where: { id: assignment.tripId, companyId, driverId: null },
          data: {
            driverId: assignment.driverId,
            status: assignment.dataRitiro.getTime() < Date.now() ? "COMPLETATO" : "ASSEGNATO",
          },
        });
      }
    },
    { timeout: 30000 }
  );

  return assignments.length;
}
