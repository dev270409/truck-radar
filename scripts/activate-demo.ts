import { db } from "../lib/db";

async function main() {
  const admin = await db.user.findUnique({ where: { email: "admin@demo.com" } });
  if (!admin) {
    console.log("admin@demo.com non trovato");
    await db.$disconnect();
    return;
  }
  const res = await db.company.update({
    where: { id: admin.companyId },
    data: { subscriptionStatus: "ACTIVE", subscriptionPlan: "BASE" },
  });
  console.log("demo company attivata:", res.ragioneSociale, res.subscriptionStatus, res.subscriptionPlan);
  const driver = await db.user.findUnique({ where: { email: "autista@demo.com" } });
  if (driver) {
    await db.company.update({
      where: { id: driver.companyId },
      data: { subscriptionStatus: "ACTIVE", subscriptionPlan: "BASE" },
    });
    console.log("demo company autista attivata");
  }
  await db.$disconnect();
}

main();