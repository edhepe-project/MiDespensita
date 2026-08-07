from playwright.sync_api import sync_playwright
import json
import db_manager
import time

def run():
    print("Iniciando scraper de Chedraui con Playwright...")
    with sync_playwright() as p:
        # Lanzar navegador
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        )

        ofertas = []

        # Interceptar respuestas de red para buscar los datos en JSON puro (GraphQL)
        def handle_response(response):
            if "/graphql" in response.url and response.status == 200:
                try:
                    data = response.json()
                    # Buscar la estructura de productos de VTEX en las respuestas GraphQL
                    if "data" in data and "productSearch" in data["data"]:
                        products = data["data"]["productSearch"].get("products", [])
                        for prod in products:
                            # Extraer datos relevantes
                            nombre = prod.get("productName", "")
                            items = prod.get("items", [])
                            if not items: continue
                            
                            item = items[0]
                            # Imagen
                            imagen = ""
                            images = item.get("images", [])
                            if images:
                                imagen = images[0].get("imageUrl", "")
                            
                            # Precio
                            precio = 0.0
                            sellers = item.get("sellers", [])
                            if sellers:
                                comm_app = sellers[0].get("commertialOffer")
                                if comm_app:
                                    precio = comm_app.get("Price", 0.0)
                            
                            if nombre and precio > 0:
                                ofertas.append({
                                    "producto": {"id": prod.get("productId", str(len(ofertas))), "nombre": nombre},
                                    "precio": precio,
                                    "tienda": "Chedraui",
                                    "imagen": imagen,
                                    "url": f"https://www.chedraui.com.mx{prod.get('linkText', '')}/p"
                                })
                except Exception as e:
                    pass

        page.on("response", handle_response)

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
        
        for termino in BUSQUEDAS:
            print(f"Buscando en Chedraui: {termino}...")
            url = f"https://www.chedraui.com.mx/busca?q={termino}" if termino != "abarrotes" else "https://www.chedraui.com.mx/supermercado/despensa"
            
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(5)
            except Exception as e:
                print(f"Aviso de timeout de página, intentando continuar: {e}")
        
            # Hacer scroll para cargar más productos
            for _ in range(3):
                try:
                    page.evaluate("window.scrollBy(0, 1000);")
                except:
                    pass
                time.sleep(2)

            # Si el interceptor de red no capturó nada (por caché o diferente estructura),
            # intentamos raspar el DOM visualmente como plan B
            if len(ofertas) == 0:
                print("No se interceptó GraphQL, extrayendo del HTML visible...")
                cards = page.query_selector_all('.vtex-product-summary-2-x-container')
                for i, card in enumerate(cards):
                    nombre_el = card.query_selector('.vtex-product-summary-2-x-brandName')
                    precio_el = card.query_selector('.vtex-product-price-1-x-sellingPriceValue')
                    img_el = card.query_selector('.vtex-product-summary-2-x-imageNormal')
                    link_el = card.query_selector('.vtex-product-summary-2-x-clearLink')

                    if nombre_el and precio_el:
                        nombre = nombre_el.inner_text().strip()
                        precio_str = precio_el.inner_text().strip().replace('$', '').replace(',', '')
                        try:
                            precio = float(precio_str)
                        except:
                            continue
                        
                        imagen = img_el.get_attribute('src') if img_el else ''
                        url = "https://www.chedraui.com.mx" + (link_el.get_attribute('href') if link_el else '')

                        ofertas.append({
                            "producto": {"id": f"chedraui_{i}", "nombre": nombre},
                            "precio": precio,
                            "tienda": "Chedraui",
                            "imagen": imagen,
                            "url": url
                        })

        browser.close()

        # Guardar resultados
        if ofertas:
            # Eliminar duplicados por nombre
            vistos = set()
            ofertas_unicas = []
            for o in ofertas:
                if o['producto']['nombre'] not in vistos:
                    vistos.add(o['producto']['nombre'])
                    ofertas_unicas.append(o)
            
            with open("ofertas_chedraui.json", "w", encoding="utf-8") as f:
                json.dump(ofertas_unicas, f, ensure_ascii=False, indent=2)
            print(f"¡Éxito! Se guardaron {len(ofertas_unicas)} ofertas en ofertas_chedraui.json")
        else:
            print("No se encontraron ofertas. Es posible que Chedraui requiera resolver un Captcha.")

if __name__ == "__main__":
    run()
