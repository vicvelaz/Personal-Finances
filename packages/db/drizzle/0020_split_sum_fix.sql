-- Custom SQL migration file, put your code below! --
-- NEW/OLD field access must be branched: the trigger runs on two tables with different columns.
CREATE OR REPLACE FUNCTION public.check_split_sum()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  tx_id uuid;
  parent bigint;
  parts bigint;
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    tx_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    tx_id := OLD.transaction_id;
  ELSE
    tx_id := NEW.transaction_id;
  END IF;
  SELECT amount INTO parent FROM public.transactions WHERE id = tx_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT sum(amount) INTO parts FROM public.transaction_splits WHERE transaction_id = tx_id;
  IF parts IS NOT NULL AND parts <> parent THEN
    RAISE EXCEPTION 'split_sum_mismatch' USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END;
$$;