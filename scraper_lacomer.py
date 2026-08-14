import requests
import json
import urllib.parse
import db_manager
import time
from db_manager import BUSQUEDAS

def run():
    print("Iniciando scraper de La Comer con API REST...")
    ofertas = []
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.lacomer.com.mx/",
        "Origin": "https://www.lacomer.com.mx"
    }

    for termino in BUSQUEDAS:
        print(f"Buscando: {termino}...")
        try:
            # succId 287 es sucursal por defecto
            url = f"https://lacomer-vector-test.buscador.amarello.com.mx/searchArtPrior?col=lacomer_2&npagel=15&p=1&pasilloId=false&s={termino}&succId=287"
            r = requests.get(url, headers=headers, timeout=10)
            
            if r.status_code == 200:
                data = r.json()
                res = data.get("res", [])
                
                for item in res:
                    nombre_corto = item.get("artDesCom") or item.get("artDes") or ""
                    nombre = nombre_corto.title().strip()
                    marca = item.get("marDes", "").strip()
                    
                    precio_regular = item.get("artPrven", 0)
                    precio_oferta  = item.get("artPrlin", 0)
                    # Usar el precio más bajo disponible (oferta si existe)
                    precio = precio_oferta if precio_oferta and precio_oferta < precio_regular else precio_regular
                    
                    artEan = item.get("artEan", "")
                    agruId = item.get("agruId", "")
                    
                    if nombre and precio and artEan:
                        try:
                            precio_float = float(precio)
                            # Intentar URL directa (detarticulo), usar item-search como respaldo si falta agruId
                            agruId = item.get("agruId", "")
                            if agruId:
                                url_prod = f"https://www.lacomer.com.mx/lacomer/#!/detarticulo/{artEan}/0/{agruId}/1///{agruId}?succId=287&succFmt=100"
                            else:
                                search_term = item.get("artDesCom") or nombre_corto
                                url_prod = f"https://www.lacomer.com.mx/lacomer/#!/item-search/287/{urllib.parse.quote(search_term)}/false?p=1&t=0&succId=287&succFmt=100"
                            
                            # Construir URL de la imagen si hay EAN
                            imagen = f"https://www.lacomer.com.mx/superc/img_art/{artEan}_1.jpg" if artEan else ""
                            
                            ofertas.append({
                                "producto": {"id": f"lacomer_{len(ofertas)}", "nombre": nombre},
                                "precio": precio_float,
                                "tienda": "La Comer",
                                "marca": marca,
                                "imagen": imagen,
                                "url": url_prod
                            })
                        except:
                            pass
                            
            time.sleep(1) # Pequeña pausa entre llamadas API
            
        except Exception as e:
            print(f"  Error buscando {termino}: {e}")

    if ofertas:
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"]["nombre"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_lacomer.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_lacomer.json")
        db_manager.registrar_ofertas("La Comer", ofertas_unicas)
    else:
        print("No se encontraron ofertas en La Comer.")
        with open("ofertas_lacomer.json", "w", encoding="utf-8") as f:
            json.dump([], f)

if __name__ == "__main__":
    run()
