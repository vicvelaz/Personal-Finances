-- Verifies the profile trigger and owner-only RLS. Runs in a transaction and rolls back.
-- Usage: docker exec -i supabase_db_fin psql -U postgres -v ON_ERROR_STOP=1 < packages/db/scripts/verify-rls.sql
BEGIN;

-- Runs stmt and asserts it fails with the given RAISE message.
CREATE FUNCTION pg_temp.expect_error(stmt text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RAISE EXCEPTION 'expected error % but statement succeeded: %', expected, stmt;
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> expected THEN RAISE; END IF;
END;
$$;

-- Deterministic conversions: start without exchange rates (rolled back at the end).
DELETE FROM public.exchange_rates;

INSERT INTO auth.users (id, email, aud, role)
VALUES
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', 'authenticated', 'authenticated');

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.profiles
          WHERE id IN ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')
            AND base_currency = 'EUR' AND locale = 'es-ES' AND timezone = 'Europe/Madrid') = 2,
    'trigger must create one profile with defaults per user';
END $$;

INSERT INTO public.accounts (user_id, name)
VALUES ('00000000-0000-0000-0000-00000000000b', 'Cuenta de B');
INSERT INTO public.savings_goals (user_id, name, target_amount)
VALUES ('00000000-0000-0000-0000-00000000000b', 'Meta de B', 50000);
SELECT set_config('test.b_cat',
  (SELECT id::text FROM public.categories WHERE user_id = '00000000-0000-0000-0000-00000000000b' AND name = 'Ocio'), true);
SELECT set_config('test.b_acc',
  (SELECT id::text FROM public.accounts WHERE user_id = '00000000-0000-0000-0000-00000000000b' LIMIT 1), true);
SELECT set_config('test.b_goal',
  (SELECT id::text FROM public.savings_goals WHERE user_id = '00000000-0000-0000-0000-00000000000b' LIMIT 1), true);

-- Act as user A.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

DO $$
DECLARE n int;
BEGIN
  ASSERT (SELECT count(*) FROM public.profiles) = 1, 'A must only see own profile';
  ASSERT (SELECT count(*) FROM public.accounts) = 0, 'A must not see B accounts';

  UPDATE public.profiles SET display_name = 'hack' WHERE id = '00000000-0000-0000-0000-00000000000b';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'A must not update B profile';

  UPDATE public.accounts SET name = 'hack';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'A must not update B accounts';

  DELETE FROM public.accounts;
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'A must not delete B accounts';

  BEGIN
    INSERT INTO public.accounts (user_id, name) VALUES ('00000000-0000-0000-0000-00000000000b', 'spoof');
    RAISE EXCEPTION 'A must not insert rows owned by B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.profiles (id) VALUES (gen_random_uuid());
    RAISE EXCEPTION 'users must not insert profiles';
  EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN NULL;
  END;

  INSERT INTO public.accounts (user_id, name) VALUES ('00000000-0000-0000-0000-00000000000a', 'Cuenta de A');
  ASSERT (SELECT count(*) FROM public.accounts) = 1, 'A must see own account';

  UPDATE public.profiles SET display_name = 'Ana';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'A must update own profile';
END $$;

-- Accounts: balance view and guards, still as user A.
DO $$
DECLARE acc uuid;
BEGIN
  INSERT INTO public.accounts (user_id, name, opening_balance)
  VALUES ('00000000-0000-0000-0000-00000000000a', 'Con movimientos', 100000)
  RETURNING id INTO acc;
  INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on) VALUES
    ('00000000-0000-0000-0000-00000000000a', acc, 'expense', -30000, current_date),
    ('00000000-0000-0000-0000-00000000000a', acc, 'income', 5000, current_date);

  ASSERT (SELECT balance FROM public.account_balances WHERE id = acc) = 75000, 'balance = opening + transactions';
  ASSERT (SELECT transaction_count FROM public.account_balances WHERE id = acc) = 2, 'transaction_count';
  ASSERT (SELECT count(*) FROM public.account_balances WHERE user_id <> '00000000-0000-0000-0000-00000000000a') = 0,
    'view must not expose other users accounts';

  BEGIN
    DELETE FROM public.accounts WHERE id = acc;
    RAISE EXCEPTION 'deleting an account with transactions must fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'account_has_transactions' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.accounts SET currency = 'USD' WHERE id = acc;
    RAISE EXCEPTION 'changing currency must fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'account_currency_immutable' THEN RAISE; END IF;
  END;

  DELETE FROM public.accounts WHERE name = 'Cuenta de A';
  ASSERT NOT EXISTS (SELECT 1 FROM public.accounts WHERE name = 'Cuenta de A'), 'account without transactions can be deleted';
END $$;

-- Categories, still as user A.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  food uuid;
  leisure uuid;
BEGIN
  ASSERT (SELECT count(*) FROM public.categories) = 20, 'A must see exactly its 20 default categories';
  SELECT id INTO food FROM public.categories WHERE name = 'Alimentación' AND parent_id IS NULL;
  SELECT id INTO leisure FROM public.categories WHERE name = 'Ocio';

  BEGIN
    INSERT INTO public.categories (user_id, kind, name) VALUES (uid, 'expense', 'alimentación');
    RAISE EXCEPTION 'case-insensitive duplicate at top level must fail';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.categories (user_id, kind, name, parent_id)
    VALUES (uid, 'expense', 'X', (SELECT id FROM public.categories WHERE name = 'Nómina'));
    RAISE EXCEPTION 'parent of another kind must fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'category_invalid_parent' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.categories (user_id, kind, name, parent_id)
    VALUES (uid, 'expense', 'X', (SELECT id FROM public.categories WHERE name = 'Supermercado'));
    RAISE EXCEPTION 'subcategory as parent must fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'category_invalid_parent' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.categories (user_id, kind, name, parent_id)
    VALUES (uid, 'expense', 'X', current_setting('test.b_cat')::uuid);
    RAISE EXCEPTION 'parent of another user must fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'category_invalid_parent' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM public.categories WHERE id = food;
    RAISE EXCEPTION 'deleting a category with children must fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'category_has_children' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.categories SET kind = 'income' WHERE id = food;
    RAISE EXCEPTION 'changing kind of a category with children must fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'category_has_children' THEN RAISE; END IF;
  END;

  INSERT INTO public.categories (user_id, kind, name, parent_id) VALUES (uid, 'expense', 'Cine', leisure);
  ASSERT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Cine' AND parent_id = leisure), 'valid subcategory';
  DELETE FROM public.categories WHERE name = 'Cine';

  UPDATE public.transactions SET category_id = leisure WHERE user_id = uid AND kind = 'expense';
  DELETE FROM public.categories WHERE id = leisure;
  ASSERT NOT EXISTS (SELECT 1 FROM public.transactions WHERE user_id = uid AND category_id IS NOT NULL),
    'deleting a category keeps its transactions without category';
  ASSERT EXISTS (SELECT 1 FROM public.transactions WHERE user_id = uid), 'transactions are kept';
