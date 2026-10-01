import type { Metadata } from "next";
import Link from "next/link";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("validation.invalidLink") };
}

export default function AuthErrorPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold"><T id="validation.invalidExpiredLink" /></h1>
        <p className="text-sm text-neutral-500">
          <T id="auth.requestNewLinkSignAgain" />
        </p>
        <Link href="/login" className="underline"><T id="auth.goSign" /></Link>
      </div>
    </main>
  );
}
