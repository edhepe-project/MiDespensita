"""
scraper_dbodegaocampo.py
Scraper dedicado a Super D'Bodega Ocampo.
Usa login real con perfil persistente de Edge para evadir detecciÃ³n.
Extrae hasta 20 fotos recientes navegando con el teclado en el visor de fotos.
"""

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import random
import json
import sqlite3
from datetime import datetime, timedelta
import db_manager

# â”€â”€â”€ CONFIGURACIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
FB_EMAIL    = "apps.edhepe@gmail.com"
FB_PASSWORD = "Paraiso#35"

PAGINAS = [
    {
        "nombre": "Super D'Bodega Ocampo",
        "url": "https://www.facebook.com/SuperDBodegaOcampo",
    },
]

MAX_POSTS_POR_PAGINA = 25  # CuÃ¡ntos posts revisar por pÃ¡gina
HORAS_MAXIMO = 48          # Solo publicaciones de las Ãºltimas 48 horas
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


# Carpeta donde se guardan las cookies del scraper (persistente entre ejecuciones)
FB_PROFILE_DIR = r"D:\msc\fb_profile"

def iniciar_driver():
    """
    Inicia Edge con un perfil DEDICADO al scraper.
    Las cookies de Facebook se guardan entre ejecuciones en fb_profile/.
    Usa Edge (ya instalado y funcional) con selenium estÃ¡ndar.
    """
    from selenium import webdriver
    from selenium.webdriver.edge.options import Options as EdgeOptions
    from selenium.webdriver.edge.service import Service as EdgeService

    options = EdgeOptions()
    options.add_argument(f"--user-data-dir={FB_PROFILE_DIR}")
    options.add_argument("--profile-directory=Default")
    options.add_argument("--disable-notifications")
    options.add_argument("--lang=es-MX")
    options.add_argument("--no-first-run")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    driver = webdriver.Edge(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    driver.set_window_size(1280, 900)
    return driver


def escribir_lento(element, texto):
    """Escribe un texto simulando velocidad humana."""
    for char in texto:
        element.send_keys(char)
        time.sleep(random.uniform(0.08, 0.25))
        if random.random() < 0.08:
            time.sleep(random.uniform(0.3, 0.6))


def login(driver, email, password):
    """Hace login en Facebook simulando comportamiento humano."""
    print("Iniciando sesiÃ³n en Facebook...")
    driver.get("https://www.facebook.com/login")
    time.sleep(random.uniform(4, 6))  # Esperar carga completa

    # Correo
    campo_email = WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.NAME, "email"))
    )
    escribir_lento(campo_email, email)
    time.sleep(random.uniform(0.8, 1.5))

    # ContraseÃ±a
    campo_pass = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.NAME, "pass"))
    )
    escribir_lento(campo_pass, password)
    time.sleep(random.uniform(0.8, 1.5))

    # Clic en "Iniciar sesiÃ³n" â€” mÃºltiples selectores de fallback
    boton = None
    selectores = [
        (By.ID, "loginbutton"),
        (By.NAME, "login"),
        (By.XPATH, "//button[@id='loginbutton']"),
        (By.XPATH, "//button[@type='submit']"),
        (By.XPATH, "//input[@type='submit']"),
        (By.XPATH, "//*[@data-testid='royal_login_button']"),
    ]
    for metodo, selector in selectores:
        try:
            boton = driver.find_element(metodo, selector)
            if boton.is_displayed():
                print(f"  BotÃ³n de login encontrado con: {selector}")
                break
        except:
            boton = None
            continue

    if boton is None:
        # Guardar screenshot para debug
        driver.save_screenshot("debug_fb_login.png")
        raise Exception("No se encontrÃ³ el botÃ³n de login. Se guardÃ³ debug_fb_login.png para revisar.")

    ActionChains(driver)\
        .move_to_element(boton)\
        .pause(random.uniform(0.2, 0.6))\
        .click()\
        .perform()

    print("Esperando carga despuÃ©s del login...")
    time.sleep(random.uniform(8, 12))
    print("âœ… Login completado.")


