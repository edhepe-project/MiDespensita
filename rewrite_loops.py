import os
import re

files = ["scraper_bodega.py", "scraper_walmart.py", "scraper_sams.py"]

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
        
    # Replace the top part
    old_top = re.search(r"    driver = None\n    try:\n        options = uc\.ChromeOptions\(\)\n.*?        for termino in BUSQUEDAS:\n            print\(f\"Buscando en [a-zA-ZáéíóúÁÉÍÓÚ' ]+: \{termino\}\.\.\.\"\)\n", content, re.DOTALL)
    if old_top:
        store_url = "https://www.walmart.com.mx/" if "walmart" in f else "https://www.sams.com.mx/" if "sams" in f else "https://www.bodegaaurrera.com.mx/"
        new_top = f"""    terminos_pendientes = BUSQUEDAS.copy()
    intentos_actuales = 0
    
    while terminos_pendientes:
        termino = terminos_pendientes[0]
        driver = None
        try:
            options = uc.ChromeOptions()
            options.add_argument('--disable-blink-features=AutomationControlled')
            
            driver = uc.Chrome(options=options, version_main=db_manager.get_chrome_major_version())
            driver.set_window_size(1280, 900)
            
            print("Obteniendo cookies iniciales...")
            driver.get("{store_url}")
            time.sleep(4)
            
            while terminos_pendientes:
                termino = terminos_pendientes[0]
                print(f"Buscando: {{termino}} (Intento {{intentos_actuales+1}})...")
"""
        content = content.replace(old_top.group(0), new_top)
    
    # We now have to indent everything after `print(f"Buscando...` by 4 spaces up until the `except Exception as e:` line!
    # Let's split into lines and do this carefully.
    lines = content.split('\n')
    new_lines = []
    in_inner = False
    
    for i, line in enumerate(lines):
        if line.strip() == 'print(f"Buscando: {termino} (Intento {intentos_actuales+1})...")':
            new_lines.append(line)
            in_inner = True
            continue
            
        if line.startswith('    except Exception as e:') and in_inner:
            in_inner = False
            
        if in_inner and line.strip() != "":
            # Indent by 4 spaces
            new_lines.append("    " + line)
        else:
            new_lines.append(line)
            
    # Now replace the specific logic pieces inside the newly indented block
    content = '\n'.join(new_lines)
    
    # Replace CAPTCHA block
    old_captcha_end = r"            driver\.execute_script\(\"window\.scrollBy\(0, 600\);\"\)\n            time\.sleep\(\d\)\n            \n            html = driver\.page_source\n            soup = BeautifulSoup\(html, 'html\.parser'\)"
    new_captcha_end = r"""                driver.execute_script("window.scrollBy(0, 600);")
                time.sleep(4)
                
                html = driver.page_source
                if "blocked" in driver.current_url or "Verifica tu identidad" in html:
                    print("  🚨 CAPTCHA PERSISTENTE. Reiniciando navegador...")
                    break
                
                soup = BeautifulSoup(html, 'html.parser')"""
    content = re.sub(old_captcha_end, new_captcha_end, content, flags=re.DOTALL)
    
    # Replace success block
    old_success = r"                        print\(f\"  ✅ Se extrajeron productos de \{termino\} exitosamente\.\"\)\n                    except json\.JSONDecodeError:\n                        pass"
    new_success = r"""                        print(f"  ✅ Se extrajeron productos de {termino} exitosamente.")
                        terminos_pendientes.pop(0)
                        intentos_actuales = 0
                    except json.JSONDecodeError:
                        terminos_pendientes.pop(0)
                        intentos_actuales = 0"""
    content = re.sub(old_success, new_success, content, flags=re.DOTALL)
    
    # Replace fail block (no __NEXT_DATA__)
    old_fail = r"                else:\n                    print\(f\"  No se encontró __NEXT_DATA__ para \{termino\}\.\"\)\n                    \n                time\.sleep\(2\)"
    new_fail = r"""                else:
                    print(f"  No se encontró __NEXT_DATA__ para {termino}.")
                    intentos_actuales += 1
                    if intentos_actuales > 3:
                        print(f"  ❌ Se superaron los reintentos para {termino}. Saltando...")
                        terminos_pendientes.pop(0)
                        intentos_actuales = 0
                    else:
                        print("  🔄 Posible bloqueo invisible, reiniciando...")
                    break
                    
                time.sleep(2)"""
    content = re.sub(old_fail, new_fail, content, flags=re.DOTALL)
    
    # Replace outer except
    old_outer_except = r"    except Exception as e:\n        print\(f\"Error general en .*?: \{e\}\"\)\n    finally:\n        if driver:\n            driver\.quit\(\)"
    new_outer_except = r"""    except Exception as e:
        print(f"Error general: {e}")
        time.sleep(5)
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass"""
    content = re.sub(old_outer_except, new_outer_except, content, flags=re.DOTALL)
    
    with open(f, "w", encoding="utf-8") as file:
        file.write(content)
        
    print(f"Arreglado {f}")
