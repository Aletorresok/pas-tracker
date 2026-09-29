-- SQL 32b · Modelos base de escritos (1 a 5 de 9). Correr DESPUÉS del SQL 32 (tablas).
-- Cada modelo es una instrucción aparte. Re-ejecutable: no pisa los modelos que hayas editado.

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('reclamo_extrajudicial', 'Reclamo extrajudicial (tercero)', 'reclamo', 'caso', 'cliente', 10,
$t$# RECLAMO EXTRAJUDICIAL
**{{compania.razon_social}}**
{{#si compania.cuit}}CUIT {{compania.cuit}}{{/si}}
{{#si compania.domicilio}}Domicilio: {{compania.domicilio}}{{/si}}
Reclamo de Terceros

{{estudio.abogado}}, abogado, inscripto al {{estudio.matriculas}}, {{estudio.condicion_fiscal}} CUIT {{estudio.cuit}}, en representación de {{asegurado_mayus}}, DNI {{dni}}, constituyendo domicilio en {{estudio.domicilio}}, vengo a iniciar formal reclamo por el siniestro ocurrido el día {{fecha_siniestro}}{{#si patente}}, en el que resultó dañado el vehículo dominio {{patente}}{{/si}}.

**I. Acompaña:**
{{documental}}
$t$)
on conflict (clave) do nothing;

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('pedido_respuesta', 'Pedido de respuesta', 'seguimiento', 'caso', 'estudio', 20,
$t$Buenos Aires, {{hoy_largo}}

Señores
**{{compania.razon_social}}**
{{#si compania.domicilio}}{{compania.domicilio}}{{/si}}

Ref.: {{#si nro_siniestro}}Siniestro N° {{nro_siniestro}} · {{/si}}{{asegurado}} · Dominio {{patente}}

De mi consideración:

Me dirijo a Uds. en representación de {{asegurado}}, en relación al reclamo presentado el {{fecha_inicio_reclamo}} por el siniestro ocurrido el {{fecha_siniestro}}. A la fecha no hemos recibido respuesta, por lo que solicito se sirvan informar el estado del trámite y, en su caso, formular el ofrecimiento correspondiente.

Sin otro particular, saludo a Uds. atentamente.
$t$)
on conflict (clave) do nothing;

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('reiteracion', 'Reiteración de reclamo', 'seguimiento', 'caso', 'estudio', 30,
$t$Buenos Aires, {{hoy_largo}}

Señores
**{{compania.razon_social}}**
{{#si compania.domicilio}}{{compania.domicilio}}{{/si}}

Ref.: {{#si nro_siniestro}}Siniestro N° {{nro_siniestro}} · {{/si}}{{asegurado}} · Dominio {{patente}}

De mi consideración:

Reitero el reclamo presentado el {{fecha_inicio_reclamo}} y el pedido de respuesta del {{fecha_reclamo}}, que a la fecha no han sido contestados. Solicito se expidan dentro de los próximos {{? dias_respuesta | Días para responder | texto}} días, bajo apercibimiento de iniciar la mediación prejudicial obligatoria y las acciones legales que correspondan, con costas.

Saludo a Uds. atentamente.
$t$)
on conflict (clave) do nothing;

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('aceptacion_ofrecimiento', 'Aceptación de ofrecimiento', 'acuerdo', 'caso', 'ambos', 40,
$t$Buenos Aires, {{hoy_largo}}

Señores
**{{compania.razon_social}}**
{{#si compania.domicilio}}{{compania.domicilio}}{{/si}}

Ref.: {{#si nro_siniestro}}Siniestro N° {{nro_siniestro}} · {{/si}}{{asegurado}} · Dominio {{patente}}

De mi consideración:

En representación de {{asegurado}}, DNI {{dni}}, acepto el ofrecimiento de {{? monto_aceptado | Monto aceptado | monto}} ({{monto_aceptado_letras}}) formulado por esa compañía en concepto de indemnización total por los daños derivados del siniestro del {{fecha_siniestro}}. Solicito se me indiquen los pasos para la firma del convenio y el plazo de pago, que no podrá exceder el previsto en el art. 49 de la Ley 17.418.

Datos para la transferencia: {{? datos_transferencia | CBU / alias y titular | texto}}

Saludo a Uds. atentamente.
$t$)
on conflict (clave) do nothing;

insert into public.modelos_escrito (clave, titulo, categoria, ambito, firma, orden, cuerpo) values
('reconsideracion', 'Pedido de reconsideración del ofrecimiento', 'acuerdo', 'caso', 'estudio', 50,
$t$Buenos Aires, {{hoy_largo}}

Señores
**{{compania.razon_social}}**
{{#si compania.domicilio}}{{compania.domicilio}}{{/si}}

Ref.: {{#si nro_siniestro}}Siniestro N° {{nro_siniestro}} · {{/si}}{{asegurado}} · Dominio {{patente}}

De mi consideración:

Recibimos el ofrecimiento de {{monto_ofrecimiento}}, que no cubre los daños reclamados ({{monto_reclamado}}). Solicito su reconsideración teniendo en cuenta {{? fundamento | Fundamento (presupuesto, privación de uso, etc.) | texto}}.

Saludo a Uds. atentamente.
$t$)
on conflict (clave) do nothing;

-- Control: tiene que dar 5 o más
select count(*) as modelos_base from public.modelos_escrito where clave is not null;
