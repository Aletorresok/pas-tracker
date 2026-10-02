// Lectores de documentos de Provincia Seguros (PDF con texto, generados por su sistema).
// Cada lector: { id, nombre, detecta(renglones), leer(renglones) → { campos: { columna: valor }, notas: [texto] } }
import { buscar, fechaISO, limpiar } from "./textoPdf.js";

const tiene = (renglones, re) => renglones.some(r => re.test(r.texto));
const esProvincia = r => tiene(r, /CARLOS PELLEGRINI 71/i);
const pesos = t => {
  const n = Number(String(t || "").replace(/,/g, ""));
  return Number.isFinite(n) ? `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}` : t;
};

// Secciones de "etiqueta → valor" (vehículo y conductor): la etiqueta está a la izquierda y el valor desde x ≈ 243.
// Un renglón sin etiqueta continúa el valor anterior.
function etiquetasValores(renglones, desde, hasta) {
  const mapa = {};
  let ultima = null;
  for (let i = desde; i < hasta; i++) {
    const r = renglones[i];
    const etiqueta = limpiar(r.items.filter(it => it.x < 235).map(it => it.s).join(" "));
    // Fuera de las columnas quedan el sello "RECIBIDO / Provincia Seguros S.A. / fecha"
    const valor = limpiar(r.items.filter(it => it.x >= 235 && !/^(RECIBIDO|S\.A\.|Provincia Seguros|\d{2}-\d{2}-\d{4})$/.test(it.s)).map(it => it.s).join(" "));
    if (etiqueta) { ultima = etiqueta; mapa[etiqueta] = valor; } else if (ultima && valor) mapa[ultima] = limpiar(`${mapa[ultima]} ${valor}`);
  }
  return mapa;
}
const valorQueEmpieza = (mapa, inicio) => {
  const k = Object.keys(mapa).find(k => k.toLowerCase().startsWith(inicio.toLowerCase()));
  return k ? mapa[k] : "";
};

// Tabla "DATOS DE TERCEROS": columnas por posición
const COLUMNAS_TERCEROS = [["propietario", 0], ["den", 125], ["vehiculo", 138], ["conductor", 224], ["dominio", 318], ["registro", 382], ["cia", 452]];
function leerTerceros(renglones) {
  const cab = buscar(renglones, /Propietario.*Cía\.Seguros/);
  if (!cab) return [];
  const filas = [];
  for (let i = cab.indice + 1; i < renglones.length; i++) {
    const r = renglones[i];
    if (/^(Detalle de los daños|LESIONES)/.test(r.texto) || r.pagina !== renglones[cab.indice].pagina) break;
    const fila = {};
    for (const it of r.items) {
      const col = [...COLUMNAS_TERCEROS].reverse().find(([, x]) => it.x >= x)[0];
      fila[col] = limpiar(`${fila[col] || ""} ${it.s}`);
    }
    // Sin dominio ni registro: es la continuación del renglón anterior (nombres largos)
    if (filas.length && !fila.dominio && !fila.registro) {
      for (const [k, v] of Object.entries(fila)) filas.at(-1)[k] = limpiar(`${filas.at(-1)[k] || ""} ${v}`);
    } else filas.push(fila);
  }
  return filas;
}

