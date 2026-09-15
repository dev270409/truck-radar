import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  console.log("Testing database connection to Supabase...");
  try {
    await prisma.$connect();
    console.log("✅ CONNECTED TO SUPABASE POSTGRESQL SUCCESSFULLY!");
    const count = await prisma.$queryRaw`SELECT 1 as result;`;
    console.log("Query result:", count);
  } catch (error) {
    console.error("❌ Connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
