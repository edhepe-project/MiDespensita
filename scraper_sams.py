import undetected_chromedriver as uc
import json
import time
import random
import sys
import tempfile
import os
from bs4 import BeautifulSoup
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
import db_manager
from db_manager import BUSQUEDAS

def run():
    print("Iniciando scraper de Sam's Club México con undetected-chromedriver...")
    ofertas = []

    terminos_pendientes = BUSQUEDAS.copy()
    intentos_actuales = 0

    while terminos_pendientes:
        driver = None
        try:
            options = uc.ChromeOptions()
            options.add_argument('--disable-blink-features=AutomationControlled')
            tmp_profile = tempfile.mkdtemp(prefix="sams_session_")
            options.add_argument(f'--user-data-dir={tmp_profile}')

            driver = uc.Chrome(options=options, version_main=db_manager.get_chrome_major_version())
            driver.set_window_size(1280, 900)

            print("Obteniendo cookies iniciales de Sam's Club...")
            driver.get("https://www.sams.com.mx/")
            time.sleep(4)

            reiniciar = False

            while terminos_pendientes and not reiniciar:
                termino = terminos_pendientes[0]
                print(f"Buscando en Sam's: {termino} (Intento {intentos_actuales+1})...")

                url = f"https://www.sams.com.mx/search?q={termino}"
                driver.execute_script(f"window.location.href = '{url}';")

                time.sleep(4)
                if "blocked" in driver.current_url or "Verifica tu identidad" in driver.page_source:
                    print("\n🚨 CAPTCHA DETECTADO. Intentando auto-resolución hiper-aleatoria (Jitter)...")
                    try:
                        captcha = driver.find_element(By.ID, "px-captcha")

                        time.sleep(random.uniform(1.0, 3.0))
                        action = ActionChains(driver)
                        action.move_to_element_with_offset(captcha, random.randint(-20, 20), random.randint(-8, 8))
                        action.pause(random.uniform(0.5, 1.8))
                        action.click_and_hold()
                        action.perform()

                        print("  Manteniendo presionado con patrón orgánico...")
                        num_jitters = random.randint(12, 22)
                        for _ in range(num_jitters):
                            jitter = ActionChains(driver)
                            jitter.move_by_offset(random.randint(-3, 3), random.randint(-3, 3))
                            jitter.pause(random.uniform(0.3, 1.2))
                            jitter.perform()

                        if random.random() > 0.5:
                            time.sleep(random.uniform(0.2, 0.8))
                        ActionChains(driver).release().perform()

                        print("  Validando CAPTCHA... recargando búsqueda.")
                        time.sleep(random.uniform(5.5, 7.5))
                        driver.execute_script(f"window.location.href = '{url}';")
                        time.sleep(random.uniform(3.5, 5.0))
                    except Exception as e:
                        print(f"  Error en auto-resolución: {e}")

                driver.execute_script("window.scrollBy(0, 600);")
                time.sleep(3)

                html = driver.page_source

                if "blocked" in driver.current_url or "Verifica tu identidad" in html:
                    print("  🚨 CAPTCHA PERSISTENTE. Reiniciando navegador...")
                    reiniciar = True
                    break

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

                        for item in items[:15]:
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
                                    'tienda': "Sams",
                                    'producto': {
                                        'id': f"sams_{termino}_{len(ofertas)}",
                                        'nombre': nombre.strip()
                                    },
                                    'precio': precio,
                                    'imagen': imagen,
                                    'termino_busqueda': termino
                                })
                        print(f"  ✅ Se extrajeron productos de {termino} exitosamente.")
                        terminos_pendientes.pop(0)
                        intentos_actuales = 0
                    except json.JSONDecodeError:
                        terminos_pendientes.pop(0)
                        intentos_actuales = 0
                else:
                    print(f"  No se encontró __NEXT_DATA__ para {termino}.")
                    intentos_actuales += 1
                    if intentos_actuales > 3:
                        print(f"  ❌ Se superaron los reintentos para {termino}. Saltando al siguiente...")
                        terminos_pendientes.pop(0)
                        intentos_actuales = 0
                    else:
                        print("  🔄 Posible bloqueo invisible, reiniciando navegador...")
                        reiniciar = True
                        break

                time.sleep(2)

        except Exception as e:
            print(f"Error general en scraper_sams: {e}")
            time.sleep(5)
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass

    if ofertas:
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_sams.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)

        print(f"¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_sams.json")
    else:
        print("❌ Sam's Club: No se encontraron ofertas.")
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
    try:
        import bs4
    except:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "beautifulsoup4"], check=True)

    run()

# --- Auto git push cuando se ejecuta individualmente ---
import db_manager as _dm
_dm.git_push_datos("sams")
