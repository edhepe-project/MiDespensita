import undetected_chromedriver as uc
import json
import time
import re
import db_manager
from bs4 import BeautifulSoup
import sys
from db_manager import BUSQUEDAS

def run():
    print("Iniciando scraper de Walmart México con undetected-chromedriver...")
    ofertas = []
    
    driver = None
    try:
        options = uc.ChromeOptions()
        # Sin incognito para guardar reputación de sesión
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        driver = uc.Chrome(options=options, version_main=db_manager.get_chrome_major_version())
        driver.set_window_size(1280, 900)
        
        # Evasión avanzada para Walmart (PerimeterX)
        print("Obteniendo cookies iniciales de Walmart...")
        driver.get("https://www.walmart.com.mx/")
        time.sleep(4)
        
        for termino in BUSQUEDAS:
            print(f"Buscando en Walmart: {termino}...")
            
            url = f"https://www.walmart.com.mx/search?q={termino}"
            driver.execute_script(f"window.location.href = '{url}';")
            
            # Revisar si cayó en CAPTCHA
            time.sleep(4)
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
                    
                    # Esperar a que PerimeterX valide y recargar la página del producto perdido
                    print("Validando CAPTCHA... recargando búsqueda.")
                    time.sleep(6)
                    driver.execute_script(f"window.location.href = '{url}';")
                    time.sleep(4)
                    
                except Exception as e:
                    print(f"No se pudo auto-resolver: {e}")
            
            driver.execute_script("window.scrollBy(0, 600);")
            time.sleep(3)
            
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
                                'tienda': "walmart",
                                'producto': nombre.strip(),
                                'precio': precio,
                                'imagen': imagen,
                                'termino_busqueda': termino
                            })
                except json.JSONDecodeError:
                    pass
            else:
                print(f"  No se encontró __NEXT_DATA__ para {termino}.")
                
            time.sleep(2) # Pausa entre búsquedas
            
    except Exception as e:
        print(f"Error general en scraper_walmart: {e}")
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

        with open("ofertas_walmart.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
            
        print(f"¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_walmart.json")
        db_manager.guardar_ofertas(ofertas_unicas)
    else:
        print("❌ Walmart: No se encontraron ofertas.")
        with open("ofertas_walmart.json", "w", encoding="utf-8") as f:
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
