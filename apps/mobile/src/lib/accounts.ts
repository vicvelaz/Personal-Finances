import {
  ACCOUNT_MESSAGES,
  accountReconciliationErrorKey,
  type AccountCreate,
  type AccountType,
  type AccountUpdate,
} from '@fin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: number;
  balance: number;
  is_archived: boolean;
  transaction_count: number;
};

const COLUMNS = 'id, name, type, currency, opening_balance, balance, is_archived, transaction_count';

export class AccountError extends Error {}

export function useAccounts() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['accounts', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_balances')
        .select(COLUMNS)
        .order('name')
        .returns<AccountRow[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useAccount(id: string) {
  const accounts = useAccounts();
  return { ...accounts, data: accounts.data?.find((a) => a.id === id) };
}

export function useAccountMutations() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['accounts'] });

  const create = useMutation({
    mutationFn: async (values: AccountCreate) => {
      const { error } = await supabase.from('accounts').insert({
        user_id: session!.user.id,
        name: values.name,
        type: values.type,
        currency: values.currency,
        opening_balance: values.openingBalance,
      });
      if (error) throw new AccountError(ACCOUNT_MESSAGES.unexpected);
    },
    onSuccess,
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AccountUpdate }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update({
          name: values.name,
          type: values.type,
          opening_balance: values.openingBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id');
      if (error) throw new AccountError(ACCOUNT_MESSAGES.unexpected);
      if (!data.length) throw new AccountError(ACCOUNT_MESSAGES.notFound);
    },
    onSuccess,
  });

  const setArchived = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('accounts')
        .update({ is_archived: archived, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new AccountError(ACCOUNT_MESSAGES.unexpected);
    },
    onSuccess,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('accounts').delete().eq('id', id).select('id');
      if (error) {
        throw new AccountError(
          error.message === 'account_has_transactions'
            ? ACCOUNT_MESSAGES.hasTransactions
            : ACCOUNT_MESSAGES.unexpected,
        );
      }
      if (!data.length) throw new AccountError(ACCOUNT_MESSAGES.notFound);
    },
    onSuccess,
  });

  const reconcile = useMutation({
    mutationFn: async ({ id, realBalance }: { id: string; realBalance: number }) => {
      const { data, error } = await supabase.rpc('reconcile_account', {
        p_account_id: id,
        p_real_balance: realBalance,
      });
      if (error) throw new AccountError(accountReconciliationErrorKey(error.message));
      return data ?? 0;
    },
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  return { create, update, setArchived, remove, reconcile };
}
