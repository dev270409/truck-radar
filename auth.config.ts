import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.nome = token.nome as string;
        session.user.cognome = token.cognome as string;
        session.user.role = token.role as UserRole;
        session.user.companyId = token.companyId as string;
        session.user.vehicleId = token.vehicleId as string | null | undefined;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
