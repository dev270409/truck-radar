import type { NextAuthConfig } from "next-auth";

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
        session.user.id = token.userId;
        session.user.email = token.email;
        session.user.nome = token.nome;
        session.user.cognome = token.cognome;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.vehicleId = token.vehicleId;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