END $$;

-- Transactions and transfers, still as user A.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  savings uuid;
  usd uuid;
  supermarket uuid;
  g uuid;
BEGIN
  SELECT id INTO main_acc FROM public.accounts WHERE name = 'Con movimientos';
  SELECT id INTO supermarket FROM public.categories WHERE name = 'Supermercado';
  INSERT INTO public.accounts (user_id, name) VALUES (uid, 'Ahorro A') RETURNING id INTO savings;
  INSERT INTO public.accounts (user_id, name, currency) VALUES (uid, 'USD A', 'USD') RETURNING id INTO usd;

  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on) VALUES (%L, %L, 'expense', 100, current_date)$q$,
    uid, main_acc), 'transaction_invalid_amount');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on, category_id) VALUES (%L, %L, 'income', 100, current_date, %L)$q$,
    uid, main_acc, supermarket), 'transaction_invalid_category');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on) VALUES (%L, %L, 'expense', -100, current_date)$q$,
    uid, current_setting('test.b_acc')), 'transaction_invalid_account');

  INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on, currency, category_id)
  VALUES (uid, usd, 'expense', -100, current_date, 'EUR', supermarket);
  ASSERT (SELECT currency FROM public.transactions WHERE account_id = usd) = 'USD', 'currency is inherited from the account';

  UPDATE public.accounts SET is_archived = true WHERE id = savings;
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on) VALUES (%L, %L, 'income', 100, current_date)$q$,
    uid, savings), 'transaction_account_archived');
  UPDATE public.accounts SET is_archived = false WHERE id = savings;

  g := public.create_transfer(main_acc, savings, 1000, current_date, 'Ahorro mensual');
  ASSERT (SELECT balance FROM public.account_balances WHERE id = savings) = 1000, 'transfer credits destination';
  ASSERT (SELECT count(*) FROM public.transactions WHERE transfer_group_id = g) = 2, 'transfer has two legs';
  PERFORM pg_temp.expect_error(format('SELECT public.create_transfer(%L, %L, 10, current_date)', main_acc, main_acc), 'transfer_same_account');
  PERFORM pg_temp.expect_error(format('SELECT public.create_transfer(%L, %L, 10, current_date)', main_acc, usd), 'transfer_to_amount_required');

  PERFORM public.update_transfer(g, savings, main_acc, 2500, current_date);
  ASSERT (SELECT amount FROM public.transactions WHERE transfer_group_id = g AND account_id = savings) = -2500,
    'update_transfer moves the negative leg to the new source';

  DELETE FROM public.transactions WHERE transfer_group_id = g;
  ASSERT NOT EXISTS (SELECT 1 FROM public.transactions WHERE transfer_group_id = g), 'transfer deleted as a whole';
END $$;

-- Account reconciliation adjustments are protected and affect only account balance.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  acc uuid;
  tx uuid;
  before_balance bigint;
  book_balance bigint;
  actual bigint;
BEGIN
  SELECT id INTO acc FROM public.accounts WHERE name = 'Con movimientos';
  SELECT balance INTO before_balance FROM public.account_balances WHERE id = acc;
  ASSERT public.reconcile_account(acc, before_balance + 5000, current_date) = 5000, 'positive reconciliation delta';
  ASSERT (SELECT balance FROM public.account_balances WHERE id = acc) = before_balance + 5000, 'positive adjustment changes account balance';
  SELECT id INTO tx FROM public.transactions
  WHERE account_id = acc AND kind = 'adjustment' ORDER BY created_at DESC LIMIT 1;
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on) VALUES (%L, %L, 'adjustment', 1, current_date)$q$,
    uid, acc), 'adjustment_reconciliation_only');
  PERFORM pg_temp.expect_error(format(
    $q$UPDATE public.transactions SET description = 'edited' WHERE id = %L$q$, tx),
    'adjustment_reconciliation_only');
  PERFORM pg_temp.expect_error(format(
    $q$DELETE FROM public.transactions WHERE id = %L$q$, tx),
    'adjustment_reconciliation_only');
  PERFORM pg_temp.expect_error(
    format('SELECT public.set_transaction_splits(%L, %L)', tx, '[]'),
    'split_adjustment');

  SELECT balance INTO book_balance FROM public.account_balances WHERE id = acc;
  ASSERT public.reconcile_account(acc, book_balance, current_date) = 0, 'zero reconciliation creates no adjustment';
  ASSERT (SELECT count(*) FROM public.transactions WHERE account_id = acc AND kind = 'adjustment') = 1,
    'zero reconciliation creates no movement';
  ASSERT public.reconcile_account(acc, book_balance - 2500, current_date) = -2500, 'negative reconciliation delta';
  ASSERT (SELECT balance FROM public.account_balances WHERE id = acc) = book_balance - 2500, 'negative adjustment changes account balance';
  ASSERT (SELECT count(*) FROM public.transactions WHERE account_id = acc AND kind = 'adjustment') = 2,
    'positive and negative adjustments are stored';

  SELECT balance INTO actual FROM public.account_balances WHERE id = acc;
  PERFORM pg_temp.expect_error(format(
    'SELECT public.reconcile_account(%L, 100, current_date)', current_setting('test.b_acc')::uuid),
    'reconciliation_invalid_account');
  ASSERT (SELECT balance FROM public.account_balances WHERE id = acc) = actual, 'failed foreign-account reconciliation changes nothing';
