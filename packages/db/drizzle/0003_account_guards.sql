-- Custom SQL migration file, put your code below! --
-- Blocks deleting accounts that still have transactions, except when the delete cascades from the owner.
CREATE OR REPLACE FUNCTION public.prevent_account_delete_with_transactions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND EXISTS (SELECT 1 FROM public.transactions WHERE account_id = OLD.id) THEN
    RAISE EXCEPTION 'account_has_transactions' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS accounts_prevent_delete_with_transactions ON public.accounts;--> statement-breakpoint
CREATE TRIGGER accounts_prevent_delete_with_transactions
  BEFORE DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_account_delete_with_transactions();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.prevent_account_currency_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'account_currency_immutable' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS accounts_prevent_currency_change ON public.accounts;--> statement-breakpoint
CREATE TRIGGER accounts_prevent_currency_change
  BEFORE UPDATE OF currency ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_account_currency_change();