const denuncia = {
  id: "provincia-denuncia",
  nombre: "Denuncia de Provincia Seguros",
  detecta: r => esProvincia(r) && tiene(r, /DENUNCIA DEL ACCIDENTE/),
  leer(r) {
    const campos = { cia_propia: "Provincia Seguros" };
    const notas = [];

    const sin = buscar(r, /Siniestro Nro\.:\s*([\d\s-]+?)\s+Anticipo/);
    if (sin) campos.nro_siniestro_propio = sin[1].replace(/\s+/g, "");
    const aseg = buscar(r, /Asegurado:\s+\d+\s+(.+?)\s+Póliza Nro\.:\s+(\d+)/);
    if (aseg) { campos._titular = limpiar(aseg[1]); campos.poliza_propia = aseg[2]; }
    const doc = buscar(r, /Nro\.Doc\.\s+(\d+)/);
    if (doc) campos._dni_titular = doc[1];
    const dom = buscar(r, /Domicilio Póliza:\s+(.*?)\s*(Teléfono:\s*(.*))?$/);
    if (dom) { campos._domicilio = limpiar(dom[1]); if (dom[3]) campos._telefono = limpiar(dom[3]); }
    const telSin = buscar(r, /Teléfono Siniestro:\s*(.+)$/);
    if (telSin) campos._telefono ||= limpiar(telSin[1]);

    // Vehículo y conductor
    const iVeh = buscar(r, /DETALLES DEL VEHICULO ASEGURADO/)?.indice ?? -1;
    const iCond = buscar(r, /DATOS DEL CONDUCTOR/)?.indice ?? -1;
    const iAcc = buscar(r, /DETALLES DEL ACCIDENTE/)?.indice ?? -1;
    if (iVeh >= 0 && iCond > iVeh) {
      const v = etiquetasValores(r, iVeh + 1, iCond);
      campos.vehiculo = limpiar([v["Marca"], v["Modelo"], v["Año Del Vehiculo"]].filter(Boolean).join(" "));
      campos.patente = (v["Patente"] || "").replace(/\s+/g, "").toUpperCase();
      campos.chasis = v["Numero De Chasis"] || "";
      campos.motor = v["Numero De Motor"] || "";
    }
    if (iCond >= 0 && iAcc > iCond) {
      const c = etiquetasValores(r, iCond + 1, iAcc);
      const quien = valorQueEmpieza(c, "¿Quién Conducía");
      const conductor = {
        nombre: valorQueEmpieza(c, "Apellido Y Nombre"), dni: valorQueEmpieza(c, "Nro Documento"),
        tel: valorQueEmpieza(c, "Teléfono De La"), cpLocProv: valorQueEmpieza(c, "Cód.Postal"),
        calle: valorQueEmpieza(c, "Calle De La"), numero: valorQueEmpieza(c, "Nro De La Calle"),
      };
      campos._conducia_asegurado = /ASEGURAD/i.test(quien) || !quien;
      campos._conductor = conductor;
    }

    // El hecho
    const fecha = buscar(r, /Fecha Ocurrencia:\s+(\S+)(?:\s+Hora:\s+(\d{1,2}:\d{2}))?/);
    if (fecha) { campos.fecha_siniestro = fechaISO(fecha[1]); if (fecha[2]) campos.hora_siniestro = fecha[2].padStart(5, "0"); }
    const lugar = buscar(r, /^Lugar:\s+(.+)$/);
    const ciudad = buscar(r, /^Ciudad:\s+(.*?)\s+Pcia:\s*(.*)$/);
    campos.ubicacion = limpiar([lugar?.[1], ciudad?.[1], ciudad?.[2]].filter(Boolean).join(", ").replace(/\.,/g, ","));
    const forma = buscar(r, /Forma en que ocurrió:/);
    const testigos = buscar(r, /^TESTIGOS:/);
    if (forma && testigos) {
      const relato = [];
      for (let i = forma.indice; i < testigos.indice; i++) relato.push(r[i].items.filter(it => it.x >= 145).map(it => it.s).join(" "));
      campos.relato = limpiar(relato.join(" "));
    }
    // Testigos y comisaría: lo que haya entre la cabecera de testigos y "Comisaria:"
    const cabTest = buscar(r, /^Apellido y Nombre Tp\.Nro\.Doc\./);
    const comisaria = buscar(r, /^Comisaria:\s*(.*?)\s*Acta Nº:\s*(.*?)\s*Juzgado:\s*(.*)$/);
    if (cabTest && comisaria) {
      const filas = r.slice(cabTest.indice + 1, comisaria.indice).map(f => f.texto).filter(Boolean);
      if (filas.length) notas.push(`Testigos (denuncia): ${filas.join(" / ")}.`);
    }
    if (comisaria && (comisaria[1] || comisaria[2] || comisaria[3]))
      notas.push(`Comisaría: ${[comisaria[1], comisaria[2] && `acta ${comisaria[2]}`, comisaria[3] && `juzgado ${comisaria[3]}`].filter(Boolean).join(", ")}.`);

    // Tercero (el primero de la tabla; si hay más, quedan en observaciones)
    const terceros = leerTerceros(r);
    if (terceros.length) {
      const t = terceros[0];
      campos.tercero_nombre = t.propietario || "";
      campos.vehiculo_tercero = t.vehiculo || "";
      campos.dominio_tercero = (t.dominio || "").replace(/\s+/g, "").toUpperCase();
      campos.tercero_dni = t.registro || "";
      campos.tercero_cia = t.cia || "";
      if (t.conductor && t.conductor.toLowerCase() !== (t.propietario || "").toLowerCase()) campos.tercero_conductor = t.conductor;
      for (const o of terceros.slice(1))
        notas.push(`Otro tercero en la denuncia: ${[o.propietario, o.vehiculo, o.dominio, o.conductor && `conductor ${o.conductor}`, o.registro && `registro ${o.registro}`, o.cia].filter(Boolean).join(", ")}.`);
    } else notas.push("La denuncia no trae datos del tercero.");

    return { campos, notas };
  },
};

