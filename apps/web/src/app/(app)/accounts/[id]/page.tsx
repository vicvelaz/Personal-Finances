import { formatMoney, minorToInput } from "@fin/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "../account-form";
import { updateAccount } from "../actions";
import { AccountDangerZone } from "./danger-zone";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("accounts.editAccount") };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditAccountPage({ params }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: account }, { locale }] = await Promise.all([
    supabase
      .from("account_balances")
      .select("id, name, type, currency, opening_balance, balance, is_archived, transaction_count")
      .eq("id", id)
      .maybeSingle(),
    getProfilePrefs(),
  ]);
  // RLS hides other users' accounts, so they are indistinguishable from missing ones.
  if (!account) notFound();

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{account.name}</h1>
        <p className="text-neutral-500">
          <T id="dashboard.currentBalanceLabel" /> {formatMoney(account.balance, account.currency, locale)} <T>·</T> {account.transaction_count}{" "}
          {account.transaction_count === 1 ? "movimiento" : "movimientos"}
          {account.is_archived && " · Archivada"}
        </p>
      </div>
      <AccountForm
        action={updateAccount.bind(null, id)}
        initial={{
          name: account.name,
          type: account.type,
          currency: account.currency,
          openingBalance: minorToInput(account.opening_balance, locale),
        }}
        currencyLocked
        submitLabel="Guardar cambios"
      />
      <AccountDangerZone id={id} isArchived={account.is_archived} />
    </section>
  );
}
