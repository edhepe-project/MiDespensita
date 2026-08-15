import sqlite3
import json
import os
from datetime import datetime, timedelta

def get_chrome_major_version():
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\BLBeacon")
        version, _ = winreg.QueryValueEx(key, "version")
        return int(version.split('.')[0])
    except:
        return 151 # Default to 151 if fails

# ==========================================
# LISTA MAESTRA DE BÚSQUEDAS (TODAS LAS TIENDAS)
# Estructura: categoría + productos específicos
# Para agregar productos: edita solo este archivo.
# ==========================================
BUSQUEDAS = [
    # ── 1. ABARROTES, CEREALES Y CONSERVAS ──
    "abarrotes",
    # Granos y cereales
    "avena", "arroz", "frijol", "lentejas", "garbanzo", "pasta", "espagueti",
    # Enlatados
    "atun", "sardinas", "elote", "chicharo", "champinones", "pure de tomate",
    "frijoles refritos",
    # Frutas en almíbar / lácteos dulces
    "pina en almibar", "duraznos en almibar", "mermelada",
    "leche condensada", "leche evaporada",
    # Harinas y repostería
    "harina de trigo", "harina de maiz", "azucar", "sal", "polvo para hornear",
    "levadura",
    # Despensa básica
    "aceite", "vinagre", "cafe", "chocolate en polvo", "te", "consome",
    "especias", "pimienta", "mayonesa", "salsa", "ketchup", "miel",

    # ── 2. ALIMENTOS FRESCOS Y REFRIGERADOS ──
    "carnes",
    # Carnes y proteínas
    "pollo", "carne de res", "carne de cerdo", "pescado", "huevo",
    # Embutidos
    "jamon", "salchicha", "tocino",
    # Lácteos
    "leche", "queso", "yogurt", "mantequilla", "crema",
    # Frutas y verduras
    "jitomate", "cebolla", "papa", "zanahoria", "ajo", "limon",
    "platano", "manzana", "verduras",
    # Panadería
    "pan de caja", "tortillas", "galletas", "pan dulce",
    # Bebidas
    "agua purificada", "jugo", "refresco",
    # Congelados
    "verduras congeladas", "comida congelada",

    # ── 3. CUIDADO PERSONAL E HIGIENE ──
    "cuidado personal",
    # Baño y ducha
    "jabon", "shampoo", "acondicionador", "crema corporal", "esponjas",
    # Higiene oral
    "pasta dental", "cepillo dental", "hilo dental", "enjuague bucal",
    # Afeitado
    "rastrillo", "espuma de afeitar", "desodorante",
    # Higiene íntima
    "toallas femeninas", "tampones",
    # Skincare
    "crema facial", "protector solar",

    # ── 4. LIMPIEZA DEL HOGAR Y LAVANDERÍA ──
    "limpieza hogar",
    # Ropa
    "detergente", "suavizante", "cloro",
    # Cocina
    "jabon lavatrastes", "desengrasante", "fibras tallar",
    # Superficies
    "limpiador pisos", "desinfectante", "limpiador vidrios",
    # Utensilios
    "bolsas basura", "guantes de hule", "panos microfibra",

    # ── 5. PAPELERÍA Y DESECHABLES ──
    # Baño
    "papel higienico", "panuelos desechables",
    # Cocina
    "servilletas", "papel aluminio", "bolsas ziploc",

    # ── 6. BEBÉS ──
    "bebes",
    "panales", "toallitas humedas", "crema rozaduras",
    "formula lactea", "papillas", "cereal infantil",

    # ── 7. MASCOTAS ──
    "mascotas",
    "alimento perro", "alimento gato", "croquetas", "arena para gato",
    "antipulgas",

    # ── 8. SALUD Y BOTIQUÍN ──
    "botiquin",
    "paracetamol", "ibuprofeno", "alcohol en gel", "gasas", "vendas",
    # Mantenimiento
    "pilas", "focos",

    # ── BEBIDAS ADULTOS ──
    "cerveza", "vino", "tequila", "whisky",
]


