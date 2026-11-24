-- SQL 50 · Monto reclamado "A definir"
-- Reemplaza la costumbre de cargar $1 para que no aparezca el aviso "Falta cargar el monto reclamado".
-- Con la casilla marcada el aviso se calla y el monto queda vacío (no entra en % ni en cálculos).
alter table pas_casos add column if not exists monto_a_definir boolean not null default false;

-- Los casos que tenían un monto de relleno (menos de $10) pasan a "A definir" sin monto
update pas_casos
   set monto_a_definir = true, monto_reclamado = null
 where monto_reclamado is not null and monto_reclamado::numeric > 0 and monto_reclamado::numeric < 10;
