import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("auth.newPassword") };
}

// Reachable only with the recovery session created by /auth/confirm; proxy.ts redirects otherwise.
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