def extraer_posts_con_imagen(driver, nombre_tienda, url_pagina):
    """
    Extrae imÃ¡genes directamente navegando en el visor de fotos de Facebook.
    Abre la primera foto y simula presionar la flecha derecha para avanzar,
    capturando la imagen de alta resoluciÃ³n hasta un mÃ¡ximo de 20 fotos.
    """
    url_fotos = url_pagina.rstrip('/') + '/photos'
    print(f"\nNavegando a galerÃ­a de fotos: {nombre_tienda}")
    print(f"  URL: {url_fotos}")
    driver.get(url_fotos)
    time.sleep(random.uniform(4, 6))

    posts_encontrados = []
    
    soup = BeautifulSoup(driver.page_source, "html.parser")
    # Encontrar la primera imagen de la cuadrÃ­cula
    imgs = soup.find_all("img", {"class": lambda c: c and "x1exxf4d" in c})
    
    first_link = None
    for img in imgs:
        parent = img.find_parent("a")
        if parent and parent.get("href"):
            first_link = parent.get("href")
            break

    if not first_link:
        print("  âš ï¸ No se encontrÃ³ ninguna foto para abrir.")
        return posts_encontrados

    try:
        from selenium.webdriver.common.by import By
        from selenium.webdriver.common.keys import Keys
        
        print("  Haciendo click en la primera foto...")
        el = driver.find_element(By.XPATH, f"//a[@href='{first_link}']")
        driver.execute_script("arguments[0].click();", el)
        time.sleep(3) # Esperar a que abra el visor
        
        intentos_sin_cambio = 0
        ultima_url = ""

        # Navegar hasta 20 fotos usando la flecha derecha
        for i in range(MAX_POSTS_POR_PAGINA):
            soup_foto = BeautifulSoup(driver.page_source, "html.parser")
            
            # Buscar la imagen principal en alta resoluciÃ³n
            img_alta = soup_foto.find("img", {"data-visualcompletion": "media-vc-image"})
            
            if img_alta:
                imagen_url = img_alta.get("src", "")
                alt_text = img_alta.get("alt", "")
                
                # Prevenir bucles si Facebook no avanza
                if imagen_url == ultima_url:
                    intentos_sin_cambio += 1
                    if intentos_sin_cambio > 3:
                        print("  âš ï¸ La imagen no cambiÃ³. Terminando.")
                        break
                else:
                    intentos_sin_cambio = 0
                    ultima_url = imagen_url
                    
                    if imagen_url and not "emoji" in imagen_url and not "static" in imagen_url and not ("foto de perfil" in alt_text.lower() and nombre_tienda.lower() in alt_text.lower()):
                        entrada = {
                            "tienda": nombre_tienda,
                            "imagen_url": imagen_url,
                            "fecha_texto": "Reciente",
                            "fecha_guardado": datetime.now().isoformat(),
                            "texto": alt_text[:200],
                            "post_url": url_pagina,
                            "pagina_facebook": url_pagina,
                        }

                        if not any(p["imagen_url"] == imagen_url for p in posts_encontrados):
                            posts_encontrados.append(entrada)
                            print(f"  ðŸ“¸ Imagen [{len(posts_encontrados)}] extraÃ­da: {imagen_url[:50]}...")
            else:
                print("  â³ No se encontrÃ³ la imagen en el visor.")

            # Simular presionar la flecha derecha para ir a la siguiente foto
            driver.find_element(By.TAG_NAME, "body").send_keys(Keys.RIGHT)
            time.sleep(random.uniform(1.0, 2.0))

    except Exception as e:
        print(f"  âŒ Error navegando en las fotos: {e}")

    print(f"  â†’ {len(posts_encontrados)} fotos extraÃ­das mediante navegaciÃ³n interactiva de {nombre_tienda}.")
    return posts_encontrados


