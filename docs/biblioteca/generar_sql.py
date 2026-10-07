# Arma los SQL de carga de la Biblioteca (tabla del SQL 46) a partir de los JSON de esta carpeta.
# Uso: python3 docs/biblioteca/generar_sql.py  → escribe sql/datos_<fecha>_biblioteca_<n>.sql
# Cada archivo tiene menos de 100 líneas (al copiar desde el celular se cortaba en la 100).
# Se pueden volver a correr: lo que ya está (misma clave) no se carga de nuevo ni se pisa.
import hashlib, json, os, sys
from datetime import date

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
FECHA = sys.argv[1] if len(sys.argv) > 1 else date.today().isoformat()
FILAS_POR_ARCHIVO = 60

def leer(nombre):
    with open(os.path.join(AQUI, nombre), encoding="utf-8") as f:
        return json.load(f)

def txt(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"

def arr(xs):
    return "array[" + ", ".join(txt(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"

def clave(*partes):
    return hashlib.md5("|".join(str(p or "") for p in partes).encode("utf-8")).hexdigest()

COLUMNAS = ["tipo", "titulo", "autor", "tribunal", "sala", "fecha", "anio", "jurisdiccion", "fuero", "publicacion",
            "articulos", "temas", "resultado", "sumario", "sumario_oficial", "url", "acceso", "verificado_el", "origen", "clave"]

def fila(r):
    v = [txt(r["tipo"]), txt(r["titulo"]), txt(r.get("autor")), txt(r.get("tribunal")), txt(r.get("sala")),
         (txt(r["fecha"]) + "::date") if r.get("fecha") else "null", str(int(r["anio"])) if r.get("anio") else "null",
         txt(r.get("jurisdiccion")), txt(r.get("fuero")), txt(r.get("publicacion")), txt(r.get("articulos")),
         arr(r.get("temas") or []), txt(r.get("resultado")), txt(r.get("sumario")),
         "true" if r.get("sumario_oficial") else "false", txt(r.get("url")), txt(r.get("acceso")),
         (txt(r["verificado_el"]) + "::date") if r.get("verificado_el") else "null", "'relevamiento'", txt(r["clave"])]
    return "(" + ", ".join(v) + ")"

registros = []
for j in leer("jurisprudencia.json"):
    registros.append({"tipo": "fallo", "titulo": j["caratula"], "tribunal": j["tribunal"], "sala": j.get("sala"),
                      "fecha": j.get("fecha"), "jurisdiccion": j.get("jurisdiccion"), "fuero": j.get("fuero"),
                      "temas": j.get("temas"), "resultado": j.get("resultado"), "sumario": j.get("sumario"),
                      "sumario_oficial": j.get("sumario_oficial"), "url": j.get("url_fuente"),
                      "verificado_el": j.get("verificado_el"), "clave": clave("fallo", j.get("url_fuente"), j["caratula"])})
for d in leer("doctrina.json"):
    registros.append({"tipo": "doctrina", "titulo": d["titulo"], "autor": d.get("autor"), "anio": d.get("anio"),
                      "publicacion": d.get("publicacion"), "temas": d.get("temas"), "sumario": d.get("resumen"),
                      "url": d.get("url"), "acceso": d.get("acceso"), "clave": clave("doctrina", d.get("autor"), d["titulo"])})
for n in leer("normas.json"):
    registros.append({"tipo": "norma", "titulo": n["norma"], "articulos": n.get("articulos"),
                      "temas": [n["tema"]] if n.get("tema") else [], "sumario": n.get("texto_breve"),
                      "url": n.get("url_fuente"), "clave": clave("norma", n["norma"], n.get("articulos"))})

claves = [r["clave"] for r in registros]
assert len(claves) == len(set(claves)), "hay registros repetidos en los JSON"

tandas = [registros[i:i + FILAS_POR_ARCHIVO] for i in range(0, len(registros), FILAS_POR_ARCHIVO)]
for n, tanda in enumerate(tandas, 1):
    lineas = [f"-- Biblioteca: carga del relevamiento ({FECHA}), parte {n} de {len(tandas)}. Requiere el SQL 46.",
              "-- Generado con docs/biblioteca/generar_sql.py. Se puede volver a correr: no duplica ni pisa lo cargado.",
              f"insert into public.biblioteca ({', '.join(COLUMNAS)}) values"]
    lineas += [fila(r) + ("," if i < len(tanda) - 1 else "") for i, r in enumerate(tanda)]
    lineas += ["on conflict (clave) do nothing;", "",
               "select tipo, count(*) from public.biblioteca group by tipo order by tipo;"]
    assert len(lineas) < 100, f"la parte {n} tiene {len(lineas)} líneas"
    ruta = os.path.join(RAIZ, "sql", f"datos_{FECHA}_biblioteca_{n}.sql")
    with open(ruta, "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")
    print(ruta, len(tanda), "registros,", len(lineas), "líneas")
print("total", len(registros))
