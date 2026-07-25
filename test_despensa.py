#!/usr/bin/env python3
"""
Test completo de funcionalidad - DespensaApp
Verifica que todos los componentes estén correctamente implementados.
"""

import os
import json
import re
from pathlib import Path

# Colores para output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

passed = 0
failed = 0
warnings = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  {GREEN}✓{RESET} {name}")
        passed += 1
    else:
        print(f"  {RED}✗{RESET} {name}")
        if detail:
            print(f"    {detail}")
        failed += 1

def warn(name, detail=""):
    global warnings
    print(f"  {YELLOW}⚠{RESET} {name}")
    if detail:
        print(f"    {detail}")
    warnings += 1

BASE_DIR = Path("D:/msc")

print("\n" + "="*60)
print("  TEST COMPLETO - DESPENSAAPP")
print("="*60)

# ============================================
# 1. ESTRUCTURA DE ARCHIVOS
# ============================================
print("\n[1] Estructura de archivos")

required_files = [
    "index.html",
    "manifest.json",
    "sw.js",
    "css/styles.css",
    "js/app.js",
    "js/db.js",
    "js/utils/constants.js",
    "js/utils/format.js",
    "js/components/home.js",
    "js/components/lista.js",
    "js/components/producto.js",
    "js/components/historial.js",
    "js/components/gastos.js",
    "js/components/stats.js",
    "js/components/comparar.js",
    "js/components/maestra.js",
    "js/components/config.js",
    "icons/icon.svg",
    "despensa_familiar_completa.xlsx"
]

for f in required_files:
    test(f"Existe {f}", (BASE_DIR / f).exists())

# ============================================
# 2. HTML - ESTRUCTURA VÁLIDA
# ============================================
print("\n[2] HTML - Estructura válida")

html_content = (BASE_DIR / "index.html").read_text(encoding="utf-8")

test("Tiene DOCTYPE html", "<!DOCTYPE html>" in html_content)
test("Idioma español", 'lang="es"' in html_content)
test("Meta charset UTF-8", 'charset="UTF-8"' in html_content)
test("Meta viewport responsive", 'viewport' in html_content)
test("Tiene theme-color", 'theme-color' in html_content)
test("Link manifest.json", 'manifest.json' in html_content)
test("Link CSS styles", 'css/styles.css' in html_content)
test("Tiene header app-header", 'class="app-header"' in html_content)
test("Tiene main app-content", 'id="app-content"' in html_content)
test("Tiene nav app-nav", 'class="app-nav"' in html_content)
test("Script Dexie.js", 'dexie' in html_content)
test("Script app.js", 'js/app.js' in html_content)
test("Script db.js", 'js/db.js' in html_content)
test("Script constants.js", 'constants.js' in html_content)
test("Script format.js", 'format.js' in html_content)
test("Script home.js", 'home.js' in html_content)
test("Script lista.js", 'lista.js' in html_content)
test("Script producto.js", 'producto.js' in html_content)
test("Script historial.js", 'historial.js' in html_content)
test("Script gastos.js", 'gastos.js' in html_content)
test("Script stats.js", 'stats.js' in html_content)
test("Script comparar.js", 'comparar.js' in html_content)
test("Script maestra.js", 'maestra.js' in html_content)
test("Script config.js", 'config.js' in html_content)

# Verificar navegación
nav_items = ['home', 'lista', 'maestra', 'comparar', 'historial']
for item in nav_items:
    test(f"Nav tiene {item}", f'data-page="{item}"' in html_content)

# ============================================
# 3. MANIFEST.JSON - PWA VÁLIDO
# ============================================
print("\n[3] Manifest.json - PWA válido")

manifest = json.loads((BASE_DIR / "manifest.json").read_text(encoding="utf-8"))

test("Tiene nombre", "name" in manifest and len(manifest["name"]) > 0)
test("Tiene short_name", "short_name" in manifest and len(manifest["short_name"]) > 0)
test("Tiene description", "description" in manifest and len(manifest["description"]) > 0)
test("Tiene start_url", "start_url" in manifest)
test("Display standalone", manifest.get("display") == "standalone")
test("Tiene theme_color", "theme_color" in manifest)
test("Tiene icons", "icons" in manifest and len(manifest["icons"]) > 0)
test("Icono SVG válido", any(i.get("type") == "image/svg+xml" for i in manifest.get("icons", [])))

# ============================================
# 4. SERVICE WORKER
# ============================================
print("\n[4] Service Worker")

sw_content = (BASE_DIR / "sw.js").read_text(encoding="utf-8")

test("Tiene CACHE_NAME", "CACHE_NAME" in sw_content)
test("Lista ASSETS", "ASSETS" in sw_content)
test("addEventListener install", "install" in sw_content)
test("addEventListener activate", "activate" in sw_content)
test("addEventListener fetch", "fetch" in sw_content)
test("Usa caches.open", "caches.open" in sw_content)
test("Usa self.skipWaiting", "skipWaiting" in sw_content)
test("Usa self.clients.claim", "clients.claim" in sw_content)

