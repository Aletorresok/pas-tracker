-- SQL 32c · Modelos base de escritos (6 a 9 de 9). Correr DESPUÉS del SQL 32 (tablas).
-- Cada modelo es una instrucción aparte. Re-ejecutable: no pisa los modelos que hayas editado.

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('intimacion_pago', 'Intimación de pago (acuerdo incumplido)', 'intimacion', 'caso', 'estudio', 60,
$t$Buenos Aires, {{hoy_largo}}

Señores
**{{compania.razon_social}}**
{{#si compania.domicilio}}{{compania.domicilio}}{{/si}}

Ref.: {{#si nro_siniestro}}Siniestro N° {{nro_siniestro}} · {{/si}}{{asegurado}} · Dominio {{patente}}

Habiéndose acordado el pago de {{monto_acordado}} ({{monto_acordado_letras}}) con fecha {{fecha_aceptacion}}, a la fecha no se ha efectivizado. INTIMO a que en el plazo de tres (3) días hábiles abonen la suma acordada con más sus intereses, bajo apercibimiento de iniciar las acciones judiciales correspondientes y de efectuar la denuncia ante la Superintendencia de Seguros de la Nación, con costas.
$t$)
on conflict (clave) do nothing;

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('solicitud_mediacion', 'Nota al cliente: pasamos a mediación', 'cliente', 'caso', 'ninguna', 70,
$t$Hola {{asegurado_nombre}}:

Te cuento que {{compania}} no hizo una oferta razonable, así que el próximo paso es la mediación prejudicial (es obligatoria antes de un juicio). No tenés que pagar nada ahora. Te vamos a avisar la fecha y, si es virtual, te mandamos el link.

Cualquier duda, escribime.
$t$)
on conflict (clave) do nothing;

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('liquidacion_cliente', 'Nota al cliente con la liquidación', 'cliente', 'ambos', 'ninguna', 80,
$t$Hola {{asegurado_nombre}}:

Te paso cómo queda la cuenta:

{{liquidacion}}

Monto acordado: {{monto_acordado}}
Honorarios: {{monto_honorarios}}
Te queda: {{monto_cobro_asegurado}}
$t$)
on conflict (clave) do nothing;

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('escrito_judicial_base', 'Escrito judicial (encabezado)', 'judicial', 'expediente', 'estudio', 90,
$t$**{{? objeto | Objeto del escrito (SUMILLA) | texto}}**

Señor Juez:

{{estudio.abogado}}, abogado, {{estudio.matriculas}}, por la {{rol_cliente}} en autos "{{caratula}}" (Expte. N° {{numero}}), que tramitan ante el {{juzgado}}{{#si secretaria}}, {{secretaria}}{{/si}}, constituyendo domicilio en {{estudio.domicilio}}, a V.S. respetuosamente digo:

{{? cuerpo | Cuerpo del escrito | texto}}

Proveer de conformidad,
SERÁ JUSTICIA.
$t$)
on conflict (clave) do nothing;

-- Control
select (select count(*) from public.modelos_escrito where clave is not null) as modelos_base_9,
       (select count(*) from public.pas_ajustes where clave = 'estudio') as estudio_1,
       (select count(*) from pg_policies where tablename in ('modelos_escrito', 'escritos_generados')) as politicas_2;
