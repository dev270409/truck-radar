import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const { plan } = await searchParams;
  const selectedPlan = Array.isArray(plan) ? plan[0] : plan;

  return <RegisterForm initialPlan={selectedPlan === "PRO" ? "PRO" : "BASE"} />;
}