# Verificar que todos los archivos JS están en cache
js_files_in_sw = re.findall(r"'/js/[^']+'", sw_content)
test(f"Cache incluye {len(js_files_in_sw)} archivos JS", len(js_files_in_sw) >= 12)

# ============================================
# 5. CSS - ESTILOS COMPLETOS
# ============================================
print("\n[5] CSS - Estilos completos")

css_content = (BASE_DIR / "css/styles.css").read_text(encoding="utf-8")

test("Variables CSS :root", ":root" in css_content)
test("Color primario --primary", "--primary" in css_content)
test("Color fondo --bg", "--bg" in css_content)
test("Color superficie --surface", "--surface" in css_content)
test("Estilo body", "body {" in css_content)
test("Estilo app-header", ".app-header" in css_content)
test("Estilo app-main", ".app-main" in css_content)
test("Estilo app-nav", ".app-nav" in css_content)
test("Estilo nav-item", ".nav-item" in css_content)
test("Estilo card", ".card" in css_content)
test("Estilo btn", ".btn" in css_content)
test("Estilo btn-primary", ".btn-primary" in css_content)
test("Estilo form-input", ".form-input" in css_content)
test("Estilo product-item", ".product-item" in css_content)
test("Estilo stat-card", ".stat-card" in css_content)
test("Estilo history-item", ".history-item" in css_content)
test("Estilo modal-overlay", ".modal-overlay" in css_content)
test("Estilo fab", ".fab" in css_content)
test("Estilo sugerencias-list", ".sugerencias-list" in css_content)
test("Estilo comparar-card", ".comparar-card" in css_content)
test("Estilo maestra-item", ".maestra-item" in css_content)
test("Estilo resultado-item", ".resultado-item" in css_content)

# ============================================
# 6. JAVASCRIPT - SINTAXIS VÁLIDA
# ============================================
print("\n[6] JavaScript - Sintaxis válida")

js_files = [
    "js/app.js",
    "js/db.js",
    "js/utils/constants.js",
    "js/utils/format.js",
    "js/components/home.js",
    "js/components/lista.js",
    "js/components/producto.js",
    "js/components/historial.js",
    "js/components/gastos.js",
    "js/components/stats.js",
    "js/components/comparar.js",
    "js/components/maestra.js",
    "js/components/config.js"
]

for js_file in js_files:
    try:
        content = (BASE_DIR / js_file).read_text(encoding="utf-8")
        # Verificar que no tiene errores de sintaxis básicos
        # Contar llaves abiertas y cerradas
        opens = content.count('{')
        closes = content.count('}')
        test(f"{js_file} - llaves balanceadas", opens == closes, f"Abiertas: {opens}, Cerradas: {closes}")
    except Exception as e:
        test(f"{js_file} - legible", False, str(e))

# ============================================
# 7. DB.JS - BASE DE DATOS
# ============================================
print("\n[7] DB.js - Base de datos")

db_content = (BASE_DIR / "js/db.js").read_text(encoding="utf-8")

test("Crea Dexie", "new Dexie" in db_content)
test("Tabla productos", "productos" in db_content)
test("Tabla listas", "listas" in db_content)
test("Tabla items_lista", "items_lista" in db_content)
test("Tabla compras", "compras" in db_content)
test("Tabla detalle_compra", "detalle_compra" in db_content)
test("Tabla precios", "precios" in db_content)
test("Función addProducto", "addProducto" in db_content)
test("Función addLista", "createLista" in db_content)
test("Función addItem", "addItem" in db_content)
test("Función addCompra", "addCompra" in db_content)
test("Función addPrecio", "addPrecio" in db_content)
test("Función getPreciosComparativa", "getPreciosComparativa" in db_content)
test("Exporta APP_DB", "window.APP_DB" in db_content)

# ============================================
# 8. CONSTANTS.JS - LISTA MAESTRA
# ============================================
print("\n[8] Constants.js - Lista maestra")

constants_content = (BASE_DIR / "js/utils/constants.js").read_text(encoding="utf-8")

test("Define APP_CATEGORIAS", "window.APP_CATEGORIAS" in constants_content)
test("Define APP_UNIDADES", "window.APP_UNIDADES" in constants_content)
test("Define APP_LISTA_BASE", "window.APP_LISTA_BASE" in constants_content)

# Contar productos por categoría
categorias = ["abarrotes", "lacteos", "frutas_verduras", "carnes", "limpieza", "higiene"]
for cat in categorias:
    count = constants_content.count(f'categoria: "{cat}"')
    test(f"Categoría {cat} tiene productos", count > 0, f"Encontrados: {count}")

total_productos = constants_content.count('categoria:')
test(f"Total productos ≥ 60", total_productos >= 60, f"Encontrados: {total_productos}")

# ============================================
# 9. FORMAT.JS - UTILIDADES
# ============================================
print("\n[9] Format.js - Utilidades")

