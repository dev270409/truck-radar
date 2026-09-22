import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's unique identifier. */
      id: string;
      /** The user's email address. */
      email: string;
      /** The user's first name. */
      nome: string;
      /** The user's last name. */
      cognome: string;
      /** The user's role. */
      role: UserRole;
      /** The user's company identifier. */
      companyId: string;
      /** The user's assigned vehicle ID. */
      vehicleId: string | null | undefined;
      /** The user's subscription plan. */
      subscriptionPlan: string;
      /** Maximum number of vehicles allowed for this plan. */
      vehicleLimit: number;
      /** Maximum number of drivers allowed for this plan. */
      driverLimit: number;
    };
  }
}

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email!;
        token.nome = (user as { nome: string }).nome;
        token.cognome = (user as { cognome: string }).cognome;
        token.role = (user as { role: any }).role;
        token.companyId = (user as { companyId: string }).companyId;
        token.vehicleId = (user as { vehicleId?: string | null }).vehicleId;
        // Store subscription data in the jwt token
        token.subscriptionPlan = (user as any)?.subscriptionPlan || "TRIAL";
        token.vehicleLimit = (user as any)?.vehicleLimit ?? 15;
        token.driverLimit = (user as any)?.driverLimit ?? 15;
      }
      return token;
    },
    async session({ session, token }) {
      // Extend the session with the jwt token data
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.nome = token.nome as string;
        session.user.cognome = token.cognome as string;
        session.user.role = token.role as UserRole;
        session.user.companyId = token.companyId as string;
        session.user.vehicleId = token.vehicleId as string | null | undefined;
        // Store subscription data in the session
        session.user.subscriptionPlan = token.subscriptionPlan as string;
        session.user.vehicleLimit = token.vehicleLimit as number;
        session.user.driverLimit = token.driverLimit as number;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;