import type { Metadata } from "next";
import { SignUpForm } from "./signup-form";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("accounts.createAccount") };
}

export default function SignUpPage() {
  return <SignUpForm />;
}
