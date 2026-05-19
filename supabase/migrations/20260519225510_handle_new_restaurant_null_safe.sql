create or replace function public.handle_new_restaurant()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into public.restaurant_members (restaurant_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict do nothing;
  end if;
  return new;
end; $$;
