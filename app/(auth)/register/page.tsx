import { headers } from "next/headers";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  headers(); // Force dynamic rendering (SSR)
  return <RegisterForm />;
}