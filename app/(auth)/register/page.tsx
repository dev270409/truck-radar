import { headers } from "next/headers";
import RegisterForm from "./RegisterForm";

headers(); // Force dynamic rendering (SSR)

export default function RegisterPage() {
  return <RegisterForm />;
}