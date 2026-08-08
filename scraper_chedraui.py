import undetected_chromedriver as uc
import json
import time
import db_manager
from bs4 import BeautifulSoup
import sys
from db_manager import BUSQUEDAS

def run():
    print("Iniciando scraper de Chedraui con undetected-chromedriver...")
    ofertas = []

    for termino in BUSQUEDAS:
        print(f"Buscando en Chedraui: {termino}...")
        driver = None
        try:
            options = uc.ChromeOptions()
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            driver = uc.Chrome(options=options)
            driver.set_window_size(1280, 800)

            # Nueva estructura de URL reportada por el usuario
            url = f"https://www.chedraui.com.mx/{termino}?_q={termino}&map=ft"
            driver.get(url)

            # Simular comportamiento humano
            time.sleep(4)
            driver.execute_script("window.scrollBy(0, 600);")
            time.sleep(2)
            driver.execute_script("window.scrollBy(0, 600);")
            time.sleep(2)

            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            # Intentar parsear JSON interno de VTEX (__STATE__)
            state_script = soup.find('script', string=lambda s: s and '__STATE__' in s and 'Price' in s)
            if state_script:
                try:
                    raw = state_script.string
                    json_str = raw[raw.index('{'):raw.rindex('}') + 1]
                    state = json.loads(json_str)
                    for key, val in state.items():
                        if isinstance(val, dict) and 'productName' in val:
                            nombre = val.get('productName', '')
                            precio = 0.0
                            # Buscar precio en claves adyacentes
                            for k, v in state.items():
                                if 'Price' in k and isinstance(v, dict) and v.get('sellingPrice'):
                                    try:
                                        precio = float(v['sellingPrice']) / 100
                                    except:
                                        pass
                                    break
                            imagen = ''
                            for k, v in state.items():
                                if 'Image' in k and isinstance(v, dict) and v.get('imageUrl'):
                                    imagen = v['imageUrl']
                                    break
                            if nombre and precio > 0:
                                ofertas.append({
                                    "producto": {"id": f"chedraui_{len(ofertas)}", "nombre": nombre},
                                    "precio": precio,
                                    "tienda": "Chedraui",
                                    "imagen": imagen,
                                    "url": url
                                })
                except Exception as e:
                    print(f"  Error parseando __STATE__: {e}")

            # Plan B: Raspar HTML visual si no hubo datos del JSON
            if not any(o['tienda'] == 'Chedraui' for o in ofertas[-5:]):
                cards = soup.select('.vtex-product-summary-2-x-container, [class*="productSummary"]')
                for card in cards[:15]:
                    try:
                        nombre_el = card.select_one('[class*="productBrand"], [class*="nameContainer"], h2, h3')
                        precio_el = card.select_one('[class*="sellingPrice"], [class*="Price"]')
                        img_el = card.select_one('img')
                        link_el = card.select_one('a')

                        nombre = nombre_el.get_text(strip=True) if nombre_el else ''
                        precio_txt = precio_el.get_text(strip=True) if precio_el else '0'
                        imagen = img_el.get('src', '') if img_el else ''
                        url_prod = 'https://www.chedraui.com.mx' + link_el.get('href', '') if link_el else url

                        # Limpiar precio: quitar $ , y espacios
                        precio = float(
                            precio_txt.replace('$', '').replace(',', '').strip().split()[0]
                        ) if precio_txt else 0.0

                        if nombre and precio > 0:
                            ofertas.append({
                                "producto": {"id": f"chedraui_{len(ofertas)}", "nombre": nombre},
                                "precio": precio,
                                "tienda": "Chedraui",
                                "imagen": imagen,
                                "url": url_prod
                            })
                    except Exception as e:
                        pass

        except Exception as e:
            print(f"  Error buscando {termino}: {e}")
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass

        time.sleep(2)

    if ofertas:
        vistos = set()
        ofertas_unicas = []
        for o in ofertas:
            n = o["producto"]["nombre"].lower().strip()
            if n not in vistos:
                vistos.add(n)
                ofertas_unicas.append(o)

        with open("ofertas_chedraui.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_chedraui.json")
        db_manager.registrar_ofertas("Chedraui", ofertas_unicas)
    else:
        print("No se encontraron ofertas en Chedraui.")
        with open("ofertas_chedraui.json", "w", encoding="utf-8") as f:
            json.dump([], f)

if __name__ == "__main__":
    try:
        import bs4
    except ImportError:
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "beautifulsoup4"], check=True)
    run()
