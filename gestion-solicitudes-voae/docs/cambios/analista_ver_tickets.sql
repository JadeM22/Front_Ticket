-- Permite que el rol Analista vea el detalle de cualquier ticket (solo lectura).
-- Ejecutar en el SQL Editor de Supabase. Las políticas de SELECT se suman entre sí,
-- así que esto no quita ni cambia lo que ya ven los demás roles.
--
-- FormularioArte/Video/Dircom/Protocolo/Generico, Adjuntos y el bucket "adjuntos" ya
-- dependen de "quien puede ver el Ticket", por lo que quedan cubiertos con esta política.
-- Si Entregables, DictamenJefe o TicketLog tienen políticas propias que no pasan por
-- Ticket, hay que agregarles una política equivalente.

create policy "polTicketLeerAnalista" on "Solicitudes"."Ticket"
  for select to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Analista'));

-- La vista vw_TicketsEstadoReal (security_invoker) hace JOIN con "Seguridad"."Usuarios" para
-- sacar el nombre del solicitante. Sin permiso de lectura sobre las filas de otros usuarios,
-- el ticket desaparece de la vista y el detalle muestra "Ticket no encontrado".
-- Es el mismo acceso de lectura que ya tienen Jefe de Área y Diseñador en polUsuariosLeer.
create policy "polUsuariosLeerAnalista" on "Seguridad"."Usuarios"
  for select to authenticated
  using ("Seguridad"."fnUsuarioActualTieneRolEscalar"('Analista'));
