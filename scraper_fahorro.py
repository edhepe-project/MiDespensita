import json
import time
import requests
import db_manager
import sys
from db_manager import BUSQUEDAS

def run():
    print("Iniciando scraper de Farmacias del Ahorro (Vía API GraphQL Oculta)...")
    ofertas = []

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://www.fahorro.com',
        'Referer': 'https://www.fahorro.com/'
    }

    url_api = "https://www.fahorro.com/graphql"

    for termino in BUSQUEDAS:
        print(f"  Buscando en Fahorro: {termino}...")
        try:
            # Query para extraer nombre, precio, url e imagen
            query = f"""
            {{
              products(search: "{termino}", pageSize: 15) {{
                items {{
                  name
                  url_key
                  image {{
                    url
                  }}
                  price_range {{
                    minimum_price {{
                      regular_price {{
                        value
                      }}
                    }}
                  }}
                }}
              }}
            }}
            """

            response = requests.post(url_api, headers=headers, json={'query': query}, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                items = data.get('data', {}).get('products', {}).get('items', [])
                
                if not items:
                    print(f"    No se encontraron productos para '{termino}'.")
                else:
                    for item in items:
                        try:
                            nombre = item.get('name', '').strip()
                            url_key = item.get('url_key', '')
                            img_url = item.get('image', {}).get('url', '')
                            precio = item.get('price_range', {}).get('minimum_price', {}).get('regular_price', {}).get('value', 0.0)

                            if nombre and precio and precio > 0:
                                # URL directa funciona en navegador real (solo bots obtienen 403 de Imperva)
                                url_prod = f"https://www.fahorro.com/{url_key}.html" if url_key else f"https://www.fahorro.com/search/result/?q={nombre.replace(' ', '+')}"
                                
                                ofertas.append({
                                    "producto": {
                                        "id": f"fahorro_{len(ofertas)}",
                                        "nombre": nombre
                                    },
                                    "precio": float(precio),
                                    "tienda": "Farmacias del Ahorro",
                                    "imagen": img_url,
                                    "url": url_prod
                                })
                        except Exception as e:
                            pass
            else:
                print(f"    Error en la API para '{termino}': Status {response.status_code}")

        except Exception as e:
            print(f"    Error buscando '{termino}': {e}")
        
        time.sleep(1) # Pequeña pausa para no saturar la API

    if ofertas:
        # Eliminar duplicados por nombre
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"]["nombre"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_fahorro.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"\n¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_fahorro.json")

        # Registrar en base de datos histórica
        db_manager.registrar_ofertas("Farmacias del Ahorro", ofertas_unicas)
    else:
        print("No se encontraron ofertas en Farmacias del Ahorro.")
        with open("ofertas_fahorro.json", "w", encoding="utf-8") as f:
            json.dump([], f)

if __name__ == "__main__":
    try:
        import requests
    except ImportError:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "requests"], check=True)
    run()
