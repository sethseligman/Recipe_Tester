-- Server actions may insert restaurants with created_by set while auth.uid() is null
-- in the trigger context; use created_by as fallback so owner membership is always created.

create or replace function public.handle_new_restaurant()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  owner_id uuid;
begin
  owner_id := coalesce(auth.uid(), new.created_by);
  if owner_id is not null then
    insert into public.restaurant_members (restaurant_id, user_id, role)
    values (new.id, owner_id, 'owner')
    on conflict do nothing;
  end if;
  return new;
end; $$;
