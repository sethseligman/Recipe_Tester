-- =====================================================================
-- Recipe Tester — Phase 1a Initial Schema
-- Tables, RLS, triggers for approval rules.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Helper functions ----------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Tables ----------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

create table public.restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);
create index idx_restaurant_members_user on public.restaurant_members(user_id);
create index idx_restaurant_members_restaurant on public.restaurant_members(restaurant_id);

create or replace function public.is_restaurant_member(rid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.restaurant_members
    where restaurant_id = rid and user_id = auth.uid()
  );
$$;

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  position int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_menus_restaurant on public.menus(restaurant_id);
create trigger trg_menus_updated_at before update on public.menus
  for each row execute function public.set_updated_at();

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sections_menu on public.sections(menu_id, position);
create index idx_sections_restaurant on public.sections(restaurant_id);
create trigger trg_sections_updated_at before update on public.sections
  for each row execute function public.set_updated_at();

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  menu_description text,
  position int not null default 0,
  plating_photo_url text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_dishes_section on public.dishes(section_id, position);
create index idx_dishes_restaurant on public.dishes(restaurant_id);
create trigger trg_dishes_updated_at before update on public.dishes
  for each row execute function public.set_updated_at();

create table public.components (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_components_restaurant on public.components(restaurant_id);
create trigger trg_components_updated_at before update on public.components
  for each row execute function public.set_updated_at();

create table public.dish_components (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  component_id uuid not null references public.components(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_dish_components_dish on public.dish_components(dish_id, position);
create index idx_dish_components_component on public.dish_components(component_id);
create index idx_dish_components_restaurant on public.dish_components(restaurant_id);

create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.components(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  version_number int not null,
  title text,
  yield_amount numeric,
  yield_unit text,
  method text,
  status text not null default 'draft'
    check (status in ('draft','testing','approved','archived')),
  created_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (component_id, version_number)
);
create index idx_recipe_versions_component on public.recipe_versions(component_id);
create index idx_recipe_versions_restaurant on public.recipe_versions(restaurant_id);
create index idx_recipe_versions_status on public.recipe_versions(status);
create trigger trg_recipe_versions_updated_at before update on public.recipe_versions
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  position int not null default 0,
  ingredient_name text,
  sub_recipe_version_id uuid references public.recipe_versions(id) on delete restrict,
  qty numeric,
  unit text,
  prep_note text,
  created_at timestamptz not null default now(),
  check (
    (ingredient_name is not null and sub_recipe_version_id is null)
    or
    (ingredient_name is null and sub_recipe_version_id is not null)
  )
);
create index idx_recipe_ingredients_version on public.recipe_ingredients(recipe_version_id, position);
create index idx_recipe_ingredients_sub_recipe on public.recipe_ingredients(sub_recipe_version_id);
create index idx_recipe_ingredients_restaurant on public.recipe_ingredients(restaurant_id);

-- ---------- Triggers: auto-set restaurant_id from parent ----------

create or replace function public.set_section_restaurant_id()
returns trigger language plpgsql as $$
begin
  select restaurant_id into new.restaurant_id from public.menus where id = new.menu_id;
  return new;
end; $$;
create trigger trg_sections_restaurant before insert or update of menu_id on public.sections
  for each row execute function public.set_section_restaurant_id();

create or replace function public.set_dish_restaurant_id()
returns trigger language plpgsql as $$
begin
  select restaurant_id into new.restaurant_id from public.sections where id = new.section_id;
  return new;
end; $$;
create trigger trg_dishes_restaurant before insert or update of section_id on public.dishes
  for each row execute function public.set_dish_restaurant_id();

create or replace function public.set_dish_component_restaurant_id()
returns trigger language plpgsql as $$
begin
  select restaurant_id into new.restaurant_id from public.dishes where id = new.dish_id;
  return new;
end; $$;
create trigger trg_dish_components_restaurant before insert or update of dish_id on public.dish_components
  for each row execute function public.set_dish_component_restaurant_id();

create or replace function public.set_recipe_version_restaurant_id()
returns trigger language plpgsql as $$
begin
  select restaurant_id into new.restaurant_id from public.components where id = new.component_id;
  return new;
end; $$;
create trigger trg_recipe_versions_restaurant before insert or update of component_id on public.recipe_versions
  for each row execute function public.set_recipe_version_restaurant_id();

create or replace function public.set_recipe_ingredient_restaurant_id()
returns trigger language plpgsql as $$
begin
  select restaurant_id into new.restaurant_id from public.recipe_versions where id = new.recipe_version_id;
  return new;
end; $$;
create trigger trg_recipe_ingredients_restaurant before insert or update of recipe_version_id on public.recipe_ingredients
  for each row execute function public.set_recipe_ingredient_restaurant_id();

-- ---------- Trigger: auto-add creator as owner on new restaurant ----------

create or replace function public.handle_new_restaurant()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.restaurant_members (restaurant_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict do nothing;
  return new;
end; $$;
create trigger trg_restaurants_add_owner
  after insert on public.restaurants
  for each row execute function public.handle_new_restaurant();

-- ---------- Trigger: sub-recipe references must be approved ----------

create or replace function public.check_sub_recipe_approved()
returns trigger language plpgsql as $$
declare sub_status text;
begin
  if new.sub_recipe_version_id is not null then
    select status into sub_status from public.recipe_versions
      where id = new.sub_recipe_version_id;
    if sub_status is null then
      raise exception 'Referenced recipe version % does not exist', new.sub_recipe_version_id;
    end if;
    if sub_status <> 'approved' then
      raise exception 'Sub-recipe references must point to an approved recipe version (got: %)', sub_status;
    end if;
  end if;
  return new;
end; $$;
create trigger trg_recipe_ingredients_check_sub_recipe
  before insert or update on public.recipe_ingredients
  for each row execute function public.check_sub_recipe_approved();

-- ---------- Trigger: can't un-approve a recipe that has dependents ----------

create or replace function public.check_unapprove_dependencies()
returns trigger language plpgsql as $$
declare
  dependent_count int;
  force_flag text;
begin
  if old.status = 'approved' and new.status <> 'approved' then
    begin force_flag := current_setting('app.force_unapprove', true);
    exception when others then force_flag := null; end;

    if force_flag = 'on' then
      return new;
    end if;

    select count(*) into dependent_count
    from public.recipe_ingredients ri
    join public.recipe_versions rv on rv.id = ri.recipe_version_id
    where ri.sub_recipe_version_id = old.id
      and rv.status = 'approved';

    if dependent_count > 0 then
      raise exception
        'Cannot un-approve: % approved recipe(s) depend on this version. Use force_unapprove_recipe_version() to override.',
        dependent_count;
    end if;
  end if;

  if old.status <> 'approved' and new.status = 'approved' then
    new.approved_at = now();
  end if;

  return new;
end; $$;
create trigger trg_recipe_versions_check_unapprove
  before update on public.recipe_versions
  for each row execute function public.check_unapprove_dependencies();

-- ---------- Escape hatch: force un-approve ----------

create or replace function public.force_unapprove_recipe_version(version_id uuid, new_status text default 'archived')
returns void language plpgsql security definer
set search_path = public as $$
declare
  rid uuid;
begin
  select restaurant_id into rid from public.recipe_versions where id = version_id;
  if rid is null then
    raise exception 'Recipe version % not found', version_id;
  end if;
  if not public.is_restaurant_member(rid) then
    raise exception 'Not authorized to modify this recipe version';
  end if;
  if new_status not in ('draft','testing','archived') then
    raise exception 'force_unapprove target status must be draft, testing, or archived';
  end if;
  perform set_config('app.force_unapprove', 'on', true);
  update public.recipe_versions set status = new_status where id = version_id;
end; $$;

-- ---------- RLS ----------

alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.menus enable row level security;
alter table public.sections enable row level security;
alter table public.dishes enable row level security;
alter table public.components enable row level security;
alter table public.dish_components enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "members read restaurants" on public.restaurants
  for select to authenticated using (public.is_restaurant_member(id));
create policy "authenticated create restaurants" on public.restaurants
  for insert to authenticated with check (true);
create policy "members update restaurants" on public.restaurants
  for update to authenticated
  using (public.is_restaurant_member(id))
  with check (public.is_restaurant_member(id));

create policy "members read restaurant_members" on public.restaurant_members
  for select to authenticated using (public.is_restaurant_member(restaurant_id));
create policy "owners write restaurant_members" on public.restaurant_members
  for all to authenticated
  using (
    exists (select 1 from public.restaurant_members rm
      where rm.restaurant_id = restaurant_members.restaurant_id
        and rm.user_id = auth.uid()
        and rm.role in ('owner','admin'))
  )
  with check (
    exists (select 1 from public.restaurant_members rm
      where rm.restaurant_id = restaurant_members.restaurant_id
        and rm.user_id = auth.uid()
        and rm.role in ('owner','admin'))
  );

create policy "members all menus" on public.menus for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
create policy "members all sections" on public.sections for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
create policy "members all dishes" on public.dishes for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
create policy "members all components" on public.components for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
create policy "members all dish_components" on public.dish_components for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
create policy "members all recipe_versions" on public.recipe_versions for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
create policy "members all recipe_ingredients" on public.recipe_ingredients for all to authenticated
  using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
