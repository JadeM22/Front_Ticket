-- PARTE 13: nombres de usuarios para mostrar en la app (solo id y nombre)
create or replace function "Seguridad"."fnUsuariosNombresTabla"()
returns table (id int, nombre varchar)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.nombre
    from "Seguridad"."Usuarios" u
   where auth.uid() is not null;   -- solo con sesión iniciada
$$;

revoke execute on function "Seguridad"."fnUsuariosNombresTabla"() from public, anon;
grant  execute on function "Seguridad"."fnUsuariosNombresTabla"() to authenticated;

notify pgrst, 'reload schema';