END $$;

-- Budgets, still as user A.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  usd uuid;
  food uuid;
  bid uuid;
  book_balance bigint;
BEGIN
  SELECT id INTO main_acc FROM public.accounts WHERE name = 'Con movimientos';
  SELECT id INTO usd FROM public.accounts WHERE name = 'USD A';
  SELECT id INTO food FROM public.categories WHERE name = 'Alimentación' AND parent_id IS NULL;

  INSERT INTO public.budgets (user_id, category_id, period_start, amount)
  VALUES (uid, food, '2026-09-15', 30000) RETURNING id INTO bid;
  ASSERT (SELECT period_start FROM public.budgets WHERE id = bid) = '2026-09-01', 'period normalised to month start';

  INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on, category_id) VALUES
    (uid, main_acc, 'expense', -12000, '2026-09-10', (SELECT id FROM public.categories WHERE name = 'Supermercado')),
    (uid, main_acc, 'expense', -6000, '2026-09-11', (SELECT id FROM public.categories WHERE name = 'Restaurantes')),
    (uid, usd, 'expense', -5000, '2026-09-12', (SELECT id FROM public.categories WHERE name = 'Supermercado')),
    (uid, main_acc, 'expense', -999, '2026-08-31', (SELECT id FROM public.categories WHERE name = 'Supermercado'));
  SELECT a.opening_balance + coalesce(sum(t.amount), 0)::bigint INTO book_balance
  FROM public.accounts a
  LEFT JOIN public.transactions t ON t.account_id = a.id AND t.user_id = uid AND t.occurred_on <= '2026-09-12'
  WHERE a.id = main_acc
  GROUP BY a.opening_balance;
  PERFORM public.reconcile_account(main_acc, book_balance + 5000, '2026-09-12');
  PERFORM public.reconcile_account(main_acc, book_balance + 2500, '2026-09-12');
  ASSERT (SELECT spent FROM public.budget_progress('2026-09-20') WHERE budget_id = bid) = 18000,
    'spent excludes adjustment signs, other currencies and months';

  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.budgets (user_id, category_id, period_start, amount) VALUES (%L, (SELECT id FROM public.categories WHERE name = 'Nómina'), '2026-09-01', 100)$q$,
    uid), 'budget_invalid_category');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.budgets (user_id, category_id, period_start, amount) VALUES (%L, %L, '2026-10-01', 0)$q$,
    uid, food), 'budget_invalid_amount');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.budgets (user_id, category_id, period_start, amount) VALUES (%L, %L, '2026-10-01', 100)$q$,
    uid, current_setting('test.b_cat')), 'budget_invalid_category');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.budgets (user_id, category_id, period_start, amount) VALUES (%L, %L, '2026-09-02', 1)$q$,
    uid, food), 'budget_period_overlap');

  INSERT INTO public.budgets (user_id, category_id, period_start, amount) VALUES
    (uid, food, '2026-08-01', 1000),
    (uid, (SELECT id FROM public.categories WHERE name = 'Restaurantes'), '2026-08-01', 5000);
  ASSERT public.copy_budgets('2026-08-01', '2026-09-01') = 1, 'copy creates only missing budgets';
  ASSERT (SELECT amount FROM public.budgets WHERE id = bid) = 30000, 'existing budget untouched by copy';
END $$;

-- Monthly budget settlements are owner-only, atomic and idempotent.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  period date := (date_trunc('year', current_date) - interval '1 year')::date;
  source_category uuid;
  target_category uuid;
  source_budget uuid;
  target_budget uuid;
  goal uuid;
  overflow_goal uuid;
  foreign_goal uuid := current_setting('test.b_goal')::uuid;
  closure uuid;
  settlement uuid;
  retry uuid;
  goal_before bigint;
  overflow_before bigint;
  transactions_before bigint;
