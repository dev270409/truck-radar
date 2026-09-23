import { headers } from "next/headers";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

headers(); // Force dynamic rendering (SSR)

export default function RegisterPage() {
  return <RegisterForm />;
}
  return <RegisterForm />;
}