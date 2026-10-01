import type { Metadata } from "next";
import { getProfilePrefs } from "@/lib/profile";
import { AccountForm } from "../account-form";
import { createAccount } from "../actions";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("accounts.newAccount") };
}

export default async function NewAccountPage() {
  const { baseCurrency } = await getProfilePrefs();
  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold"><T id="accounts.newAccount" /></h1>
      <AccountForm
        action={createAccount}
        initial={{ name: "", type: "checking", currency: baseCurrency, openingBalance: "" }}
        submitLabel="Crear cuenta"
      />
    </section>
  );
}