def guardar_en_db(posts):
    """Guarda los posts en la tabla local_ofertas de la BD SQLite."""
    if not posts:
        return

    con = sqlite3.connect(db_manager.DB_FILE)
    cur = con.cursor()

    # Crear tabla si no existe
    cur.execute("""
        CREATE TABLE IF NOT EXISTS local_ofertas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tienda TEXT,
            imagen_url TEXT UNIQUE,
            fecha_texto TEXT,
            fecha_guardado TEXT,
            texto TEXT,
            post_url TEXT,
            pagina_facebook TEXT
        )
    """)

    insertados = 0
    for p in posts:
        try:
            cur.execute("""
                INSERT OR IGNORE INTO local_ofertas
                    (tienda, imagen_url, fecha_texto, fecha_guardado, texto, post_url, pagina_facebook)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                p["tienda"], p["imagen_url"], p["fecha_texto"],
                p["fecha_guardado"], p["texto"], p["post_url"], p["pagina_facebook"]
            ))
            if cur.rowcount > 0:
                insertados += 1
        except Exception as e:
            print(f"  Error al guardar: {e}")

    # Limpiar posts de mÃ¡s de 48 horas
    hace_48h = (datetime.now() - timedelta(hours=48)).isoformat()
    cur.execute("DELETE FROM local_ofertas WHERE fecha_guardado < ?", (hace_48h,))
    eliminados = cur.rowcount

    con.commit()
    con.close()

    print(f"\nâœ… BD actualizada: {insertados} nuevos posts guardados, {eliminados} posts vencidos eliminados.")


def run():
    """FunciÃ³n principal que corre el scraper completo."""
    print("=" * 60)
    print("  SCRAPER FACEBOOK â€” Super D'Bodega Ocampo")
    print("=" * 60)

    driver = None
    todos_los_posts = []

    try:
        driver = iniciar_driver()
        
        # Ir a Facebook y verificar si ya hay sesiÃ³n activa
        driver.get("https://www.facebook.com/")
        time.sleep(5)
        
        if "login" in driver.current_url or "checkpoint" in driver.current_url:
            # Primera vez â€” pedir al usuario que se loguee manualmente
            print("\n" + "="*60)
            print("  PRIMERA VEZ â€” SE NECESITA LOGIN MANUAL")
            print("="*60)
            print("El navegador estÃ¡ abierto en la pÃ¡gina de Facebook.")
            print("Por favor:")
            print("  1. Inicia sesiÃ³n manualmente en la ventana de Chrome")
            print("  2. Una vez que veas tu feed de Facebook, regresa aquÃ­")
            print("  3. Presiona ENTER para continuar")
            print("(Las cookies se guardarÃ¡n y la prÃ³xima vez serÃ¡ automÃ¡tico)")
            print("="*60)
            input("\nðŸ‘‰ Presiona ENTER cuando hayas iniciado sesiÃ³n en Facebook...")
            
            # Verificar que el login fue exitoso
            if "login" in driver.current_url:
                raise Exception("No se detectÃ³ sesiÃ³n activa despuÃ©s del login manual.")
            print("âœ… Login manual completado. Las cookies han sido guardadas.")
        else:
            print("âœ… SesiÃ³n de Facebook detectada automÃ¡ticamente. Continuando...")

        for pagina in PAGINAS:
            posts = extraer_posts_con_imagen(
                driver,
                pagina["nombre"],
                pagina["url"]
            )
            todos_los_posts.extend(posts)

    except Exception as e:
        print(f"\nâŒ Error general: {e}")
    finally:
        if driver:
            driver.quit()

    # Guardar en archivo JSON de prueba
    with open("ofertas_dbodegaocampo.json", "w", encoding="utf-8") as f:
        json.dump(todos_los_posts, f, ensure_ascii=False, indent=2)
    print(f"\nðŸ“„ JSON guardado: ofertas_dbodegaocampo.json ({len(todos_los_posts)} posts)")

    # Guardar en BD
    guardar_en_db(todos_los_posts)


if __name__ == "__main__":
    run()
