"use client";

import type { CategorySlice } from "@fin/shared";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "@/components/i18n-provider";

export type TrendPoint = { label: string; income: number; expense: number };

export function TrendChart({ data, currency, locale }: { data: TrendPoint[]; currency: string; locale: string }) {
  const { t } = useTranslations();
  const fmt = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  return (
    <div className="h-64 w-full" aria-label={t("Evolución de ingresos y gastos")}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={fmt} width={80} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Legend />
          <Bar dataKey="income" name={t("Ingresos")} fill="#16a34a" />
          <Bar dataKey="expense" name={t("Gastos")} fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data, currency, locale }: { data: CategorySlice[]; currency: string; locale: string }) {
  const { t } = useTranslations();
  const fmt = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(v);
  const rows = data.map((d) => ({ ...d, value: d.total / 100 }));
  return (
    <div className="w-full" style={{ height: Math.max(120, rows.length * 40) }} aria-label={t("Gasto por categoría")}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={130} />
          <Tooltip formatter={(v) => fmt(Number(v))} />
          <Bar dataKey="value" name={t("Gasto")}>
            {rows.map((r) => (
              <Cell key={r.id} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
