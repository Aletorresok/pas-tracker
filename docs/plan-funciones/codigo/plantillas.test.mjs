// Pruebas del borrador de plantillas.js — correr con:  node docs/plan-funciones/codigo/plantillas.test.mjs
import assert from "node:assert/strict";
import { enteroALetras, montoALetras, variablesDe, preguntasDe, completar, bloques } from "./plantillas.js";

// Números a letras
assert.equal(enteroALetras(0), "cero");
assert.equal(enteroALetras(21), "veintiuno");
assert.equal(enteroALetras(100), "cien");
assert.equal(enteroALetras(101), "ciento uno");
assert.equal(enteroALetras(1000), "mil");
assert.equal(enteroALetras(21000), "veintiún mil");
assert.equal(enteroALetras(31000), "treinta y un mil");
assert.equal(enteroALetras(1000000), "un millón");
assert.equal(enteroALetras(1500000), "un millón quinientos mil");
assert.equal(enteroALetras(2345678), "dos millones trescientos cuarenta y cinco mil seiscientos setenta y ocho");
assert.equal(enteroALetras(201000000), "doscientos un millones");
assert.equal(montoALetras(1500000.5), "pesos un millón quinientos mil con 50/100");
assert.equal(montoALetras(""), "");

// Variables
const caso = { asegurado: "PEREZ Juan Carlos", dni_asegurado: "30123456", patente: "ab123cd", compania_aseguradora: "Sancor",
  fecha_siniestro: "2026-03-05", monto_reclamado: 1200000, nro_siniestro: "" };
const v = variablesDe({ caso, compania: { razon_social: "Sancor Coop. de Seguros Ltda.", cuit: "30-50004946-0", domicilio: "Ruta 34", localidad: "Sunchales", cp: "2322" },
  estudio: { abogado: "Alexis Torres Gaveglio" }, hoy: "2026-09-29" });
assert.equal(v.asegurado_nombre, "Juan");
assert.equal(v.dni, "30.123.456");
assert.equal(v.patente, "AB123CD");
assert.equal(v.compania, "Sancor");
assert.equal(v["compania.razon_social"], "Sancor Coop. de Seguros Ltda.");
assert.equal(v["compania.domicilio"], "Ruta 34, (2322) Sunchales");
assert.equal(v["estudio.abogado"], "Alexis Torres Gaveglio");
assert.equal(v.fecha_siniestro, "05/03/2026");
assert.equal(v.fecha_siniestro_larga, "5 de marzo de 2026");
assert.equal(v.hoy_largo, "29 de septiembre de 2026");
assert.match(v.monto_reclamado, /^\$ 1\.200\.000,00$/);

// Preguntas
const cuerpo = `Ref.: Siniestro {{#si nro_siniestro}}N° {{nro_siniestro}}{{/si}} · {{asegurado}}

Acepto {{? monto_aceptado | Monto aceptado | monto}} ({{monto_aceptado_letras}}).
{{#si patente}}Dominio {{patente}}{{#si tercero}} (tercero {{tercero}}){{/si}}.{{/si}}
Firma: {{estudio.matriculas}}`;
assert.deepEqual(preguntasDe(cuerpo), [{ clave: "monto_aceptado", etiqueta: "Monto aceptado", tipo: "monto" }]);

const r = completar(cuerpo, v, { monto_aceptado: "950000" });
assert.ok(r.texto.startsWith("Ref.: Siniestro  · PEREZ Juan Carlos"), r.texto);
assert.ok(r.texto.includes("Acepto $ 950.000,00 (pesos novecientos cincuenta mil con 00/100)."), r.texto);
assert.ok(r.texto.includes("Dominio AB123CD."), r.texto);        // condicional anidado vacío desaparece
assert.deepEqual(r.faltantes, ["estudio.matriculas"]);
assert.ok(r.texto.includes("[estudio matriculas]"));

// Sin respuesta: la pregunta queda marcada como faltante
assert.deepEqual(completar("Monto {{? m | M | monto}}", {}).faltantes, ["m"]);

// Bloques
const b = bloques("# RECLAMO\n**SANCOR**\nCUIT 30-1\n\nUno dos\ntres **cuatro**.\n\n1. DNI\n2. Fotos");
assert.deepEqual(b.map(x => x.tipo), ["titulo", "linea", "linea", "parrafo", "item", "item"]);
assert.deepEqual(b[3].tramos, [{ t: "Uno dos tres ", negrita: false }, { t: "cuatro", negrita: true }, { t: ".", negrita: false }]);

console.log("plantillas: todas las pruebas pasan");
