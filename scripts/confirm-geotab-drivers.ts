import { db } from "../lib/db";
import { confirmGeotabDrivers, listGeotabDrivers } from "../lib/geotab-drivers";

const DEFAULT_EMAIL = "tapesolegto@gmail.com";

async function main() {
  const email = process.argv[2] ?? DEFAULT_EMAIL;
  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, companyId: true, role: true },
  });
  if (!user) throw new Error(`Utente non trovato: ${email}`);
  if (user.role !== "ADMIN") throw new Error("L'utente deve essere ADMIN");

  const drivers = await listGeotabDrivers(user.companyId);
  const ids = drivers
    .filter((driver) => driver.status !== "COLLEGATO")
    .map((driver) => driver.geotabDriverId);
  if (ids.length === 0) {
    console.log("Tutti i conducenti Geotab sono già collegati.");
    return;
  }

  const result = await confirmGeotabDrivers(user.companyId, user.id, ids);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
