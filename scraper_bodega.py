import undetected_chromedriver as uc
import json
import time
from bs4 import BeautifulSoup
import db_manager
from db_manager import BUSQUEDAS

def run():
    print("Iniciando scraper de Bodega Aurrerá con undetected-chromedriver...")
    ofertas = []
    
    driver = None
    try:
        options = uc.ChromeOptions()
        # Sin incognito para guardar reputación de sesión
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        driver = uc.Chrome(options=options, version_main=db_manager.get_chrome_major_version())
        driver.set_window_size(1280, 900)
        
        # Evasión avanzada (PerimeterX)
        print("Obteniendo cookies iniciales de Bodega Aurrerá...")
        driver.get("https://www.bodegaaurrera.com.mx/")
        time.sleep(4)
        
        for termino in BUSQUEDAS:
            print(f"Buscando en Bodega: {termino}...")
            
            url = f"https://www.bodegaaurrera.com.mx/search?q={termino}"
            driver.execute_script(f"window.location.href = '{url}';")
            
            # Revisar si cayó en CAPTCHA
            time.sleep(4)
            if "blocked" in driver.current_url or "Verifica tu identidad" in driver.page_source:
                print("\n🚨 CAPTCHA DETECTADO. Intentando auto-resolución hiper-aleatoria (Jitter)...")
                try:
                    import random
                    from selenium.webdriver.common.action_chains import ActionChains
                    from selenium.webdriver.common.by import By
                    
                    captcha = driver.find_element(By.ID, "px-captcha")
                    
                    # 1. Movimiento inicial descentrado y pausa aleatoria antes de clickear
                    time.sleep(random.uniform(1.0, 3.0))
                    action = ActionChains(driver)
                    # Offset inicial completamente aleatorio
                    action.move_to_element_with_offset(captcha, random.randint(-20, 20), random.randint(-8, 8))
                    action.pause(random.uniform(0.5, 1.8))
                    action.click_and_hold()
                    action.perform()
                    
                    # 2. Mantener presionado con patrón aleatorio (Jitter)
                    print("  Manteniendo presionado con patrón orgánico...")
                    
                    # Número aleatorio de temblores y duración variable para despistar a la IA
                    num_jitters = random.randint(12, 22)
                    for _ in range(num_jitters):
                        jitter = ActionChains(driver)
                        # Movimientos más caóticos, a veces no se mueve (0)
                        jitter.move_by_offset(random.randint(-3, 3), random.randint(-3, 3))
                        # Pausas caóticas entre cada pequeño temblor
                        jitter.pause(random.uniform(0.3, 1.2))
                        jitter.perform()
                        
                    # 3. Soltar (con una pequeña pausa extra a veces)
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
                                'tienda': "bodega",
                                'producto': nombre.strip(),
                                'precio': precio,
                                'imagen': imagen,
                                'termino_busqueda': termino
                            })
                    print(f"  ✅ Se extrajeron productos de {termino} exitosamente.")
                except json.JSONDecodeError:
                    pass
            else:
                print(f"  No se encontró __NEXT_DATA__ para {termino}.")
                
            time.sleep(2) # Pausa entre búsquedas
            
    except Exception as e:
        print(f"Error general en scraper_bodega: {e}")
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

        with open("ofertas_bodega.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
            
        print(f"¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_bodega.json")
        db_manager.guardar_ofertas(ofertas_unicas)
    else:
        print("❌ Bodega Aurrerá: No se encontraron ofertas.")
        with open("ofertas_bodega.json", "w", encoding="utf-8") as f:
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
    run()

# --- Auto git push cuando se ejecuta individualmente ---
import db_manager as _dm
_dm.git_push_datos("bodega")

