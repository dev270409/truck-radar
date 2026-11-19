import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ImpostazioniClient from "./ImpostazioniClient";

export default async function ImpostazioniPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role === "AUTISTA") redirect("/dashboard/autista");

  return (
    <ImpostazioniClient
      user={{
        nome: session.user.nome ?? "",
        cognome: session.user.cognome ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
    />
  );
}