BEGIN
  INSERT INTO public.categories (user_id, kind, name)
  VALUES (uid, 'expense', 'Cierre origen')
  RETURNING id INTO source_category;
  INSERT INTO public.categories (user_id, kind, name)
  VALUES (uid, 'expense', 'Cierre destino')
  RETURNING id INTO target_category;
  INSERT INTO public.budgets (user_id, category_id, period_start, period, amount)
  VALUES (uid, source_category, period, 'monthly', 30000)
  RETURNING id INTO source_budget;
  INSERT INTO public.budgets (user_id, category_id, period_start, period, amount)
  VALUES (uid, target_category, period, 'monthly', 5000)
  RETURNING id INTO target_budget;
  INSERT INTO public.transactions (user_id, account_id, category_id, kind, amount, occurred_on)
  VALUES
    (uid, (SELECT id FROM public.accounts WHERE name = 'Con movimientos'), source_category, 'expense', -20000, period + 10),
    (uid, (SELECT id FROM public.accounts WHERE name = 'Con movimientos'), target_category, 'expense', -6000, period + 11);
  INSERT INTO public.savings_goals (user_id, name, target_amount, currency)
  VALUES (uid, 'Meta cierre EUR', 100000, 'EUR')
  RETURNING id INTO goal;
  INSERT INTO public.savings_goals (user_id, name, target_amount, currency)
  VALUES (uid, 'Meta cierre USD', 100000, 'USD');
  INSERT INTO public.savings_goals (user_id, name, target_amount, current_amount, currency)
  VALUES (uid, 'Meta límite', 9223372036854775807, 9223372036854775800, 'EUR')
  RETURNING id INTO overflow_goal;

  ASSERT public.apply_budget_settlement(source_budget, period, 'reallocation', 1000,
    'closure-reallocation', target_budget, NULL, period) IS NOT NULL, 'reallocation recorded';
  SELECT id INTO closure FROM public.budget_closures
  WHERE budget_id = source_budget AND period_start = period;
  ASSERT (SELECT status FROM public.budget_closures WHERE id = closure) = 'open', 'partial close remains resumable';
  PERFORM pg_temp.expect_error(format('SELECT public.complete_budget_closure(%L, %L)', source_budget, period),
    'budget_closure_remainder_pending');

  SELECT current_amount INTO goal_before FROM public.savings_goals WHERE id = goal;
  SELECT count(*) INTO transactions_before FROM public.transactions;
  PERFORM pg_temp.expect_error(format(
    'SELECT public.apply_budget_settlement(%L, %L, %L, 1, %L, NULL, %L, NULL)',
    source_budget, period, 'goal', 'closure-foreign-goal', foreign_goal), 'budget_invalid_goal');
  PERFORM pg_temp.expect_error(format(
    'SELECT public.apply_budget_settlement(%L, %L, %L, 1, %L, NULL, (SELECT id FROM public.savings_goals WHERE name = %L), NULL)',
    source_budget, period, 'goal', 'closure-wrong-currency', 'Meta cierre USD'), 'budget_invalid_goal');
  ASSERT (SELECT count(*) FROM public.budget_settlements WHERE user_id = uid
          AND idempotency_key IN ('closure-foreign-goal', 'closure-wrong-currency')) = 0,
    'failed goal allocations leave no settlement record';
  ASSERT (SELECT current_amount FROM public.savings_goals WHERE id = goal) = goal_before,
    'failed goal allocations leave goal unchanged';
  ASSERT (SELECT count(*) FROM public.transactions) = transactions_before,
    'virtual closures do not create bank movements';

  SELECT current_amount INTO overflow_before FROM public.savings_goals WHERE id = overflow_goal;
  BEGIN
    PERFORM public.apply_budget_settlement(source_budget, period, 'goal', 100,
      'closure-overflow', NULL, overflow_goal, NULL);
    RAISE EXCEPTION 'overflowing goal update must fail';
  EXCEPTION WHEN numeric_value_out_of_range THEN NULL;
  END;
  ASSERT NOT EXISTS (SELECT 1 FROM public.budget_settlements WHERE idempotency_key = 'closure-overflow'),
    'failed goal update rolls back its settlement';
  ASSERT (SELECT current_amount FROM public.savings_goals WHERE id = overflow_goal) = overflow_before,
    'failed goal update leaves goal balance unchanged';

  settlement := public.apply_budget_settlement(source_budget, period, 'goal', 4000,
    'closure-goal', NULL, goal, NULL);
  retry := public.apply_budget_settlement(source_budget, period, 'goal', 4000,
    'closure-goal', NULL, goal, NULL);
  ASSERT retry = settlement, 'same idempotency key returns the recorded settlement';
  ASSERT (SELECT current_amount FROM public.savings_goals WHERE id = goal) = goal_before + 4000,
    'retry does not double the goal contribution';
  ASSERT public.apply_budget_settlement(source_budget, period, 'rollover', 3000,
    'closure-rollover', source_budget, NULL, (period + interval '1 month')::date) IS NOT NULL,
    'rollover recorded for next month';
  ASSERT public.apply_budget_settlement(source_budget, period, 'expire', 2000,
    'closure-expire', NULL, NULL, NULL) IS NOT NULL, 'expired remainder recorded';
  ASSERT (SELECT status FROM public.budget_closures WHERE id = closure) = 'completed',
    'closure completes when all positive remainder is allocated';
  ASSERT public.complete_budget_closure(source_budget, period) = closure,
    'completing an already completed closure is idempotent';

  PERFORM pg_temp.expect_error(format(
    'UPDATE public.budget_closures SET status = %L WHERE id = %L', 'open', closure),
    'budget_operation_protected');
  PERFORM pg_temp.expect_error(format(
    'DELETE FROM public.budget_settlements WHERE id = %L', settlement),
    'budget_operation_protected');
  ASSERT (SELECT current_amount FROM public.savings_goals WHERE id = goal) = goal_before + 4000,
    'settlement leaves unrelated data unchanged';
END $$;

-- Scheduled transactions, still as user A.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  rent uuid;
  once uuid;
  tx uuid;
