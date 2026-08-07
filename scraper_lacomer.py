import requests
import json
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
            url = f"https://lacomer-vector-test.buscador.amarello.com.mx/searchArtPrior?col=lacomer_2&npagel=5&p=1&pasilloId=false&s={termino}&succId=287"
            r = requests.get(url, headers=headers, timeout=10)
            
            if r.status_code == 200:
                data = r.json()
                res = data.get("res", [])
                
                for item in res:
                    nombre = item.get("artDesCom") or item.get("artDes")
                    precio = item.get("artPrven")
                    # El EAN es el id, pero el artCod se usa para la imagen
                    artEan = item.get("artEan", "")
                    artCod = item.get("artCod", "")
                    
                    if nombre and precio:
                        try:
                            precio_float = float(precio)
                            # La ruta correcta proporcionada por el usuario (sin proxy ni CF block)
                            img = f"https://www.lacomer.com.mx/superc/img_art/{artEan}_1.jpg" if artEan else ""
                            
                            ofertas.append({
                                "producto": {"id": f"lacomer_{len(ofertas)}", "nombre": nombre.title()},
                                "precio": precio_float,
                                "tienda": "La Comer",
                                "imagen": img,
                                "url": f"https://www.lacomer.com.mx/lacomer/#!/articulo/{artEan}/" if artEan else ""
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
