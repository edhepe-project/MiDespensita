"""
ml_parser_unidades.py
Extrae la cantidad y unidad de medida del nombre de un producto para
poder comparar precios de forma justa (por ejemplo, precio por 100g, precio por pieza).
"""
import re

# Definición de unidades base y sus multiplicadores para llegar a la base
# Base Peso = 100g
# Base Volumen = 100ml
# Base Unidades = 1 pieza
UNIDADES = {
    # Peso (Base: 100g)
    'kg': {'tipo': 'peso', 'factor': 10},     # 1 kg = 10 * 100g
    'kilo': {'tipo': 'peso', 'factor': 10},
    'kilos': {'tipo': 'peso', 'factor': 10},
    'g': {'tipo': 'peso', 'factor': 0.01},    # 1 g = 0.01 * 100g
    'gr': {'tipo': 'peso', 'factor': 0.01},
    'grs': {'tipo': 'peso', 'factor': 0.01},
    'gramos': {'tipo': 'peso', 'factor': 0.01},
    
    # Volumen (Base: 100ml)
    'l': {'tipo': 'volumen', 'factor': 10},   # 1 L = 10 * 100ml
    'lt': {'tipo': 'volumen', 'factor': 10},
    'litro': {'tipo': 'volumen', 'factor': 10},
    'litros': {'tipo': 'volumen', 'factor': 10},
    'ml': {'tipo': 'volumen', 'factor': 0.01}, # 1 ml = 0.01 * 100ml
    'mls': {'tipo': 'volumen', 'factor': 0.01},
    'mililitros': {'tipo': 'volumen', 'factor': 0.01},
    
    # Piezas (Base: 1 pieza)
    'pz': {'tipo': 'pieza', 'factor': 1},
    'pza': {'tipo': 'pieza', 'factor': 1},
    'pzas': {'tipo': 'pieza', 'factor': 1},
    'pieza': {'tipo': 'pieza', 'factor': 1},
    'piezas': {'tipo': 'pieza', 'factor': 1},
    'paquete': {'tipo': 'pieza', 'factor': 1},
    'sobre': {'tipo': 'pieza', 'factor': 1},
    'lata': {'tipo': 'pieza', 'factor': 1},
    'rollo': {'tipo': 'pieza', 'factor': 1},
    'rollos': {'tipo': 'pieza', 'factor': 1},
}

# Regex para atrapar cosas como "1kg", "500 g", "1.5 lts", "30 pzas", "3x200g" (multiplicadores)
# Captura grupo 1: multiplicador (opcional), ej: "3 x "
# Captura grupo 2: cantidad (número decimal o entero)
# Captura grupo 3: unidad
REGEX_UNIDAD = re.compile(
    r'(?:(\d+)\s*(?:x|paquetes de|cajas de)\s*)?(\d+(?:\.\d+)?)\s*([a-zA-Z]+)', 
    re.IGNORECASE
)

def extraer_unidad(nombre_producto):
    """
    Toma el nombre de un producto y devuelve un diccionario con:
    - cantidad_total: (ej. 1.5, 500, 30)
    - unidad_original: (ej. 'kg', 'g', 'pzas')
    - tipo: ('peso', 'volumen', 'pieza', 'desconocido')
    - factor_conversion: (multiplicador para llevarlo a la unidad base)
    """
    # Limpiar nombre para facilitar el regex
    nombre = nombre_producto.lower().strip()
    
    # Buscar todas las coincidencias
    matches = REGEX_UNIDAD.finditer(nombre)
    
    # Tomar la última coincidencia, suele ser la presentación al final del nombre
    # ej: "Jabon Zest Aqua 5 pzas 150g" -> queremos los 150g * 5 o al menos los 150g
    # En casos complejos como "5 pzas 150g" es mejor tomar todo. 
    # Por ahora tomamos la más relevante buscando en las unidades conocidas.
    
    mejor_match = None
    mejor_info = None
    
    for match in matches:
        mult_str = match.group(1)
        cant_str = match.group(2)
        unidad_str = match.group(3)
        
        if unidad_str in UNIDADES:
            multiplicador = float(mult_str) if mult_str else 1.0
            cantidad = float(cant_str)
            cantidad_total = multiplicador * cantidad
            info = UNIDADES[unidad_str]
            
            # Preferir peso o volumen sobre piezas si hay ambigüedad
            if not mejor_info or (mejor_info['tipo'] == 'pieza' and info['tipo'] != 'pieza'):
                mejor_match = {
                    'cantidad_total': cantidad_total,
                    'unidad_original': unidad_str,
                    'tipo': info['tipo'],
                    'factor_conversion': info['factor']
                }
                mejor_info = info
                
    if mejor_match:
        return mejor_match
        
    # Default si no encuentra nada: asumimos 1 pieza
    return {
        'cantidad_total': 1.0,
        'unidad_original': 'pz',
        'tipo': 'pieza',
        'factor_conversion': 1.0
    }

def normalizar_precio(precio, extraccion):
    """
    Dado un precio y el resultado de extraer_unidad, 
    devuelve el precio por la unidad base (100g, 100ml o 1 pz).
    """
    if not extraccion or extraccion['cantidad_total'] <= 0:
        return precio # Fallback
        
    # Precio total / (Cantidad * Factor de Conversión a Base)
    # Ejemplo: 22 MXN / (1 kg * 10) = 2.2 MXN por 100g
    # Ejemplo: 40 MXN / (2 kg * 10) = 2.0 MXN por 100g
    unidades_base = extraccion['cantidad_total'] * extraccion['factor_conversion']
    precio_base = precio / unidades_base
    return precio_base

if __name__ == "__main__":
    # Tests rápidos
    test_cases = [
        ("Azúcar Zulka Blanca 1 kg", 22.00),
        ("Azúcar Zulka Morena 2 kg", 40.00),
        ("Azúcar Sta. Rosa 3 kg", 55.00),
        ("Leche Lala Entera 1L", 28.00),
        ("Leche Lala 1.5 l", 40.00),
        ("Aceite Nutrioli 946ml", 45.00),
        ("Huevo San Juan 30 pzas", 90.00),
        ("Galletas Marias 3x170g", 45.00), # 3 paquetes de 170g
        ("Pan Bimbo Blanco", 45.00), # Sin unidad
    ]
    
    print(f"{'Producto':<30} | {'Precio':<8} | {'Tipo':<8} | {'Cant Total':<10} | {'Precio Base':<15}")
    print("-" * 80)
    for nombre, precio in test_cases:
        ext = extraer_unidad(nombre)
        precio_base = normalizar_precio(precio, ext)
        base_label = "100g" if ext['tipo'] == 'peso' else "100ml" if ext['tipo'] == 'volumen' else "1 pz"
        
        print(f"{nombre[:30]:<30} | ${precio:<7.2f} | {ext['tipo']:<8} | {ext['cantidad_total']:<5.1f} {ext['unidad_original']:<4} | ${precio_base:.2f} / {base_label}")
