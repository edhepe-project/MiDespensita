import undetected_chromedriver as uc
import json
import db_manager
import time
from bs4 import BeautifulSoup

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
    print("Iniciando scraper de Soriana con undetected-chromedriver...")
    ofertas = []

    for termino in BUSQUEDAS:
        print(f"Buscando: {termino}...")
        driver = None
        try:
            options = uc.ChromeOptions()
            driver = uc.Chrome(options=options)
            driver.set_window_size(1280, 900)

            url = f"https://www.soriana.com/buscar?q={termino}"
            driver.get(url)
            time.sleep(4)
            driver.execute_script("window.scrollBy(0, 800);")
            time.sleep(3)

            html = driver.page_source
            soup = BeautifulSoup(html, "html.parser")
            cards = soup.select(".product-tile")

            for i, card in enumerate(cards[:5]):
                nombre_el = card.select_one("a.plp-link")
                precio_el = card.select_one(".contentPrices")
                img_el = card.select_one("img.tile-image") or card.select_one('img[src*="product"]') or card.select_one("img")
                link_el = card.select_one("a.plp-link")

                if nombre_el and precio_el:
                    nombre = nombre_el.get_text(strip=True)
                    precio_str = precio_el.get_text(strip=True).replace("$", "").replace(",", "")
                    precio_str = precio_str.split("\n")[0].strip()
                    try:
                        precio = float(precio_str)
                    except:
                        continue

                    imagen = img_el.get("src") if img_el else ""
                    href = link_el.get("href", "") if link_el else ""
                    if href and href.startswith("/"):
                        href = "https://www.soriana.com" + href

                    if nombre and precio > 0:
                        ofertas.append({
                            "producto": {"id": f"soriana_{len(ofertas)}", "nombre": nombre},
                            "precio": precio,
                            "tienda": "Soriana",
                            "imagen": imagen,
                            "url": href or url
                        })

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

        with open("ofertas_soriana.json", "w", encoding="utf-8") as f:
            json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
        print(f"¡Éxito! {len(ofertas_unicas)} ofertas guardadas en ofertas_soriana.json")
        db_manager.registrar_ofertas("Soriana", ofertas_unicas)
    else:
        print("No se encontraron ofertas en Soriana.")
        with open("ofertas_soriana.json", "w", encoding="utf-8") as f:
            json.dump([], f)

if __name__ == "__main__":
    run()