BEGIN
  ASSERT public.next_occurrence('2026-01-31', 'monthly', '2026-01-31') = '2026-02-28', 'jan 31 -> feb 28';
  ASSERT public.next_occurrence('2026-01-31', 'monthly', '2026-02-28') = '2026-03-31', 'feb 28 -> mar 31 (no drift)';
  ASSERT public.next_occurrence('2026-01-31', 'quarterly', '2026-01-31') = '2026-04-30', 'quarterly';
  ASSERT public.next_occurrence('2026-01-01', 'biweekly', '2026-01-01') = '2026-01-15', 'biweekly';
  ASSERT public.next_occurrence('2026-01-01', 'none', '2026-01-01') IS NULL, 'none has no next';

  SELECT id INTO main_acc FROM public.accounts WHERE name = 'Con movimientos';
  INSERT INTO public.scheduled_transactions
    (user_id, account_id, kind, amount, description, recurrence, starts_on, ends_on, next_run_on, is_estimated)
  VALUES (uid, main_acc, 'expense', -80000, 'Alquiler', 'monthly', '2026-10-01', '2026-11-15', '2000-01-01', true)
  RETURNING id INTO rent;
  ASSERT (SELECT next_run_on FROM public.scheduled_transactions WHERE id = rent) = '2026-10-01', 'first run is starts_on';

  tx := public.post_scheduled(rent);
  ASSERT (SELECT amount FROM public.transactions WHERE id = tx) = -80000, 'posted with scheduled amount';
  ASSERT (SELECT scheduled_transaction_id FROM public.transactions WHERE id = tx) = rent, 'posted tx linked';
  ASSERT (SELECT next_run_on FROM public.scheduled_transactions WHERE id = rent) = '2026-11-01', 'advanced one month';

  tx := public.post_scheduled(rent, '2026-11-03', 6430);
  ASSERT (SELECT amount FROM public.transactions WHERE id = tx) = -6430, 'estimated amount overridden';
  ASSERT (SELECT occurred_on FROM public.transactions WHERE id = tx) = '2026-11-03', 'date overridden';
  ASSERT NOT (SELECT is_active FROM public.scheduled_transactions WHERE id = rent), 'inactive after ends_on';
  PERFORM pg_temp.expect_error(format('SELECT public.post_scheduled(%L)', rent), 'scheduled_inactive');

  INSERT INTO public.scheduled_transactions
    (user_id, account_id, kind, amount, description, recurrence, starts_on, next_run_on)
  VALUES (uid, main_acc, 'income', 10000, 'Devolución', 'none', '2026-10-05', '2026-10-05')
  RETURNING id INTO once;
  PERFORM public.skip_scheduled(once);
  ASSERT NOT (SELECT is_active FROM public.scheduled_transactions WHERE id = once), 'one-off inactive after skip';

  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.scheduled_transactions (user_id, account_id, kind, amount, description, recurrence, starts_on, next_run_on) VALUES (%L, %L, 'transfer', 100, 'x', 'monthly', '2026-10-01', '2026-10-01')$q$,
    uid, main_acc), 'scheduled_invalid_kind');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.scheduled_transactions (user_id, account_id, kind, amount, description, recurrence, starts_on, ends_on, next_run_on) VALUES (%L, %L, 'expense', -100, 'x', 'monthly', '2026-10-01', '2026-09-01', '2026-10-01')$q$,
    uid, main_acc), 'scheduled_invalid_dates');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.scheduled_transactions (user_id, account_id, kind, amount, description, recurrence, starts_on, next_run_on) VALUES (%L, %L, 'expense', -100, 'x', 'monthly', '2026-10-01', '2026-10-01')$q$,
    uid, current_setting('test.b_acc')), 'transaction_invalid_account');

  DELETE FROM public.scheduled_transactions WHERE id = rent;
  ASSERT (SELECT count(*) FROM public.transactions WHERE scheduled_transaction_id = rent) = 2, 'posted tx kept after delete';
END $$;

-- Savings goals, still as user A.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  goal uuid;
BEGIN
  INSERT INTO public.savings_goals (user_id, name, target_amount, currency, account_id)
  VALUES (uid, 'Vacaciones', 200000, 'EUR', (SELECT id FROM public.accounts WHERE name = 'Ahorro A'))
  RETURNING id INTO goal;
  ASSERT (SELECT status FROM public.savings_goals WHERE id = goal) = 'active', 'new goal active';

  ASSERT public.adjust_goal(goal, 25000) = 25000, 'contribution';
  PERFORM pg_temp.expect_error(format('SELECT public.adjust_goal(%L, -30000)', goal), 'goal_negative_amount');
  PERFORM public.adjust_goal(goal, 175000);
  ASSERT (SELECT status FROM public.savings_goals WHERE id = goal) = 'achieved', 'achieved at target';
  PERFORM public.adjust_goal(goal, -1000);
  ASSERT (SELECT status FROM public.savings_goals WHERE id = goal) = 'active', 'back to active below target';

  UPDATE public.savings_goals SET status = 'archived' WHERE id = goal;
  PERFORM public.adjust_goal(goal, 1000);
  ASSERT (SELECT status FROM public.savings_goals WHERE id = goal) = 'archived', 'archived stays archived';

  PERFORM pg_temp.expect_error(format(
    $q$UPDATE public.savings_goals SET account_id = (SELECT id FROM public.accounts WHERE name = 'USD A') WHERE id = %L$q$, goal),
    'goal_invalid_account');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.savings_goals (user_id, name, target_amount, account_id) VALUES (%L, 'x', 100, %L)$q$,
    uid, current_setting('test.b_acc')), 'goal_invalid_account');
  PERFORM pg_temp.expect_error(format(
    $q$INSERT INTO public.savings_goals (user_id, name, target_amount) VALUES (%L, 'x', 0)$q$, uid), 'goal_invalid_target');
END $$;

-- Reports, still as user A. September 2026 has (EUR): -12000 Supermercado, -6000 Restaurantes; USD and August rows excluded.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  savings uuid;
BEGIN
  SELECT id INTO main_acc FROM public.accounts WHERE name = 'Con movimientos';
  SELECT id INTO savings FROM public.accounts WHERE name = 'Ahorro A';
  DELETE FROM public.transactions
  WHERE user_id = uid AND occurred_on BETWEEN '2026-06-01' AND '2026-09-30'
    AND category_id IS NULL AND kind <> 'adjustment';
  INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on, category_id) VALUES
    (uid, main_acc, 'income', 200000, '2026-09-01', (SELECT id FROM public.categories WHERE name = 'Nómina')),
    (uid, main_acc, 'expense', -500, '2026-09-02', NULL),
    (uid, main_acc, 'expense', -2000, '2026-07-10', (SELECT id FROM public.categories WHERE name = 'Salud'));
  PERFORM public.create_transfer(main_acc, savings, 10000, '2026-09-03');

  ASSERT (SELECT count(*) FROM public.monthly_totals('2026-06-01', '2026-09-30')) = 4, 'one row per month';
  ASSERT (SELECT income FROM public.monthly_totals('2026-06-01', '2026-09-30') WHERE month = '2026-09-01') = 200000, 'income';
  ASSERT (SELECT expense FROM public.monthly_totals('2026-06-01', '2026-09-30') WHERE month = '2026-09-01') = 18500,
    'expense excludes transfers, other currencies';
  ASSERT (SELECT expense FROM public.monthly_totals('2026-06-01', '2026-09-30') WHERE month = '2026-06-01') = 0, 'empty month is 0';

  ASSERT (SELECT total FROM public.expenses_by_category('2026-09-01', '2026-09-30') WHERE name = 'Alimentación') = 18000,
    'children rolled up into parent';
  ASSERT (SELECT total FROM public.expenses_by_category('2026-09-01', '2026-09-30') WHERE category_id IS NULL) = 500,
    'uncategorised bucket';
