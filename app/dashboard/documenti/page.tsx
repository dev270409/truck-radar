import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlanFeatures } from "@/lib/plans";
import DocumentInboxPage from "./DocumentInboxPage";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role === "AUTISTA") redirect("/dashboard/autista");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { subscriptionPlan: true },
  });

  return (
    <DocumentInboxPage
      features={getPlanFeatures(company?.subscriptionPlan)}
      plan={company?.subscriptionPlan ?? "BASE"}
    />
  );
}
