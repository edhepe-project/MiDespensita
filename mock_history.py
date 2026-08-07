import db_manager
import sqlite3
import random
from datetime import datetime, timedelta

def generate_mock_data():
    db_manager.init_db()
    conn = sqlite3.connect(db_manager.DB_FILE)
    cursor = conn.cursor()
    
    # 5 Fake products
    productos = [
        ("fake_1", "Walmart", "Aceite Nutrioli 946ml", "https://via.placeholder.com/150", ""),
        ("fake_2", "Bodega", "Frijol Pinto Verde Valle 900g", "https://via.placeholder.com/150", ""),
        ("fake_3", "Soriana", "Arroz Extra Soriana 900g", "https://via.placeholder.com/150", ""),
        ("fake_4", "Chedraui", "Leche Lala Entera 1L", "https://via.placeholder.com/150", ""),
        ("fake_5", "La Comer", "Pan Bimbo Blanco Grande", "https://via.placeholder.com/150", "")
    ]
    
    for p in productos:
        cursor.execute("INSERT OR REPLACE INTO productos (id, tienda, nombre, imagen, url) VALUES (?, ?, ?, ?, ?)", p)
        
        base_price = random.uniform(30.0, 50.0)
        
        # 30 days of data
        for i in range(30, -1, -1):
            fecha = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            # fluctuate price slightly
            base_price = base_price + random.uniform(-1.5, 1.5)
            cursor.execute("INSERT OR REPLACE INTO historial_precios (producto_id, fecha, precio) VALUES (?, ?, ?)",
                           (p[0], fecha, round(base_price, 2)))
                           
    conn.commit()
    conn.close()
    
    db_manager.exportar_tendencias_json()

if __name__ == "__main__":
    generate_mock_data()
