import requests
import json
import time
import db_manager
from db_manager import BUSQUEDAS

BASE_URL = "https://www.chedraui.com.mx"
SEARCH_API = BASE_URL + "/api/io/_v/api/intelligent-search/product_search"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': BASE_URL + '/',
}

def run():
    print("Iniciando scraper de Chedraui (VTEX Intelligent Search API)...")
    ofertas = []

    for termino in BUSQUEDAS:
        print(f"  Buscando en Chedraui: {termino}...")
        try:
            params = {
                'query': termino,
                'count': 15,
                'locale': 'es-MX',
                'hideUnavailableItems': 'true',
            }
            r = requests.get(SEARCH_API, headers=HEADERS, params=params, timeout=15)

            if r.status_code != 200:
                print(f"    HTTP {r.status_code} para '{termino}'")
                continue

            data = r.json()
            productos = data.get('products', [])

            if not productos:
                print(f"    Sin resultados para '{termino}'")
                continue

            for prod in productos[:15]:
                try:
                    nombre = prod.get('productName', '').strip()
                    if not nombre:
                        continue

                    # Precio: de priceRange -> sellingPrice -> lowPrice
                    precio = 0.0
                    price_range = prod.get('priceRange', {})
                    selling = price_range.get('sellingPrice', {})
                    precio_raw = selling.get('lowPrice', 0) or selling.get('highPrice', 0)
                    if precio_raw:
                        precio = float(precio_raw)

                    # Alternativa: desde items[0].sellers[0].commertialOffer.Price
                    if precio == 0:
                        items = prod.get('items', [])
                        if items:
                            sellers = items[0].get('sellers', [])
                            if sellers:
                                offer = sellers[0].get('commertialOffer', {})
                                precio = float(offer.get('Price', 0) or offer.get('ListPrice', 0))

                    if precio == 0:
                        continue

                    # Imagen
                    imagen = ''
                    items = prod.get('items', [])
                    if items and items[0].get('images'):
                        imagen = items[0]['images'][0].get('imageUrl', '')

                    # URL del producto
                    link_text = prod.get('linkText', '')
                    url_prod = f"{BASE_URL}/{link_text}/p" if link_text else BASE_URL

                    ofertas.append({
                        "producto": {
                            "id": f"chedraui_{prod.get('productId', len(ofertas))}",
                            "nombre": nombre
                        },
                        "precio": precio,
                        "tienda": "Chedraui",
                        "imagen": imagen,
                        "url": url_prod
                    })

                except Exception as e:
                    pass

            print(f"    {len([o for o in ofertas if o['tienda'] == 'Chedraui'])} resultados hasta ahora")

        except Exception as e:
            print(f"    Error buscando '{termino}': {e}")

        time.sleep(0.5)  # Pausa breve — no necesitamos tanto delay sin navegador

    if ofertas:
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"]["nombre"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_chedraui.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"Listo! {len(ofertas_unicas)} ofertas en ofertas_chedraui.json")
        db_manager.registrar_ofertas("Chedraui", ofertas_unicas)
    else:
        print("No se encontraron ofertas en Chedraui.")
        with open("ofertas_chedraui.json", "w", encoding="utf-8") as f:
            json.dump([], f)

if __name__ == "__main__":
    run()

# --- Auto git push cuando se ejecuta individualmente ---
import db_manager as _dm
_dm.git_push_datos("chedraui")

