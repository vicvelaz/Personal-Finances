import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("auth.recoverPassword") };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
