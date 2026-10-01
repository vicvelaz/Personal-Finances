import { timingSafeEqual } from "node:crypto";
import { frankfurterUrl, isValidIsoDate, parseFrankfurterRates } from "@fin/shared";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

function authorized(header: string | null, secret: string): boolean {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Refreshes exchange rates. Call from a scheduler with `Authorization: Bearer $CRON_SECRET`; `?from=YYYY-MM-DD` backfills. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  if (from !== undefined && !isValidIsoDate(from)) return NextResponse.json({ error: "invalid_from" }, { status: 400 });

  const res = await fetch(frankfurterUrl(from), { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
  let rows;
  try {
    rows = parseFrankfurterRates(await res.json());
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from("exchange_rates").upsert(rows, { onConflict: "base,quote,rate_date" });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ saved: rows.length });
}
