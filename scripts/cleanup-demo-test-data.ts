import { db } from "../lib/db";

async function main() {
  const company = (await db.$queryRawUnsafe(
    `SELECT id FROM "Company" WHERE "ragioneSociale" = 'Trasporti Demo Srl' LIMIT 1`
  )) as Array<{ id: string }>;
  const c = company[0];
  if (!c) {
    console.log("demo company not found");
    return;
  }

  const users = (await db.$executeRawUnsafe(
    `DELETE FROM "User" WHERE "companyId" = $1 AND (email ~ '^autista[0-9]+@demo\\.com$' OR email ~ '^trackaut[0-9]+@demo\\.com$')`,
    c.id
  )) as number;
  const vehicles = (await db.$executeRawUnsafe(
    `DELETE FROM "Vehicle" WHERE "companyId" = $1 AND targa ~ '^LM[0-9]{6,7}X$'`,
    c.id
  )) as number;

  console.log(`deleted users=${users} vehicles=${vehicles}`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exitCode = 1; });
