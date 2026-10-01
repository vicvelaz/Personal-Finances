import { goalErrorMessage, type GoalStatus, type GoalValues } from '@fin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type GoalRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  account_id: string | null;
  status: GoalStatus;
};

export class GoalError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

function toError(error: { message?: string }) {
  const mapped = goalErrorMessage(error.message);
  return new GoalError(mapped.message, mapped.field);
}

export function useGoals() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['goals', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('id, name, target_amount, current_amount, currency, target_date, account_id, status')
        .order('name')
        .returns<GoalRow[]>();
      if (error) throw error;
      return data;
    },
  });
}

const columns = (v: GoalValues) => ({
  name: v.name,
  target_amount: v.targetAmount,
  currency: v.currency,
  target_date: v.targetDate,
  account_id: v.accountId,
});

export function useGoalMutations() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['goals'] });

  const create = useMutation({
    mutationFn: async (v: GoalValues) => {
      const { error } = await supabase.from('savings_goals').insert({ user_id: session!.user.id, ...columns(v) });
      if (error) throw toError(error);
    },
    onSuccess,
  });
  const update = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: GoalValues }) => {
      const { error } = await supabase
        .from('savings_goals')
        .update({ ...columns(v), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw toError(error);
    },
    onSuccess,
  });
  const adjust = useMutation({
    mutationFn: async ({ id, delta, accountId }: { id: string; delta: number; accountId?: string | null }) => {
      const { error } = await supabase.rpc('adjust_goal', { p_id: id, p_delta: delta, p_account: accountId ?? null });
      if (error) throw toError(error);
    },
    onSuccess: (_, { accountId }) => {
      onSuccess();
      if (accountId) {
        for (const key of ['accounts', 'transactions', 'goal-history']) queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
  const setArchived = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('savings_goals')
        .update({ status: archived ? 'archived' : 'active' })
        .eq('id', id);
      if (error) throw toError(error);
    },
    onSuccess,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw toError(error);
    },
    onSuccess,
  });
  return { create, update, adjust, setArchived, remove };
}

/** Transfers made through the goal, seen from the goal's account (positive = contribution). */
export function useGoalHistory(goal: { id: string; account_id: string | null }) {
  const { session } = useSession();
  return useQuery({
    queryKey: ['goal-history', session?.user.id, goal.id, goal.account_id],
    enabled: !!session && !!goal.account_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, occurred_on, amount, description')
        .eq('goal_id', goal.id)
        .eq('account_id', goal.account_id!)
        .order('occurred_on', { ascending: false })
        .limit(20)
        .returns<{ id: string; occurred_on: string; amount: number; description: string | null }[]>();
      if (error) throw error;
      return data;
    },
  });
}
