import {
  buildCategoryTree,
  type CategoryRow,
  formatMoney,
  minorToInput,
  parseSplits,
  splitRemaining,
  transactionErrorMessage,
  translate,
} from '@fin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button, FormAlert, MoneyField, OptionPicker } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import type { TransactionRow } from '@/lib/transactions';

type Line = { categoryId: string; amount: string };

export function SplitEditor({ tx, categories, locale }: { tx: TransactionRow; categories: CategoryRow[]; locale: string }) {
  const queryClient = useQueryClient();
  const total = Math.abs(tx.amount);
  const initial = tx.splits.map((s) => ({ categoryId: s.category_id ?? '', amount: minorToInput(Math.abs(s.amount), locale) }));
  const [lines, setLines] = useState<Line[]>(initial.length ? initial : [{ categoryId: '', amount: '' }, { categoryId: '', amount: '' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();

  const save = useMutation({
    mutationFn: async (splits: { category_id: string | null; amount: number }[]) => {
      const { error } = await supabase.rpc('set_transaction_splits', { p_transaction_id: tx.id, p_splits: splits });
      if (error) throw new Error(transactionErrorMessage(error.message).message);
    },
    onSuccess: (_, splits) => {
      setMessage(splits.length ? 'División guardada' : 'División eliminada');
      if (!splits.length) setLines([{ categoryId: '', amount: '' }, { categoryId: '', amount: '' }]);
      queryClient.invalidateQueries();
    },
  });

  const tree = buildCategoryTree(categories)[tx.kind === 'income' ? 'income' : 'expense'];
  const labels: Record<string, string> = { '': translate(locale, "categories.uncategorized") };
  for (const c of tree) {
    labels[c.id] = c.name;
    for (const ch of c.children) labels[ch.id] = `· ${ch.name}`;
  }
  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  function onSave() {
    setMessage(undefined);
    const parsed = parseSplits(lines, total);
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
    save.mutate(parsed.splits);
  }

  return (
    <>
      <ThemedText translationKey="transactions.splitAcrossCategories" />
      <FormAlert error={errors._form ?? save.error?.message} message={message} />
      {lines.flatMap((l, i) => [
        <OptionPicker
          key={`c${i}`}
          label={`Parte ${i + 1}: categoría`}
          options={Object.keys(labels)}
          labels={labels}
          value={l.categoryId}
          onChange={(v) => set(i, { categoryId: v })}
        />,
        <MoneyField
          key={`a${i}`}
          label={`Parte ${i + 1}: importe`}
          value={l.amount}
          onChangeText={(v) => set(i, { amount: v })}
          currency={tx.currency}
          error={errors[`${i}.amount`]}
        />,
      ])}
      <ThemedText type="small" themeColor="textSecondary">
        Por asignar: {formatMoney(splitRemaining(total, lines.map((l) => l.amount)), tx.currency, locale)}
      </ThemedText>
      <Button variant="link" title="Añadir parte" onPress={() => setLines((ls) => [...ls, { categoryId: '', amount: '' }])} />
      {lines.length > 2 && <Button variant="link" title="Quitar última parte" onPress={() => setLines((ls) => ls.slice(0, -1))} />}
      <Button title="Guardar división" onPress={onSave} loading={save.isPending} />
      {tx.splits.length > 0 && <Button variant="link" title="Quitar división" onPress={() => save.mutate([])} />}
    </>
  );
}
