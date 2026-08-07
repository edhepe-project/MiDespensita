"""
ml_features.py
Calcula las features (características) para el modelo de ML de ofertas.
Lee de SQLite y devuelve un DataFrame listo para entrenar o predecir.
"""
import sqlite3
import json
from datetime import datetime, timedelta
import db_manager
from ml_parser_unidades import extraer_unidad, normalizar_precio

def calcular_features():
    """
    Devuelve una lista de dicts con features por producto para hoy.
    Cada dict representa un producto con todas las señales calculadas.
    """
    conn = sqlite3.connect(db_manager.DB_FILE)
    cursor = conn.cursor()
    
    hoy = datetime.now().strftime("%Y-%m-%d")
    hace_30 = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Obtener todos los productos con precio hoy
    cursor.execute("""
        SELECT p.id, p.nombre, p.tienda, p.imagen, p.url,
               h.precio as precio_hoy
        FROM productos p
        JOIN historial_precios h ON h.producto_id = p.id
        WHERE h.fecha = ?
    """, (hoy,))
    
    productos_hoy = cursor.fetchall()
    
    features_list = []
    
    for prod in productos_hoy:
        prod_id, nombre, tienda, imagen, url, precio_hoy = prod
        
        # Extraer info de unidad y calcular precio por unidad de hoy
        info_unidad = extraer_unidad(nombre)
        precio_unidad_hoy = normalizar_precio(precio_hoy, info_unidad)
        
        # Historial de los últimos 30 días
        cursor.execute("""
            SELECT fecha, precio FROM historial_precios
            WHERE producto_id = ? AND fecha >= ? AND fecha <= ?
            ORDER BY fecha ASC
        """, (prod_id, hace_30, hoy))
        historial = cursor.fetchall()
        
        # Calcular los precios históricos normalizados por unidad
        precios_hist_unidades = [normalizar_precio(h[1], info_unidad) for h in historial]
        dias_historial = len(precios_hist_unidades)
        
        # === FEATURES BÁSICAS ===
        precio_promedio_30d = sum(precios_hist_unidades) / len(precios_hist_unidades) if precios_hist_unidades else precio_unidad_hoy
        precio_min_30d = min(precios_hist_unidades) if precios_hist_unidades else precio_unidad_hoy
        precio_max_30d = max(precios_hist_unidades) if precios_hist_unidades else precio_unidad_hoy
        
        # Porcentaje vs promedio (negativo = más barato que el promedio)
        pct_vs_promedio = ((precio_unidad_hoy / precio_promedio_30d) - 1) * 100 if precio_promedio_30d > 0 else 0
        # Porcentaje vs máximo (negativo = descuento vs precio pico)
        pct_vs_maximo = ((precio_unidad_hoy / precio_max_30d) - 1) * 100 if precio_max_30d > 0 else 0
        
        # Tendencia: ¿cuántos días seguidos ha bajado el precio?
        dias_bajando = 0
        precios_recientes = precios_hist_unidades[-7:] if len(precios_hist_unidades) >= 7 else precios_hist_unidades
        for i in range(len(precios_recientes) - 1, 0, -1):
            if precios_recientes[i] < precios_recientes[i-1]:
                dias_bajando += 1
            else:
                break
        
        # Día y semana del mes
        hoy_dt = datetime.now()
        dia_semana = hoy_dt.weekday()       # 0=Lunes, 6=Domingo
        semana_mes = (hoy_dt.day - 1) // 7 + 1  # 1,2,3,4
        
        # Volatilidad (desviación estándar relativa)
        if len(precios_hist_unidades) > 1:
            mean = precio_promedio_30d
            variance = sum((p - mean) ** 2 for p in precios_hist_unidades) / len(precios_hist_unidades)
            volatilidad = (variance ** 0.5 / mean * 100) if mean > 0 else 0
        else:
            volatilidad = 0
        
        features_list.append({
            "producto_id": prod_id,
            "nombre": nombre,
            "tienda": tienda,
            "imagen": imagen,
            "url": url,
            "precio_hoy": precio_hoy,
            "precio_unidad_hoy": round(precio_unidad_hoy, 2),
            "cantidad_str": f"{info_unidad['cantidad_total']} {info_unidad['unidad_original']}",
            "tipo_unidad": info_unidad['tipo'],
            "precio_promedio_30d": round(precio_promedio_30d, 2),
            "precio_min_30d": round(precio_min_30d, 2),
            "precio_max_30d": round(precio_max_30d, 2),
            "pct_vs_promedio": round(pct_vs_promedio, 2),
            "pct_vs_maximo": round(pct_vs_maximo, 2),
            "dias_bajando": dias_bajando,
            "dias_historial": dias_historial,
            "dia_semana": dia_semana,
            "semana_mes": semana_mes,
            "volatilidad": round(volatilidad, 2),
        })
    
    conn.close()
    return features_list


def calcular_precio_promedio_competencia(features_list):
    """
    Calcula el precio promedio de cada producto entre todas las tiendas (misma semana).
    Agrupa por nombre de producto (búsqueda fuzzy simple: primeras 3 palabras).
    """
        # Agrupar productos similares por nombre (primeras 3 palabras) Y por el mismo TIPO DE UNIDAD (peso con peso, volumen con volumen)
    grupos = {}
    for f in features_list:
        clave = (" ".join(f["nombre"].lower().split()[:3]), f["tipo_unidad"])
        if clave not in grupos:
            grupos[clave] = []
        grupos[clave].append(f)
    
    # Para cada producto, calcular precio promedio de la competencia
    for f in features_list:
        clave = (" ".join(f["nombre"].lower().split()[:3]), f["tipo_unidad"])
        grupo = grupos[clave]
        otros_precios = [g["precio_unidad_hoy"] for g in grupo if g["tienda"] != f["tienda"]]
        
        if otros_precios:
            promedio_competencia = sum(otros_precios) / len(otros_precios)
            pct_vs_competencia = ((f["precio_unidad_hoy"] / promedio_competencia) - 1) * 100
        else:
            promedio_competencia = f["precio_unidad_hoy"]
            pct_vs_competencia = 0
        
        f["precio_promedio_competencia"] = round(promedio_competencia, 2)
        f["pct_vs_competencia"] = round(pct_vs_competencia, 2)
    
    return features_list


if __name__ == "__main__":
    features = calcular_features()
    features = calcular_precio_promedio_competencia(features)
    print(f"Features calculadas para {len(features)} productos.")
    if features:
        sample = features[0]
        print(f"\nEjemplo - {sample['nombre']} ({sample['tienda']}):")
        for k, v in sample.items():
            if k not in ("imagen", "url"):
                print(f"  {k}: {v}")
