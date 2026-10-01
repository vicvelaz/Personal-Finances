import {
  monthRange,
  signedAmount,
  TRANSACTION_MESSAGES,
  TRANSACTION_PAGE_SIZE,
  transactionErrorMessage,
  type TransactionKind,
  type TransactionValues,
} from '@fin/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type TransactionRow = {
  id: string;
  kind: TransactionKind;
  amount: number;
  currency: string;
  occurred_on: string;
  description: string | null;
  notes: string | null;
  transfer_group_id: string | null;
  account_id: string;
  category_id: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string; color: string | null } | null;
  splits: { id: string; category_id: string | null; amount: number }[];
};

const COLUMNS =
  'id, kind, amount, currency, occurred_on, description, notes, transfer_group_id, account_id, category_id, account:accounts(id, name), category:categories(id, name, color), splits:transaction_splits(id, category_id, amount)';

/** Error carrying an optional form field so screens can show it next to the input. */
export class TransactionError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

function toError(error: { message?: string }) {
  const mapped = transactionErrorMessage(error.message);
  return new TransactionError(mapped.message, mapped.field);
}

export function useTransactions(month: string, kind: TransactionKind | undefined) {
  const { session } = useSession();
  return useInfiniteQuery({
    queryKey: ['transactions', session?.user.id, month, kind],
    enabled: !!session,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const range = monthRange(month)!;
      let query = supabase
        .from('transactions')
        .select(COLUMNS)
        .gte('occurred_on', range.from)
        .lte('occurred_on', range.to)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageParam * TRANSACTION_PAGE_SIZE, (pageParam + 1) * TRANSACTION_PAGE_SIZE - 1);
      if (kind) query = query.eq('kind', kind);
      const { data, error } = await query.returns<TransactionRow[]>();
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, all) => (last.length === TRANSACTION_PAGE_SIZE ? all.length : undefined),
  });
}

/** A transaction plus, for transfers, the source and destination accounts of both legs. */
export function useTransaction(id: string) {
  const { session } = useSession();
  return useQuery({
    queryKey: ['transaction', session?.user.id, id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select(COLUMNS).eq('id', id).maybeSingle<TransactionRow>();
      if (error) throw error;
      if (!data) return null;
      let fromId = data.account_id;
      let toId = '';
      let toAmount: number | null = null;
      if (data.transfer_group_id) {
        const { data: legs } = await supabase
          .from('transactions')
          .select('account_id, amount, currency')
          .eq('transfer_group_id', data.transfer_group_id)
          .returns<{ account_id: string; amount: number; currency: string }[]>();
        const out = legs?.find((l) => l.amount < 0);
        const into = legs?.find((l) => l.amount > 0);
        fromId = out?.account_id ?? fromId;
        toId = into?.account_id ?? '';
        if (out && into && out.currency !== into.currency) toAmount = into.amount;
      }
      return { ...data, fromId, toId, toAmount };
    },
  });
}

export function useTransactionMutations() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transaction'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };

  const create = useMutation({
    mutationFn: async (v: TransactionValues) => {
      const { error } =
        v.kind === 'transfer'
          ? await supabase.rpc('create_transfer', {
              p_from: v.accountId,
              p_to: v.toAccountId,
              p_amount: v.amount,
              p_occurred_on: v.occurredOn,
              p_description: v.description,
              p_notes: v.notes,
              p_to_amount: v.toAmount,
            })
          : await supabase.from('transactions').insert({
              user_id: session!.user.id,
              kind: v.kind,
              account_id: v.accountId,
              category_id: v.categoryId,
              amount: signedAmount(v.kind, v.amount),
              occurred_on: v.occurredOn,
              description: v.description,
              notes: v.notes,
            });
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const update = useMutation({
    mutationFn: async ({ tx, v }: { tx: TransactionRow; v: TransactionValues }) => {
      const { error } =
        v.kind === 'transfer'
          ? await supabase.rpc('update_transfer', {
              p_group: tx.transfer_group_id,
              p_from: v.accountId,
              p_to: v.toAccountId,
              p_amount: v.amount,
              p_occurred_on: v.occurredOn,
              p_description: v.description,
              p_notes: v.notes,
              p_to_amount: v.toAmount,
            })
          : await supabase
              .from('transactions')
              .update({
                kind: v.kind,
                account_id: v.accountId,
                category_id: v.categoryId,
                amount: signedAmount(v.kind, v.amount),
                occurred_on: v.occurredOn,
                description: v.description,
                notes: v.notes,
                updated_at: new Date().toISOString(),
              })
              .eq('id', tx.id);
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const remove = useMutation({
    mutationFn: async (tx: TransactionRow) => {
      const query = supabase.from('transactions').delete();
      const { error } = tx.transfer_group_id
        ? await query.eq('transfer_group_id', tx.transfer_group_id)
        : await query.eq('id', tx.id);
      if (error) throw new TransactionError(TRANSACTION_MESSAGES.unexpected);
    },
    onSuccess,
  });

  return { create, update, remove };
}
