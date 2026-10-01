import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { T } from "@/components/i18n-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already redirects, but never render private UI without a verified user.
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold"><T>fin</T></Link>
          <Link href="/transactions" className="text-sm"><T id="transactions.transactions" /></Link>
          <Link href="/scheduled" className="text-sm"><T id="scheduled.scheduled" /></Link>
          <Link href="/accounts" className="text-sm"><T id="accounts.accounts" /></Link>
          <Link href="/budgets" className="text-sm"><T id="budgets.budgets" /></Link>
          <Link href="/goals" className="text-sm"><T id="goals.goals" /></Link>
          <Link href="/categories" className="text-sm"><T id="common.categories" /></Link>
          <Link href="/profile" className="text-sm"><T id="csvImport.profile" /></Link>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="underline"><T id="common.signOut" /></button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
