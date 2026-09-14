import { DefaultSession } from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    nome: string;
    cognome: string;
    role: UserRole;
    companyId: string;
    vehicleId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      nome: string;
      cognome: string;
      role: UserRole;
      companyId: string;
      vehicleId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    email: string;
    nome: string;
    cognome: string;
    role: UserRole;
    companyId: string;
    vehicleId?: string | null;
  }
}
