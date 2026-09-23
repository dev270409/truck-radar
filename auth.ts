import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { comparePassword } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { getPlanLimits } from "@/lib/plans";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const rl = rateLimit(`login:${email}`, 30, 60_000);
        if (!rl.ok) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
          include: { company: true },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        const planLimits = getPlanLimits(user.company?.subscriptionPlan);

        return {
          id: user.id,
          email: user.email,
          nome: user.nome,
          cognome: user.cognome,
          role: user.role,
          companyId: user.companyId,
          vehicleId: user.vehicleId,
          subscriptionPlan: user.company?.subscriptionPlan || "BASE",
          vehicleLimit: planLimits.vehicleLimit,
          driverLimit: planLimits.driverLimit,
        };
      },
    }),
  ],
});