END $$;

-- Splits, still as user A (after the report assertions above).
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  tx uuid;
  restaurants uuid;
  health uuid;
  food_budget uuid;
  g uuid;
BEGIN
  SELECT id INTO main_acc FROM public.accounts WHERE name = 'Con movimientos';
  SELECT id INTO restaurants FROM public.categories WHERE name = 'Restaurantes';
  SELECT id INTO health FROM public.categories WHERE name = 'Salud';
  SELECT b.id INTO food_budget FROM public.budgets b JOIN public.categories c ON c.id = b.category_id
    WHERE c.name = 'Alimentación' AND c.parent_id IS NULL AND b.period_start = '2026-09-01';
  INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on, category_id)
  VALUES (uid, main_acc, 'expense', -10000, '2026-09-20', (SELECT id FROM public.categories WHERE name = 'Supermercado'))
  RETURNING id INTO tx;

  PERFORM public.set_transaction_splits(tx, jsonb_build_array(
    jsonb_build_object('category_id', restaurants, 'amount', 4000),
    jsonb_build_object('category_id', health, 'amount', 6000)));
  ASSERT (SELECT category_id FROM public.transactions WHERE id = tx) IS NULL, 'parent category cleared';
  ASSERT (SELECT count(*) FROM public.transaction_lines WHERE transaction_id = tx) = 2, 'one line per split';
  ASSERT (SELECT sum(amount) FROM public.transaction_splits WHERE transaction_id = tx) = -10000, 'signed like parent';
  ASSERT (SELECT total FROM public.expenses_by_category('2026-09-01', '2026-09-30') WHERE name = 'Salud') = 6000, 'split counted in its category';
  ASSERT (SELECT total FROM public.expenses_by_category('2026-09-01', '2026-09-30') WHERE name = 'Alimentación') = 22000, 'split rolled into parent category';
  ASSERT (SELECT spent FROM public.budget_progress('2026-09-01') WHERE budget_id = food_budget) = 22000, 'budget uses split lines';

  PERFORM pg_temp.expect_error(format($q$SELECT public.set_transaction_splits(%L, '[{"amount": 4000}, {"amount": 5000}]')$q$, tx), 'split_sum_mismatch');
  PERFORM pg_temp.expect_error(format($q$SELECT public.set_transaction_splits(%L, '[{"amount": 10000}]')$q$, tx), 'split_too_few');
  PERFORM pg_temp.expect_error(format($q$SELECT public.set_transaction_splits(%L, '[{"amount": 12000}, {"amount": -2000}]')$q$, tx), 'transaction_invalid_amount');
  PERFORM pg_temp.expect_error(format($q$SELECT public.set_transaction_splits(%L, jsonb_build_array(jsonb_build_object('category_id', %L, 'amount', 5000), jsonb_build_object('amount', 5000)))$q$,
    tx, (SELECT id FROM public.categories WHERE name = 'Nómina')), 'transaction_invalid_category');
  PERFORM pg_temp.expect_error(format('SELECT public.set_transaction_splits(%L, %L)', gen_random_uuid(), '[]'), 'transaction_not_found');
  ASSERT (SELECT count(*) FROM public.transaction_splits WHERE transaction_id = tx) = 2, 'failed calls keep previous splits';

  SET CONSTRAINTS ALL IMMEDIATE;
  PERFORM pg_temp.expect_error(format('UPDATE public.transactions SET amount = -12000 WHERE id = %L', tx), 'split_sum_mismatch');
  PERFORM pg_temp.expect_error(format('DELETE FROM public.transaction_splits WHERE id = (SELECT id FROM public.transaction_splits WHERE transaction_id = %L LIMIT 1)', tx), 'split_sum_mismatch');
  SET CONSTRAINTS ALL DEFERRED;

  g := public.create_transfer(main_acc, (SELECT id FROM public.accounts WHERE name = 'Ahorro A'), 500, '2026-09-21');
  PERFORM pg_temp.expect_error(format('SELECT public.set_transaction_splits((SELECT id FROM public.transactions WHERE transfer_group_id = %L LIMIT 1), %L)', g, '[]'), 'split_transfer');

  PERFORM public.set_transaction_splits(tx, '[]');
  ASSERT (SELECT count(*) FROM public.transaction_lines WHERE transaction_id = tx) = 1, 'splits removed';
  ASSERT (SELECT amount FROM public.transactions WHERE id = tx) = -10000, 'amount kept';
  DELETE FROM public.transactions WHERE id = tx OR transfer_group_id = g;
END $$;

-- Multi-currency, as user A. Without rates, foreign amounts are left out.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
BEGIN
  BEGIN
    INSERT INTO public.exchange_rates (base, quote, rate_date, rate) VALUES ('EUR', 'USD', '2026-09-01', 1.1);
    RAISE EXCEPTION 'users must not write exchange rates';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on, category_id)
  VALUES (uid, (SELECT id FROM public.accounts WHERE name = 'USD A'), 'expense', -1250, '2026-08-15',
          (SELECT id FROM public.categories WHERE name = 'Restaurantes'));
  ASSERT (SELECT expense FROM public.monthly_totals('2026-08-01', '2026-08-31')) = 999, 'USD ignored without rates';
  ASSERT public.fx_rate('USD', 'EUR', '2026-08-15') IS NULL, 'no rate yet';
  ASSERT public.fx_rate('EUR', 'EUR', '2026-08-15') = 1, 'same currency';
END $$;

