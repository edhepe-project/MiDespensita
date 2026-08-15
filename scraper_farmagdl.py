import undetected_chromedriver as uc
import json
import time
import db_manager
from bs4 import BeautifulSoup
import sys
from db_manager import BUSQUEDAS

BASE_URL = "https://www.farmaciasguadalajara.com"
SEARCH_URL = BASE_URL + "/buscar/?q={}&search-button=&lang=null"

def run():
    print("Iniciando scraper de Farmacias Guadalajara con undetected-chromedriver...")
    ofertas = []

    for termino in BUSQUEDAS:
        print(f"  Buscando en Farmacia GDL: {termino}...")
        driver = None
        try:
            options = uc.ChromeOptions()
            options.add_argument('--disable-blink-features=AutomationControlled')
            driver = uc.Chrome(options=options, version_main=db_manager.get_chrome_major_version())
            driver.set_window_size(1280, 800)

            url = SEARCH_URL.format(termino)
            driver.get(url)

            # Simular comportamiento humano
            time.sleep(5)
            driver.execute_script("window.scrollBy(0, 500);")
            time.sleep(2)
            driver.execute_script("window.scrollBy(0, 800);")
            time.sleep(2)

            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            cards = soup.select('.product-tile-main')
            if not cards:
                print(f"    No se encontraron tarjetas para '{termino}'.")
            else:
                for card in cards[:15]:  # Máximo 15 por búsqueda
                    try:
                        nombre_el = card.select_one('a.link')
                        precio_el = card.select_one('.sales .value[content], .sales [content]') or card.select_one('span.value[content]')
                        img_el    = card.select_one('img')
                        link_el   = nombre_el  # el link está en el mismo elemento del nombre

                        nombre = nombre_el.get_text(strip=True) if nombre_el else ''
                        precio = float(precio_el.get('content', 0)) if precio_el else 0.0
                        imagen = img_el.get('src', '') if img_el else ''
                        url_prod = BASE_URL + link_el.get('href', '') if link_el else url

                        if nombre and precio > 0:
                            ofertas.append({
                                "producto": {
                                    "id": f"farma_{len(ofertas)}",
                                    "nombre": nombre
                                },
                                "precio": precio,
                                "tienda": "Farmacia Guadalajara",
                                "imagen": imagen,
                                "url": url_prod
                            })
                    except Exception as e:
                        pass

        except Exception as e:
            print(f"    Error buscando '{termino}': {e}")
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass

        time.sleep(2)

    if ofertas:
        # Eliminar duplicados por nombre
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"]["nombre"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_farmagdl.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"\n¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_farmagdl.json")

        # Registrar en base de datos histórica
        db_manager.registrar_ofertas("Farmacia Guadalajara", ofertas_unicas)
    else:
        print("No se encontraron ofertas en Farmacias Guadalajara.")
        with open("ofertas_farmagdl.json", "w", encoding="utf-8") as f:
            json.dump([], f)

if __name__ == "__main__":
    try:
        import bs4
    except ImportError:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "beautifulsoup4"], check=True)
    run()
