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

    driver = None
    try:
        options = uc.ChromeOptions()
        # Sin incognito para guardar reputación de sesión
        options.add_argument('--disable-blink-features=AutomationControlled')
        driver = uc.Chrome(options=options, version_main=db_manager.get_chrome_major_version())
        driver.set_window_size(1280, 800)

        # Evasión avanzada: visitar home primero para obtener cookies reales
        print("Obteniendo cookies iniciales de Farmacias Guadalajara...")
        driver.get(BASE_URL)
        time.sleep(4)

        for termino in BUSQUEDAS:
            print(f"  Buscando en Farmacia GDL: {termino}...")

            url = SEARCH_URL.format(termino)
            driver.execute_script(f"window.location.href = '{url}';")

            # Revisar si cayó en CAPTCHA
            time.sleep(5)
            if "blocked" in driver.current_url or "Verifica tu identidad" in driver.page_source:
                print("CAPTCHA detectado. Intentando auto-resolver (mantener presionado)...")
                try:
                    from selenium.webdriver.common.action_chains import ActionChains
                    from selenium.webdriver.common.by import By
                    captcha = driver.find_element(By.ID, "px-captcha")
                    action = ActionChains(driver)
                    action.click_and_hold(captcha).perform()
                    time.sleep(12)
                    action.release().perform()

                    # Esperar a que valide y recargar la página del producto perdido
                    print("Validando CAPTCHA... recargando búsqueda.")
                    time.sleep(6)
                    driver.execute_script(f"window.location.href = '{url}';")
                    time.sleep(5)

                except Exception as e:
                    print(f"No se pudo auto-resolver: {e}")

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
                for card in cards[:15]:
                    try:
                        nombre_el = card.select_one('a.link')
                        precio_el = card.select_one('.sales .value[content], .sales [content]') or card.select_one('span.value[content]')
                        img_el    = card.select_one('img')
                        link_el   = nombre_el

                        nombre = nombre_el.get_text(strip=True) if nombre_el else ''
                        precio = float(precio_el.get('content', 0)) if precio_el else 0.0
                        imagen = img_el.get('src', '') if img_el else ''
                        url_prod = BASE_URL + link_el.get('href', '') if link_el else url

                        if nombre and precio > 0:
                            ofertas.append({
                                'tienda': "farmagdl",
                                'producto': nombre.strip(),
                                'precio': precio,
                                'imagen': imagen,
                                'termino_busqueda': termino
                            })
                    except Exception:
                        pass

            time.sleep(2)  # Pausa entre búsquedas

    except Exception as e:
        print(f"Error general en scraper_farmagdl: {e}")
    finally:
        if driver:
            driver.quit()

    if ofertas:
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_farmagdl.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"\n¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_farmagdl.json")
        db_manager.guardar_ofertas(ofertas_unicas)
    else:
        print("❌ Farmacias Guadalajara: No se encontraron ofertas.")
        with open("ofertas_farmagdl.json", "w", encoding="utf-8") as f:
            json.dump([], f)

if __name__ == "__main__":
    try:
        import bs4
    except ImportError:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "beautifulsoup4"], check=True)
    run()
