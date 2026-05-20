-- =====================================================================
-- Phase 1a follow-up: ingredients master table + canonical units enum
-- =====================================================================

-- ---------- Canonical units enum ----------

create type public.unit_type as enum (
  'g', 'kg',
  'ml', 'l',
  'tsp', 'tbsp', 'cup', 'fl_oz',
  'oz', 'lb',
  'each', 'pinch'
);

-- ---------- Ingredients master table (restaurant-scoped) ----------

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  -- name_normalized: lowercased, whitespace-collapsed; used for dedupe lookups
  name_normalized text generated always as (lower(regexp_replace(trim(name), '\s+', ' ', 'g'))) stored,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name_normalized)
);
create index idx_ingredients_restaurant on public.ingredients(restaurant_id);
create index idx_ingredients_name_normalized on public.ingredients(restaurant_id, name_normalized);
create trigger trg_ingredients_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();

-- ---------- recipe_ingredients schema change ----------
-- The existing recipe_ingredients table currently has free-text ingredient_name + free-text unit.
-- We replace ingredient_name with a FK to ingredients, and change unit to the unit_type enum.
-- Safe because Phase 1c hasn't been built yet and recipe_ingredients has no rows.

-- Drop the old XOR check constraint; we'll re-add an updated one
alter table public.recipe_ingredients
  drop constraint if exists recipe_ingredients_check;

alter table public.recipe_ingredients
  drop column ingredient_name,
  add column ingredient_id uuid references public.ingredients(id) on delete restrict,
  drop column unit,
  add column unit public.unit_type;

create index idx_recipe_ingredients_ingredient on public.recipe_ingredients(ingredient_id);

-- New XOR: each row is either a real ingredient OR a sub-recipe reference, never both, never neither.
alter table public.recipe_ingredients add constraint recipe_ingredients_xor_check check (
  (ingredient_id is not null and sub_recipe_version_id is null)
  or
  (ingredient_id is null and sub_recipe_version_id is not null)
);

-- Ingredient rows must have a qty + unit. Sub-recipe rows must have a qty + unit too
-- (a sub-recipe usage still needs to say "200 g of leche de tigre").
alter table public.recipe_ingredients add constraint recipe_ingredients_qty_required check (
  qty is not null and unit is not null
);

-- ---------- Cross-restaurant guard: ingredient must belong to the same restaurant as the recipe ----------

create or replace function public.check_ingredient_same_restaurant()
returns trigger language plpgsql as $$
declare
  ing_restaurant uuid;
  rv_restaurant uuid;
begin
  if new.ingredient_id is not null then
    select restaurant_id into ing_restaurant from public.ingredients where id = new.ingredient_id;
    select restaurant_id into rv_restaurant from public.recipe_versions where id = new.recipe_version_id;
    if ing_restaurant is null then
      raise exception 'Ingredient % not found', new.ingredient_id;
    end if;
    if ing_restaurant <> rv_restaurant then
      raise exception 'Ingredient % belongs to a different restaurant than the recipe', new.ingredient_id;
    end if;
  end if;
  return new;
end; $$;
create trigger trg_recipe_ingredients_check_ingredient_restaurant
  before insert or update on public.recipe_ingredients
  for each row execute function public.check_ingredient_same_restaurant();

-- Same guard for sub-recipe references
create or replace function public.check_sub_recipe_same_restaurant()
returns trigger language plpgsql as $$
declare
  sub_restaurant uuid;
  rv_restaurant uuid;
begin
  if new.sub_recipe_version_id is not null then
    select restaurant_id into sub_restaurant from public.recipe_versions where id = new.sub_recipe_version_id;
    select restaurant_id into rv_restaurant from public.recipe_versions where id = new.recipe_version_id;
    if sub_restaurant <> rv_restaurant then
      raise exception 'Sub-recipe belongs to a different restaurant than the parent recipe';
    end if;
  end if;
  return new;
end; $$;
create trigger trg_recipe_ingredients_check_sub_recipe_restaurant
  before insert or update on public.recipe_ingredients
  for each row execute function public.check_sub_recipe_same_restaurant();

-- ---------- RLS for ingredients ----------

alter table public.ingredients enable row level security;

create policy "members all ingredients" on public.ingredients for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
