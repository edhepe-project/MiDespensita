import undetected_chromedriver as uc
import json
import time
import db_manager
from bs4 import BeautifulSoup
import sys

BUSQUEDAS = [
    # Abarrotes
    "arroz", "frijol", "aceite", "azucar", "cereal", "galletas",
    "atun", "pasta", "cafe", "pan", "mayonesa", "salsa", "sal",
    "tortillas", "sardina", "chorizo", "chile", "vinagre", "ketchup",
    # Lácteos
    "leche", "huevo", "queso", "crema", "yogurt", "mantequilla",
    # Salchichonería
    "jamon", "salchicha",
    # Higiene personal
    "shampoo", "jabon", "pasta dental", "desodorante", "pañales",
    # Limpieza hogar
    "papel higienico", "detergente", "cloro", "suavizante",
    # Bebidas
    "refresco", "agua", "cerveza", "vino", "tequila", "whisky", "licor",
    # Cuidado cabello
    "gel", "acondicionador", "tinte cabello"
]

def run():
    print("Iniciando scraper de Sam's Club México con undetected-chromedriver...")
    ofertas = []
    
    for termino in BUSQUEDAS:
        print(f"Buscando: {termino}...")
        driver = None
        try:
            options = uc.ChromeOptions()
            # Ocultar la ventana en lo posible
            driver = uc.Chrome(options=options)
            driver.set_window_size(1024, 768)
            
            url = f"https://www.sams.com.mx/search/Ntt={termino}"
            driver.get(url)
            
            # Simular comportamiento humano
            time.sleep(3)
            driver.execute_script("window.scrollBy(0, 500);")
            time.sleep(4)
            
            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            
            if script and script.string:
                try:
                    data = json.loads(script.string)
                    items = deep_get(data, "props", "pageProps", "initialData", "searchResult", "itemStacks")
                    if items and isinstance(items, list):
                        items = items[0].get("items", [])
                        
                    if not items:
                        items = deep_get(data, "props", "pageProps", "initialData", "data", "search", "items") or []
                        
                    for item in items[:5]:
                        nombre = item.get("name") or item.get("title") or ""
                        precio = (
                            deep_get(item, "priceInfo", "currentPrice", "price") or
                            deep_get(item, "price") or
                            item.get("salePrice") or 0
                        )
                        imagen = (
                            deep_get(item, "imageInfo", "thumbnailUrl") or
                            item.get("thumbnail") or item.get("imageUrl") or ""
                        )
                        
                        try:
                            precio = float(str(precio).replace("$", "").replace(",", "").strip())
                        except:
                            precio = 0.0

                        if nombre and precio > 0:
                            ofertas.append({
                                "producto": {"id": f"sams_{item.get('id', len(ofertas))}", "nombre": nombre},
                                "precio": precio,
                                "tienda": "Sams",
                                "imagen": imagen,
                                "url": "https://www.sams.com.mx" + item.get("canonicalUrl", "")
                            })
                            
                except Exception as e:
                    print(f"  Error parseando JSON: {e}")
            else:
                print(f"  No se encontró __NEXT_DATA__ para {termino}. ¿Quizás captcha?")
                
        except Exception as e:
            print(f"  Error buscando {termino}: {e}")
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass
        
        # Pausa entre búsquedas
        time.sleep(2)

    if ofertas:
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"]["nombre"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_sams.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_sams.json")
        
        # Registrar en la base de datos histórica
        db_manager.registrar_ofertas("Sams", ofertas_unicas)
    else:
        print("No se encontraron ofertas.")
        # Escribir JSON vacío
        with open("ofertas_sams.json", "w", encoding="utf-8") as f:
            json.dump([], f)

def deep_get(d, *keys):
    for k in keys:
        if isinstance(d, dict):
            d = d.get(k)
        elif isinstance(d, list) and d:
            d = d[0].get(k) if isinstance(d[0], dict) else None
        else:
            return None
    return d

if __name__ == "__main__":
    # Instalar bs4 si no está
    try:
        import bs4
    except:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "beautifulsoup4"], check=True)
        
    run()
