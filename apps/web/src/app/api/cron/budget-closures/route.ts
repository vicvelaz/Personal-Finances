import { timingSafeEqual } from "node:crypto";
import { shiftMonth } from "@fin/shared";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (today.slice(-2) !== "01") {
    return NextResponse.json({ error: "not_month_start" }, { status: 409 });
  }
  const periodStart = `${shiftMonth(today.slice(0, 7), -1)}-01`;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("run_due_budget_closure_rules", {
    p_period_start: periodStart,
  });
  if (error) {
    return NextResponse.json({ error: "budget_closure_failed" }, { status: 500 });
  }
  return NextResponse.json({ processed: data, periodStart });
}