RESET ROLE;
INSERT INTO public.exchange_rates (base, quote, rate_date, rate)
VALUES ('EUR', 'USD', '2026-06-01', 1.0), ('EUR', 'USD', '2026-09-01', 1.25), ('EUR', 'GBP', '2026-09-01', 0.8);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  usd uuid;
  ars uuid;
  g uuid;
  nw record;
BEGIN
  SELECT id INTO main_acc FROM public.accounts WHERE name = 'Con movimientos';
  SELECT id INTO usd FROM public.accounts WHERE name = 'USD A';

  ASSERT public.fx_rate('USD', 'EUR', '2026-09-12') = 0.8, 'uses latest rate on or before the date';
  ASSERT public.fx_rate('USD', 'EUR', '2026-07-01') = 1, 'older rate for July';
  ASSERT public.fx_rate('USD', 'EUR', '2026-01-01') = 1, 'nearest later rate when none before';
  ASSERT public.fx_rate('USD', 'GBP', '2026-09-12') = 0.64, 'cross rate via EUR';
  ASSERT public.fx_rate('ARS', 'EUR', '2026-09-12') IS NULL, 'unknown currency';
  ASSERT public.convert_amount(-5000, 'USD', 'EUR', '2026-09-12') = -4000, 'conversion';

  ASSERT (SELECT expense FROM public.monthly_totals('2026-08-01', '2026-08-31')) = 2249, 'USD converted in totals';
  ASSERT (SELECT total FROM public.expenses_by_category('2026-08-01', '2026-08-31') WHERE name = 'Alimentación') = 2249,
    'USD converted by category';
  ASSERT (SELECT spent FROM public.budget_progress('2026-08-01') bp JOIN public.categories c ON c.id = bp.category_id
          WHERE c.name = 'Alimentación' AND c.parent_id IS NULL) = 2249, 'USD converted in budgets';

  SELECT * INTO nw FROM public.net_worth();
  ASSERT nw.currency = 'EUR' AND nw.missing = '{}', 'all currencies convertible';
  INSERT INTO public.accounts (user_id, name, currency, opening_balance) VALUES (uid, 'Pesos', 'ARS', 100000) RETURNING id INTO ars;
  SELECT * INTO nw FROM public.net_worth();
  ASSERT nw.missing = '{ARS}', 'ARS reported as missing';

  g := public.create_transfer(main_acc, usd, 10000, '2026-09-25', NULL, NULL, 12000);
  ASSERT (SELECT amount FROM public.transactions WHERE transfer_group_id = g AND account_id = usd) = 12000, 'destination credited in USD';
  ASSERT (SELECT amount FROM public.transactions WHERE transfer_group_id = g AND account_id = main_acc) = -10000, 'source debited in EUR';
  PERFORM public.update_transfer(g, main_acc, usd, 20000, '2026-09-25', NULL, NULL, 25000);
  ASSERT (SELECT amount FROM public.transactions WHERE transfer_group_id = g AND account_id = usd) = 25000, 'update credits new amount';
  PERFORM pg_temp.expect_error(format('SELECT public.update_transfer(%L, %L, %L, 100, current_date)', g, main_acc, usd), 'transfer_to_amount_required');

  DELETE FROM public.transactions WHERE transfer_group_id = g OR (account_id = usd AND occurred_on = '2026-08-15');
  DELETE FROM public.accounts WHERE id = ars;
END $$;

-- Goal contributions with transfers, as user A.
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  savings uuid;
  goal uuid;
  loose uuid;
  main_before bigint;
  savings_before bigint;
BEGIN
  SELECT id INTO main_acc FROM public.accounts WHERE name = 'Con movimientos';
  SELECT id INTO savings FROM public.accounts WHERE name = 'Ahorro A';
  SELECT balance INTO main_before FROM public.account_balances WHERE id = main_acc;
  SELECT balance INTO savings_before FROM public.account_balances WHERE id = savings;
  INSERT INTO public.savings_goals (user_id, name, target_amount, account_id) VALUES (uid, 'Coche', 50000, savings) RETURNING id INTO goal;
  INSERT INTO public.savings_goals (user_id, name, target_amount) VALUES (uid, 'Suelta', 50000) RETURNING id INTO loose;

  ASSERT public.adjust_goal(goal, 10000, main_acc, '2026-09-26') = 10000, 'contribution with transfer';
  ASSERT (SELECT balance FROM public.account_balances WHERE id = main_acc) = main_before - 10000, 'source debited';
  ASSERT (SELECT balance FROM public.account_balances WHERE id = savings) = savings_before + 10000, 'goal account credited';
  ASSERT (SELECT count(*) FROM public.transactions WHERE goal_id = goal) = 2, 'both legs linked to the goal';
  ASSERT (SELECT description FROM public.transactions WHERE goal_id = goal LIMIT 1) = 'Aportación a Coche', 'description';

  ASSERT public.adjust_goal(goal, -3000, main_acc) = 7000, 'withdrawal with transfer';
  ASSERT (SELECT balance FROM public.account_balances WHERE id = savings) = savings_before + 7000, 'goal account debited';

  PERFORM pg_temp.expect_error(format('SELECT public.adjust_goal(%L, -20000, %L)', goal, main_acc), 'goal_negative_amount');
  ASSERT (SELECT count(*) FROM public.transactions WHERE goal_id = goal) = 4, 'failed withdrawal leaves no transfer';
  PERFORM pg_temp.expect_error(format('SELECT public.adjust_goal(%L, 100, %L)', loose, main_acc), 'goal_no_account');
  PERFORM pg_temp.expect_error(format('SELECT public.adjust_goal(%L, 100, %L)', goal, savings), 'transfer_same_account');
  PERFORM pg_temp.expect_error(format('SELECT public.adjust_goal(%L, 100, %L)', goal, (SELECT id FROM public.accounts WHERE name = 'USD A')),
    'transfer_to_amount_required');
  ASSERT public.adjust_goal(loose, 500) = 500, 'plain adjustment still works';

  DELETE FROM public.savings_goals WHERE id IN (goal, loose);
  ASSERT (SELECT count(*) FROM public.transactions WHERE description LIKE '%Coche') = 4, 'transfers kept after deleting the goal';
  DELETE FROM public.transactions WHERE description LIKE '%Coche';
