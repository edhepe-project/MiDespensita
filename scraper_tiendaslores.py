"""
scraper_tiendaslores.py
Scraper de Tiendas Lores via WooCommerce Store API publica.
No requiere Selenium ni login. Extrae productos en oferta con precios e imagenes.
"""

import requests
import json
import sqlite3
from datetime import datetime
import db_manager

# ─── CONFIGURACION ─────────────────────────────────────────────────────────────
TIENDA_NOMBRE  = "Tiendas Lores"
TIENDA_URL     = "https://tiendaslores.com"
API_BASE       = "https://tiendaslores.com/wp-json/wc/store/v1/products"
OUTPUT_JSON    = "ofertas_tiendaslores.json"

# Solo traer productos EN OFERTA, ordenados por fecha, hasta 100 por ejecucion
PARAMS_BASE = {
    "per_page": 100,
    "orderby":  "date",
    "order":    "desc",
    "on_sale":  "true",    # solo productos con descuento activo
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
}
# ──────────────────────────────────────────────────────────────────────────────


def extraer_productos():
    """Consulta la API de WooCommerce y extrae productos en oferta."""
    print(f"\n[Lores] Consultando API: {API_BASE}")
    
    productos = []
    pagina = 1
    
    while True:
        params = {**PARAMS_BASE, "page": pagina}
        try:
            resp = requests.get(API_BASE, params=params, headers=HEADERS, timeout=15)
            if not resp.ok:
                print(f"  [ERROR] HTTP {resp.status_code} en pagina {pagina}")
                break
            
            data = resp.json()
            if not data:
                break  # Sin mas resultados
            
            for item in data:
                # Precio: la API devuelve en centavos (ej: 1350 = $13.50)
                precio_raw   = item.get("prices", {}).get("price", "0")
                regular_raw  = item.get("prices", {}).get("regular_price", "0")
                
                precio  = int(precio_raw)  / 100
                regular = int(regular_raw) / 100
                
                # Calcular descuento
                descuento_pct = 0
                if regular > 0 and precio < regular:
                    descuento_pct = round((1 - precio / regular) * 100)

                # Imagen de alta resolucion
                imagenes = item.get("images", [])
                imagen_url = imagenes[0]["src"] if imagenes else ""
                
                # Categorias
                categorias = [c["name"] for c in item.get("categories", [])]
                
                # Detectar tipo de oferta semanal
                tipo_oferta = "Oferta"
                for cat in categorias:
                    cat_lower = cat.lower()
                    if "fin de semana" in cat_lower:
                        tipo_oferta = "Oferta Fin de Semana"
                    elif "miercoles" in cat_lower or "miércoles" in cat_lower:
                        tipo_oferta = "Miercoles de Ofertas"
                    elif "jueves" in cat_lower:
                        tipo_oferta = "Jueves de Ofertas"
                    elif "martes" in cat_lower:
                        tipo_oferta = "Martes de Ofertas"
                
                entry = {
                    "nombre":         item.get("name", ""),
                    "precio":         precio,
                    "precio_regular": regular,
                    "descuento_pct":  descuento_pct,
                    "imagen_url":     imagen_url,
                    "url":            item.get("permalink", ""),
                    "categoria":      ", ".join(categorias),
                    "tipo_oferta":    tipo_oferta,
                    "tienda":         TIENDA_NOMBRE,
                    "fecha_scraping": datetime.now().isoformat(),
                }
                productos.append(entry)
            
            print(f"  Pagina {pagina}: {len(data)} productos")
            
            # WooCommerce devuelve menos de per_page cuando es la ultima pagina
            if len(data) < PARAMS_BASE["per_page"]:
                break
            
            pagina += 1
            
        except Exception as e:
            print(f"  [ERROR] {e}")
            break
    
    print(f"\n  Total: {len(productos)} productos en oferta extraidos.")
    return productos


def guardar_en_db(productos):
    """Guarda los productos en la tabla tiendas_lores de la BD SQLite."""
    if not productos:
        return
    
    con = sqlite3.connect(db_manager.DB_FILE)
    cur = con.cursor()
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tiendas_lores (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre          TEXT,
            precio          REAL,
            precio_regular  REAL,
            descuento_pct   INTEGER,
            imagen_url      TEXT,
            url             TEXT UNIQUE,
            categoria       TEXT,
            tipo_oferta     TEXT,
            tienda          TEXT,
            fecha_scraping  TEXT
        )
    """)
    
    # Limpiar registros anteriores y reemplazar con los nuevos frescos
    cur.execute("DELETE FROM tiendas_lores")
    
    insertados = 0
    for p in productos:
        try:
            cur.execute("""
                INSERT OR REPLACE INTO tiendas_lores
                    (nombre, precio, precio_regular, descuento_pct, imagen_url,
                     url, categoria, tipo_oferta, tienda, fecha_scraping)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p["nombre"], p["precio"], p["precio_regular"], p["descuento_pct"],
                p["imagen_url"], p["url"], p["categoria"], p["tipo_oferta"],
                p["tienda"], p["fecha_scraping"]
            ))
            insertados += 1
        except Exception as e:
            print(f"  Error al guardar {p['nombre']}: {e}")
    
    con.commit()
    con.close()
    print(f"[OK] BD actualizada: {insertados} productos guardados en tiendas_lores.")


def run():
    print("=" * 60)
    print("  SCRAPER TIENDAS LORES")
    print("=" * 60)
    
    productos = extraer_productos()
    
    # Guardar JSON detallado propio
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(productos, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON guardado: {OUTPUT_JSON} ({len(productos)} productos)")
    
    # Guardar en formato nacional (igual que Walmart, Soriana, etc.)
    # para que aparezca en las busquedas de precios de la app
    nacionales = [
        {
            "producto": {
                "id": f"lores_{p['url'].split('/')[-2] if p['url'] and p['url'].endswith('/') else p['nombre'][:15].replace(' ','_').lower()}",
                "nombre": p["nombre"]
            },
            "precio":   p["precio"],
            "tienda":   p["tienda"],
            "imagen":   p["imagen_url"],
            "url":      p["url"],
        }
        for p in productos
    ]
    with open("ofertas_lores.json", "w", encoding="utf-8") as f:
        json.dump(nacionales, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON nacional guardado: ofertas_lores.json ({len(nacionales)} productos)")
    
    # Guardar en BD
    guardar_en_db(productos)


if __name__ == "__main__":
    run()

# --- Auto git push cuando se ejecuta individualmente ---
import db_manager as _dm
_dm.git_push_datos("tiendaslores")

