import type { Metadata } from "next";
import { signOut } from "../actions";
import { MfaForm } from "./mfa-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("security.twoStepVerification") };
}

export default async function MfaPage({ searchParams }: PageProps<"/mfa">) {
  const { next } = await searchParams;
  return (
    <>
      <MfaForm next={typeof next === "string" ? next : undefined} />
      <form action={signOut} className="mt-4 text-center text-sm">
        <button type="submit" className="underline"><T id="common.signOut" /></button>
      </form>
    </>
  );
}
