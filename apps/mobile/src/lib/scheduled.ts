import {
  type Recurrence,
  scheduledErrorMessage,
  type ScheduledValues,
} from '@fin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type ScheduledRow = {
  id: string;
  kind: 'expense' | 'income';
  account_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  description: string;
  recurrence: Recurrence;
  starts_on: string;
  ends_on: string | null;
  next_run_on: string;
  is_estimated: boolean;
  auto_post: boolean;
  reminder_days_before: number | null;
  is_active: boolean;
  account: { name: string } | null;
  category: { name: string } | null;
};

export class ScheduledError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

function toError(error: { message?: string }) {
  const mapped = scheduledErrorMessage(error.message);
  return new ScheduledError(mapped.message, mapped.field);
}

export function useScheduled() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['scheduled', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_transactions')
        .select(
          'id, kind, account_id, category_id, amount, currency, description, recurrence, starts_on, ends_on, next_run_on, is_estimated, auto_post, reminder_days_before, is_active, account:accounts(name), category:categories(name)',
        )
        .order('next_run_on')
        .returns<ScheduledRow[]>();
      if (error) throw error;
      return data;
    },
  });
}

function columns(v: ScheduledValues) {
  return {
    kind: v.kind,
    account_id: v.accountId,
    category_id: v.categoryId,
    amount: v.kind === 'expense' ? -v.amount : v.amount,
    description: v.description,
    recurrence: v.recurrence,
    starts_on: v.startsOn,
    ends_on: v.endsOn,
    is_estimated: v.isEstimated,
    auto_post: v.autoPost,
    reminder_days_before: v.reminderDaysBefore,
  };
}

export function useScheduledMutations() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const onSuccess = () => {
    for (const key of ['scheduled', 'transactions', 'accounts', 'budgets']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const create = useMutation({
    mutationFn: async (v: ScheduledValues) => {
      const { error } = await supabase
        .from('scheduled_transactions')
        .insert({ user_id: session!.user.id, next_run_on: v.startsOn, ...columns(v) });
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const update = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: ScheduledValues }) => {
      const { error } = await supabase
        .from('scheduled_transactions')
        .update({ ...columns(v), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('scheduled_transactions').update({ is_active: active }).eq('id', id);
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_transactions').delete().eq('id', id);
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const post = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number | null }) => {
      const { error } = await supabase.rpc('post_scheduled', { p_id: id, p_amount: amount });
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const skip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('skip_scheduled', { p_id: id });
      if (error) throw toError(error);
    },
    onSuccess,
  });

  return { create, update, setActive, remove, post, skip };
}
