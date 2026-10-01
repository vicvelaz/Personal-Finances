import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { DataRights } from "./data-rights";
import { MfaSettings } from "./mfa-settings";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("csvImport.profile") };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, base_currency, locale, timezone")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("No se pudo cargar el perfil");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factorId = factors?.totp[0]?.id ?? null;

  return (
    <section className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="mb-6 text-2xl font-semibold"><T id="csvImport.profile" /></h1>
      <ProfileForm
        profile={{
          email: user.email ?? "",
          displayName: profile.display_name,
          baseCurrency: profile.base_currency,
          locale: profile.locale,
          timezone: profile.timezone,
        }}
      />
      <MfaSettings factorId={factorId} />
      <DataRights mfa={!!factorId} />
    </section>
  );
}
