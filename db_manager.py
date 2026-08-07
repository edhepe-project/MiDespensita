import sqlite3
import json
import os
from datetime import datetime, timedelta

# ==========================================
# LISTA MAESTRA DE BÚSQUEDAS (TODAS LAS TIENDAS)
# ==========================================
BUSQUEDAS = [
    # Abarrotes Básico
    "arroz", "frijol", "aceite", "azucar", "cereal", "galletas",
    "atun", "pasta", "cafe", "pan", "mayonesa", "salsa", "sal",
    "tortillas", "sardina", "chorizo", "chile", "vinagre", "ketchup",
    "miel", "mermelada", "lentejas", "garbanzo", "consome",
    
    # Lácteos y Huevos
    "leche", "huevo", "queso", "crema", "yogurt", "mantequilla", 
    "leche evaporada", "leche condensada",
    
    # Carnes y Frío
    "jamon", "salchicha", "tocino", "pollo", "carne molida",
    
    # Frutas y Verduras (Básicos)
    "tomate", "cebolla", "ajo", "papa", "limon", "manzana", "platano",
    
    # Higiene personal
    "shampoo", "jabon", "pasta dental", "desodorante", "pañales",
    "papel higienico", "toallas femeninas", "crema corporal",
    
    # Limpieza hogar
    "detergente", "cloro", "suavizante", "jabon lavatrastes", 
    "limpiador pisos", "bolsas basura", "servilletas",
    
    # Bebidas
    "refresco", "agua", "cerveza", "vino", "tequila", "whisky", "licor",
    "jugo",
    
    # Mascotas
    "alimento perro", "alimento gato"
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

if __name__ == "__main__":
    init_db()
    exportar_tendencias_json()