const certificado = {
  id: "provincia-certificado",
  nombre: "Certificado de cobertura de Provincia Seguros",
  detecta: r => esProvincia(r) && tiene(r, /CERTIFICADO DE COBERTURA/),
  leer(r) {
    const campos = { cia_propia: "Provincia Seguros" };
    const pol = buscar(r, /POLIZA\s+([\d.,]+)/);
    if (pol) campos.poliza_propia = pol[1].replace(/[.,]/g, "");
    const desde = buscar(r, /VIGENCIA DESDE:\s+(\S+)/), hasta = buscar(r, /VIGENCIA HASTA:\s+(\S+)/);
    if (desde) campos.vigencia_desde = fechaISO(desde[1]);
    if (hasta) campos.vigencia_hasta = fechaISO(hasta[1]);
    const prod = buscar(r, /PRODUCTOR:\s+(.+?)(\s+AGENCIA:.*)?$/);
    if (prod) campos.productor_poliza = limpiar(prod[1]);
    const riesgo = buscar(r, /RIESGO CUBIERTO:\s+(.+)$/);
    if (riesgo) campos.cobertura = limpiar(riesgo[1]);
    const aseg = buscar(r, /DATOS DEL ASEGURADO:/);
    if (aseg) { const t = r[aseg.indice + 1]?.texto.match(/^\S+\s+\d+\s+(.+)$/); if (t) campos._titular = limpiar(t[1]); }
    const dom = buscar(r, /DOMICILIO:\s+(.+?)\s+Localidad\s+(.+?)\s+CP\s+(\d+)/);
    if (dom) { campos._domicilio = limpiar(dom[1]); campos._localidad = limpiar(dom[2]); campos._cp = dom[3]; }
    const marca = buscar(r, /^MARCA\s+(.+?)\s+MODELO\s+(.+)$/), anio = buscar(r, /AÑO DEL VEHICULO\s+(\d{4})\s+PATENTE\s+(\S+)/);
    if (marca) campos.vehiculo = limpiar(`${marca[1]} ${marca[2]} ${anio?.[1] || ""}`);
    if (anio) campos.patente = anio[2].toUpperCase();
    const chasis = buscar(r, /CHASIS\s+(\S+)/), motor = buscar(r, /NUMERO DE MOTOR\s+(\S+)/);
    if (chasis) campos.chasis = chasis[1];
    if (motor) campos.motor = motor[1];
    return { campos, notas: [] };
  },
};

const franquicia = {
  id: "provincia-franquicia",
  nombre: "Carta de franquicia de Provincia Seguros",
  detecta: r => tiene(r, /CARTA DE FRANQUICIA/) && (esProvincia(r) || tiene(r, /Provincia Seguros/)),
  leer(r) {
    const campos = { cia_propia: "Provincia Seguros" };
    const pol = buscar(r, /Póliza:\s+(\d+)\s+Vigencia hasta:\s+(\S+)/), desde = buscar(r, /Vigencia desde:\s+(\S+)/);
    if (pol) { campos.poliza_propia = pol[1]; campos.vigencia_hasta = fechaISO(pol[2]); }
    if (desde) campos.vigencia_desde = fechaISO(desde[1]);
    const fecha = buscar(r, /^Fecha:\s+(\S+)/);
    const monto = re => buscar(r, re)?.[1];
    const mano = monto(/^Mano de obra:\s+([\d.,]+)/), rep = monto(/^Res?puestos:\s+([\d.,]+)/); // Provincia escribe "Respuestos"
    const sub = monto(/^Subtotal:\s+([\d.,]+)/), fr = monto(/^Franquicia:\s+([\d.,]+)/), cargo = monto(/^Total a cargo de .*?\s+([\d.,]+)$/);
    const partes = [sub && `daños ${pesos(sub)}${mano || rep ? ` (mano de obra ${pesos(mano)}, repuestos ${pesos(rep)})` : ""}`, fr && `franquicia ${pesos(fr)}`, cargo && `a cargo de Provincia ${pesos(cargo)}`].filter(Boolean);
    return { campos, notas: partes.length ? [`Carta de franquicia${fecha ? ` del ${fecha[1]}` : ""}: ${partes.join(", ")}.`] : [] };
  },
};

export default [denuncia, certificado, franquicia];
