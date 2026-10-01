import type { Metadata } from "next";
import { AUTH_MESSAGES } from "@fin/shared";
import { FormAlert } from "@/components/form";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("auth.signInTitle") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <>
      {error === "oauth" && <FormAlert error={AUTH_MESSAGES.oauthFailed} />}
      <LoginForm next={nextPath} />
      <GoogleButton next={nextPath} />
    </>
  );
}
