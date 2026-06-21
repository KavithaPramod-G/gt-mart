-- Fix logout: revoke session by id (phone match optional).

drop function if exists public.revoke_customer_session(uuid);

create or replace function public.revoke_customer_session(
  p_session_id uuid,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_updated integer;
begin
  if p_session_id is null then
    return jsonb_build_object('success', true);
  end if;

  v_phone := nullif(trim(coalesce(p_phone, '')), '');

  update public.customer_sessions
  set revoked_at = now()
  where id = p_session_id
    and revoked_at is null
    and (
      v_phone is null
      or phone = public.normalize_phone(v_phone)
    );

  get diagnostics v_updated = row_count;

  return jsonb_build_object(
    'success', true,
    'revoked', v_updated > 0
  );
end;
$$;

grant execute on function public.revoke_customer_session(uuid, text) to anon, authenticated;
