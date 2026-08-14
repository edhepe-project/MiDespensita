import undetected_chromedriver as uc
import json
import time
import re
import db_manager
from bs4 import BeautifulSoup
import sys
from db_manager import BUSQUEDAS

BASE_URL = "https://www.fahorro.com"
SEARCH_URL = BASE_URL + "/search/result/?q={}"

def run():
    print("Iniciando scraper de Farmacias del Ahorro con undetected-chromedriver...")
    ofertas = []

    for termino in BUSQUEDAS:
        print(f"  Buscando en Fahorro: {termino}...")
        driver = None
        try:
            options = uc.ChromeOptions()
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_argument(
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            driver = uc.Chrome(options=options, version_main=151)
            driver.set_window_size(1280, 800)

            url = SEARCH_URL.format(termino)
            driver.get(url)

            # Simular comportamiento humano
            time.sleep(5)
            driver.execute_script("window.scrollBy(0, 600);")
            time.sleep(2)
            driver.execute_script("window.scrollBy(0, 800);")
            time.sleep(2)

            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            cards = soup.select('li.product-item')
            if not cards:
                print(f"    No se encontraron productos para '{termino}'.")
            else:
                for card in cards[:15]:  # Máximo 15 por búsqueda
                    try:
                        link_el   = card.select_one('a.product-item-photo')
                        precio_el = card.select_one('.price')
                        img_el    = card.select_one('img.product-image-photo')

                        # El nombre está en el atributo title del link o alt de img
                        nombre = (
                            link_el.get('title', '').strip()
                            if link_el else
                            (img_el.get('alt', '').strip() if img_el else '')
                        )
                        url_prod = link_el.get('href', url) if link_el else url
                        imagen   = img_el.get('src', '') if img_el else ''

                        # Limpiar precio: tomar solo el primer número del texto (ej. "$31.00MXN..." → 31.00)
                        precio_txt = precio_el.get_text(strip=True) if precio_el else ''
                        precio_match = re.search(r'[\d,]+\.?\d*', precio_txt.replace(',', ''))
                        precio = float(precio_match.group()) if precio_match else 0.0

                        if nombre and precio > 0:
                            ofertas.append({
                                "producto": {
                                    "id": f"fahorro_{len(ofertas)}",
                                    "nombre": nombre
                                },
                                "precio": precio,
                                "tienda": "Farmacias del Ahorro",
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
        import bs4
    except ImportError:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "beautifulsoup4"], check=True)
    run()