END $$;

-- Auto-post: users cannot run the cron function.
DO $$
BEGIN
  BEGIN
    PERFORM public.post_due_scheduled();
    RAISE EXCEPTION 'users must not run post_due_scheduled';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
DO $$
DECLARE
  uid uuid := '00000000-0000-0000-0000-00000000000a';
  main_acc uuid;
  closed uuid;
  monthly uuid;
  late_tz uuid;
  broken uuid;
  manual uuid;
BEGIN
  SELECT id INTO main_acc FROM public.accounts WHERE user_id = uid AND name = 'Con movimientos';
  INSERT INTO public.accounts (user_id, name) VALUES (uid, 'Cerrada') RETURNING id INTO closed;
  INSERT INTO public.scheduled_transactions (user_id, account_id, kind, amount, description, recurrence, starts_on, next_run_on, auto_post)
  VALUES (uid, main_acc, 'expense', -1500, 'Gimnasio', 'monthly', '2026-07-10', '2026-07-10', true) RETURNING id INTO monthly;
  INSERT INTO public.scheduled_transactions (user_id, account_id, kind, amount, description, recurrence, starts_on, next_run_on, auto_post)
  VALUES (uid, main_acc, 'expense', -100, 'Madrid', 'none', '2026-09-16', '2026-09-16', true) RETURNING id INTO late_tz;
  INSERT INTO public.scheduled_transactions (user_id, account_id, kind, amount, description, recurrence, starts_on, next_run_on, auto_post)
  VALUES (uid, closed, 'expense', -100, 'Rota', 'monthly', '2026-09-01', '2026-09-01', true) RETURNING id INTO broken;
  INSERT INTO public.scheduled_transactions (user_id, account_id, kind, amount, description, recurrence, starts_on, next_run_on)
  VALUES (uid, main_acc, 'expense', -100, 'Manual', 'monthly', '2026-09-01', '2026-09-01') RETURNING id INTO manual;
  UPDATE public.accounts SET is_archived = true WHERE id = closed;

  -- 22:30 UTC on the 15th is already the 16th in Europe/Madrid.
  ASSERT public.post_due_scheduled('2026-09-15 22:30+00') = 4, 'posts 3 monthly catch-ups + 1 local-date one-off';
  ASSERT (SELECT count(*) FROM public.transactions WHERE scheduled_transaction_id = monthly) = 3, 'catch-up posts';
  ASSERT (SELECT next_run_on FROM public.scheduled_transactions WHERE id = monthly) = '2026-10-10', 'advanced past today';
  ASSERT NOT (SELECT is_active FROM public.scheduled_transactions WHERE id = late_tz), 'one-off done';
  ASSERT NOT EXISTS (SELECT 1 FROM public.transactions WHERE scheduled_transaction_id = broken), 'failing schedule skipped';
  ASSERT NOT EXISTS (SELECT 1 FROM public.transactions WHERE scheduled_transaction_id = manual), 'manual schedules untouched';
  ASSERT public.post_due_scheduled('2026-09-15 22:30+00') = 0, 'idempotent';

  BEGIN
    UPDATE public.scheduled_transactions SET is_estimated = true WHERE id = monthly;
    RAISE EXCEPTION 'estimated auto_post must fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  DELETE FROM public.scheduled_transactions WHERE id IN (monthly, late_tz, broken, manual);
END $$;

-- Act as anonymous visitor.
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.profiles) = 0, 'anon must not see profiles';
  ASSERT (SELECT count(*) FROM public.accounts) = 0, 'anon must not see accounts';
  ASSERT (SELECT count(*) FROM public.transactions) = 0, 'anon must not see transactions';
  ASSERT (SELECT count(*) FROM public.account_balances) = 0, 'anon must not see account balances';
END $$;

-- Deleting the user still cascades through accounts with transactions.
RESET ROLE;
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-00000000000a';
DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = '00000000-0000-0000-0000-00000000000a'),
    'user deletion must cascade to accounts';
END $$;

-- delete_my_account removes only the caller (user B) and cascades.
INSERT INTO auth.users (id, email, aud, role)
VALUES ('00000000-0000-0000-0000-00000000000c', 'c@test.local', 'authenticated', 'authenticated');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
SELECT public.delete_my_account();
RESET ROLE;
DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-00000000000b'), 'caller deleted';
  ASSERT NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = '00000000-0000-0000-0000-00000000000b'), 'caller data cascaded';
  ASSERT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-00000000000c'), 'other users untouched';
END $$;

-- MFA: user C has a verified TOTP factor, so an aal1 session is locked out until aal2.
INSERT INTO auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-00000000000c', 'totp', 'verified', now(), now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated","aal":"aal1"}', true);
DO $$
BEGIN
  ASSERT public.has_verified_mfa(), 'C has verified MFA';
  ASSERT (SELECT count(*) FROM public.profiles) = 0, 'aal1 must not read profile';
  ASSERT (SELECT count(*) FROM public.categories) = 0, 'aal1 must not read categories';
  BEGIN
    INSERT INTO public.accounts (user_id, name) VALUES ('00000000-0000-0000-0000-00000000000c', 'x');
    RAISE EXCEPTION 'aal1 must not insert';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM pg_temp.expect_error('SELECT public.delete_my_account()', 'mfa_required');
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated","aal":"aal2"}', true);
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.profiles) = 1, 'aal2 reads own profile';
  ASSERT (SELECT count(*) FROM public.categories) = 20, 'aal2 reads own categories';
  INSERT INTO public.accounts (user_id, name) VALUES ('00000000-0000-0000-0000-00000000000c', 'Cuenta C');
  ASSERT (SELECT count(*) FROM public.accounts) = 1, 'aal2 writes';
END $$;
RESET ROLE;

SELECT 'RLS OK' AS result;
ROLLBACK;
