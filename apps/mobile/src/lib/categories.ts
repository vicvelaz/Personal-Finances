import {
  CATEGORY_MESSAGES,
  categoryErrorMessage,
  type CategoryRow,
  type CategoryValues,
} from '@fin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Error carrying an optional form field so screens can show it next to the input. */
export class CategoryError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

function toError(error: { code?: string; message?: string }) {
  const mapped = categoryErrorMessage(error.code, error.message);
  return new CategoryError(mapped.message, mapped.field);
}

export function useCategories() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['categories', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, kind, parent_id, color')
        .returns<CategoryRow[]>();
      if (error) throw error;
      return data;
    },
  });
}

export function useCategoryMutations() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['categories'] });
  const columns = (v: CategoryValues) => ({
    name: v.name,
    kind: v.kind,
    parent_id: v.parentId,
    color: v.color,
  });

  const create = useMutation({
    mutationFn: async (values: CategoryValues) => {
      const { error } = await supabase
        .from('categories')
        .insert({ user_id: session!.user.id, ...columns(values) });
      if (error) throw toError(error);
    },
    onSuccess,
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CategoryValues }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({ ...columns(values), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw toError(error);
      if (!data.length) throw new CategoryError(CATEGORY_MESSAGES.notFound);
    },
    onSuccess,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('categories').delete().eq('id', id).select('id');
      if (error) throw toError(error);
      if (!data.length) throw new CategoryError(CATEGORY_MESSAGES.notFound);
    },
    onSuccess,
  });

  return { create, update, remove };
}