format_content = (BASE_DIR / "js/utils/format.js").read_text(encoding="utf-8")

test("Define APP_Format", "window.APP_Format" in format_content)
test("Función money", "money" in format_content)
test("Función date", "date" in format_content)
test("Función shortDate", "shortDate" in format_content)
test("Función monthName", "monthName" in format_content)
test("Función monthYear", "monthYear" in format_content)
test("Formato MXN", "MXN" in format_content)

# ============================================
# 10. COMPONENTES - FUNCIONALIDADES
# ============================================
print("\n[10] Componentes - Funcionalidades")

components = {
    "home.js": ["APP_Pages.home"],
    "lista.js": ["APP_Pages.lista"],
    "producto.js": ["APP_Pages.producto"],
    "historial.js": ["APP_Pages.historial"],
    "gastos.js": ["APP_Pages.registrarCompra"],
    "stats.js": ["APP_Pages.stats"],
    "comparar.js": ["APP_Pages.comparar"],
    "maestra.js": ["APP_Pages.maestra"],
    "config.js": ["APP_Pages.config"]
}

for comp_file, funcs in components.items():
    try:
        content = (BASE_DIR / f"js/components/{comp_file}").read_text(encoding="utf-8")
        for func in funcs:
            test(f"{comp_file} - {func}", func in content)
    except Exception as e:
        test(f"{comp_file} - legible", False, str(e))

# ============================================
# 11. APP.JS - ROUTER
# ============================================
print("\n[11] App.js - Router")

app_content = (BASE_DIR / "js/app.js").read_text(encoding="utf-8")

test("Define APP_Pages", "window.APP_Pages" in app_content)
test("Función getPage", "getPage" in app_content)
test("Función navigate", "navigate" in app_content)
test("Event hashchange", "hashchange" in app_content)
test("Event DOMContentLoaded", "DOMContentLoaded" in app_content)
test("Registra Service Worker", "serviceWorker" in app_content)
test("Registra sw.js", "sw.js" in app_content)

# ============================================
# 12. ICONO SVG
# ============================================
print("\n[12] Icono SVG")

svg_content = (BASE_DIR / "icons/icon.svg").read_text(encoding="utf-8")

test("Es SVG válido", "<svg" in svg_content)
test("Tiene xmlns", "xmlns" in svg_content)
test("Tiene viewBox", "viewBox" in svg_content)
test("Tiene fondo verde", "#2E7D32" in svg_content)

# ============================================
# 13. INTEGRACIÓN - FLUJO COMPLETO
# ============================================
print("\n[13] Integración - Flujo completo")

# Verificar que la lista maestra se puede cargar
test("Config.js usa APP_LISTA_BASE", "APP_LISTA_BASE" in (BASE_DIR / "js/components/config.js").read_text(encoding="utf-8"))

# Verificar que home.js usa registrarCompra
test("Home usa registrarCompra", "registrarCompra" in (BASE_DIR / "js/components/home.js").read_text(encoding="utf-8"))

# Verificar que gastos.js guarda precios
gastos_content = (BASE_DIR / "js/components/gastos.js").read_text(encoding="utf-8")
test("Gastos guarda precios", "addPrecio" in gastos_content)

# Verificar que comparar.js usa getPreciosComparativa
comparar_content = (BASE_DIR / "js/components/comparar.js").read_text(encoding="utf-8")
test("Comparar usa getPreciosComparativa", "getPreciosComparativa" in comparar_content)

# Verificar que maestra.js usa MercadoLibre
maestra_content = (BASE_DIR / "js/components/maestra.js").read_text(encoding="utf-8")
test("Maestra usa MercadoLibre", "mercadolibre" in maestra_content.lower())
test("Maestra busca precios", "buscarPrecioOnline" in maestra_content)

# ============================================
# 14. ARCHIVO EXCEL
# ============================================
print("\n[14] Archivo Excel fuente")

xlsx_path = BASE_DIR / "despensa_familiar_completa.xlsx"
test("Existe archivo Excel", xlsx_path.exists())
if xlsx_path.exists():
    test("Tamaño razonable", 1000 < xlsx_path.stat().st_size < 1000000,
         f"Tamaño: {xlsx_path.stat().st_size} bytes")

# ============================================
# RESUMEN
# ============================================
print("\n" + "="*60)
print(f"  RESUMEN DE TESTS")
print("="*60)
print(f"  {GREEN}✓ Pasaron: {passed}{RESET}")
print(f"  {RED}✗ Fallaron: {failed}{RESET}")
print(f"  {YELLOW}⚠ Advertencias: {warnings}{RESET}")
print(f"  Total: {passed + failed + warnings}")
print("="*60)

if failed == 0:
    print(f"\n  {GREEN}¡TODOS LOS TESTS PASARON!{RESET}\n")
else:
    print(f"\n  {RED}Hay {failed} tests que fallaron. Revisar arriba.{RESET}\n")

exit(0 if failed == 0 else 1)