DB_FILE = "historial.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Tabla de productos (datos maestros)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS productos (
        id TEXT PRIMARY KEY,
        tienda TEXT,
        nombre TEXT,
        imagen TEXT,
        url TEXT
    )
    ''')
    
    # Tabla de historial de precios
    # Se guarda el producto_id, la fecha y el precio
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS historial_precios (
        producto_id TEXT,
        fecha DATE,
        precio REAL,
        PRIMARY KEY (producto_id, fecha),
        FOREIGN KEY (producto_id) REFERENCES productos (id)
    )
    ''')
    
    conn.commit()
    conn.close()

def limpiar_historico(dias_retencion=30):
    """Elimina registros más antiguos a dias_retencion."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    fecha_limite = (datetime.now() - timedelta(days=dias_retencion)).strftime("%Y-%m-%d")
    
    cursor.execute('DELETE FROM historial_precios WHERE fecha < ?', (fecha_limite,))
    eliminados = cursor.rowcount
    
    conn.commit()
    conn.close()
    
    if eliminados > 0:
        print(f"Limpieza DB: {eliminados} registros antiguos eliminados (>{dias_retencion} días).")

def registrar_ofertas(tienda, ofertas):
    """Registra una lista de ofertas en la base de datos."""
    if not ofertas:
        return
        
    init_db()
    limpiar_historico(30) # Asegurar limpieza de 30 días
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    hoy = datetime.now().strftime("%Y-%m-%d")
    
    nuevos_precios = 0
    
    for o in ofertas:
        prod_id = o["producto"]["id"]
        nombre = o["producto"]["nombre"]
        precio = float(o["precio"])
        imagen = o.get("imagen", "")
        url = o.get("url", "")
        
        # 1. Insertar o actualizar producto
        cursor.execute('''
        INSERT OR REPLACE INTO productos (id, tienda, nombre, imagen, url)
        VALUES (?, ?, ?, ?, ?)
        ''', (prod_id, tienda, nombre, imagen, url))
        
        # 2. Insertar o reemplazar precio del día
        cursor.execute('''
        INSERT OR REPLACE INTO historial_precios (producto_id, fecha, precio)
        VALUES (?, ?, ?)
        ''', (prod_id, hoy, precio))
        
        nuevos_precios += 1
        
    conn.commit()
    conn.close()
    print(f"DB [{tienda}]: {nuevos_precios} precios registrados para {hoy}.")

def exportar_tendencias_json():
    """Genera tendencias.json agrupando el historial de precios por producto."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Obtener todos los productos
    cursor.execute('SELECT id, tienda, nombre, imagen, url FROM productos')
    productos = cursor.fetchall()
    
    tendencias = []
    
    for prod in productos:
        prod_id, tienda, nombre, imagen, url = prod
        
        # Obtener historial de precios ordenado por fecha
        cursor.execute('SELECT fecha, precio FROM historial_precios WHERE producto_id = ? ORDER BY fecha ASC', (prod_id,))
        historial_rows = cursor.fetchall()
        
        if len(historial_rows) > 0:
            historial = [{"fecha": row[0], "precio": row[1]} for row in historial_rows]
            
            tendencias.append({
                "id": prod_id,
                "tienda": tienda,
                "nombre": nombre,
                "imagen": imagen,
                "url": url,
                "historial": historial,
                "precio_actual": historial[-1]["precio"] # El más reciente
            })
            
    conn.close()
    
    with open("tendencias.json", "w", encoding="utf-8") as f:
        json.dump(tendencias, f, ensure_ascii=False, indent=2)
        
    print(f"DB Export: tendencias.json generado exitosamente con {len(tendencias)} productos históricos.")


def git_push_datos(nombre_scraper="scraper"):
    """
    Hace git add, commit y push de todos los archivos de datos.
    Llamar al final de cada scraper para subir datos a GitHub automaticamente.
    """
    import subprocess
    import sys
    from datetime import datetime
    
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M")
    try:
        subprocess.run(["git", "add", "."], check=True, capture_output=True)
        result = subprocess.run(
            ["git", "commit", "-m", f"update: {nombre_scraper} {fecha}"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            subprocess.run(["git", "push"], check=True, capture_output=True)
            print(f"[Git] Datos subidos a GitHub correctamente.")
        else:
            # Sin cambios que commitear — no es error
            print(f"[Git] Sin cambios nuevos que subir.")
    except Exception as e:
        print(f"[Git] Error al subir: {e}")

if __name__ == "__main__":
    init_db()
    exportar_tendencias_json()
