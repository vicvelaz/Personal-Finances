import { fromMinor, toCsv } from "@fin/shared";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLES = [
  "profiles",
  "accounts",
  "categories",
  "transactions",
  "budgets",
  "scheduled_transactions",
  "savings_goals",
] as const;

type TxRow = {
  occurred_on: string;
  kind: string;
  description: string | null;
  amount: number;
  currency: string;
  account: { name: string } | null;
  category: { name: string } | null;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const date = new Date().toISOString().slice(0, 10);
  if (request.nextUrl.searchParams.get("format") === "csv") {
    const { data, error } = await supabase
      .from("transactions")
      .select("occurred_on, kind, description, amount, currency, account:accounts(name), category:categories(name)")
      .order("occurred_on")
      .returns<TxRow[]>();
    if (error) return NextResponse.json({ error: "export_failed" }, { status: 500 });
    const csv = toCsv(
      ["fecha", "tipo", "cuenta", "categoria", "descripcion", "importe", "moneda"],
      data.map((t) => [t.occurred_on, t.kind, t.account?.name, t.category?.name, t.description, fromMinor(t.amount), t.currency]),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fin-movimientos-${date}.csv"`,
      },
    });
  }

  const entries = await Promise.all(TABLES.map(async (t) => [t, (await supabase.from(t).select("*")).data ?? []] as const));
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), email: user.email, ...Object.fromEntries(entries) }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fin-datos-${date}.json"`,
    },
  });
}
