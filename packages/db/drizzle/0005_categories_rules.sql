-- Custom SQL migration file, put your code below! --
-- Case-insensitive name uniqueness per parent; NULLS NOT DISTINCT so it also applies to top-level categories.
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_parent_uq
  ON public.categories (user_id, lower(name), parent_id) NULLS NOT DISTINCT;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.validate_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  par record;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.parent_id = NEW.id THEN
      RAISE EXCEPTION 'category_invalid_parent' USING ERRCODE = 'P0001';
    END IF;
    SELECT user_id, kind, parent_id INTO par FROM public.categories WHERE id = NEW.parent_id;
    IF NOT FOUND OR par.user_id <> NEW.user_id OR par.kind <> NEW.kind OR par.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'category_invalid_parent' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE'
     AND (NEW.parent_id IS NOT NULL OR NEW.kind <> OLD.kind)
     AND EXISTS (SELECT 1 FROM public.categories WHERE parent_id = NEW.id) THEN
    RAISE EXCEPTION 'category_has_children' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS categories_validate ON public.categories;--> statement-breakpoint
CREATE TRIGGER categories_validate
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.validate_category();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.prevent_category_delete_with_children()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND EXISTS (SELECT 1 FROM public.categories WHERE parent_id = OLD.id) THEN
    RAISE EXCEPTION 'category_has_children' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS categories_prevent_delete_with_children ON public.categories;--> statement-breakpoint
CREATE TRIGGER categories_prevent_delete_with_children
  BEFORE DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_category_delete_with_children();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.seed_default_categories(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  parent uuid;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('expense', 'Vivienda',      '#8B5CF6', ARRAY['Alquiler o hipoteca', 'Comunidad y mantenimiento']),
      ('expense', 'Suministros',   '#0EA5E9', ARRAY['Luz', 'Agua', 'Gas', 'Internet y teléfono']),
      ('expense', 'Alimentación',  '#22C55E', ARRAY['Supermercado', 'Restaurantes']),
      ('expense', 'Transporte',    '#F59E0B', ARRAY['Combustible', 'Transporte público']),
      ('expense', 'Salud',         '#EF4444', ARRAY[]::text[]),
      ('expense', 'Ocio',          '#EC4899', ARRAY[]::text[]),
      ('expense', 'Compras',       '#6366F1', ARRAY[]::text[]),
      ('expense', 'Otros gastos',  '#64748B', ARRAY[]::text[]),
      ('income',  'Nómina',        '#16A34A', ARRAY[]::text[]),
      ('income',  'Otros ingresos','#14B8A6', ARRAY[]::text[])
    ) AS v(kind, name, color, children)
  LOOP
    INSERT INTO public.categories (user_id, kind, name, color)
    VALUES (uid, r.kind::public.category_kind, r.name, r.color)
    RETURNING id INTO parent;
    INSERT INTO public.categories (user_id, kind, name, color, parent_id)
    SELECT uid, r.kind::public.category_kind, c, r.color, parent FROM unnest(r.children) AS c;
  END LOOP;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.seed_default_categories(uuid) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  PERFORM public.seed_default_categories(NEW.id);
  RETURN NEW;
END;
$$;--> statement-breakpoint
SELECT public.seed_default_categories(p.id)
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.user_id = p.id);