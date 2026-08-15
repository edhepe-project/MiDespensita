import json
import os

def fix_json(file_name, tienda_nombre):
    if not os.path.exists(file_name): return
    with open(file_name, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixed = []
    for i, o in enumerate(data):
        url = o.get('url', '')
        if not url:
            termino = o.get('termino_busqueda', '')
            if 'Bodega' in tienda_nombre:
                url = f"https://www.bodegaaurrera.com.mx/search?q={termino}"
            elif 'Walmart' in tienda_nombre:
                url = f"https://www.walmart.com.mx/search?q={termino}"
            elif 'Sams' in tienda_nombre:
                url = f"https://www.sams.com.mx/search?q={termino}"

        if isinstance(o.get('producto'), str):
            fixed.append({
                'tienda': tienda_nombre,
                'producto': {
                    'id': f"{tienda_nombre.split()[0].lower()}_{o.get('termino_busqueda','')}_{i}",
                    'nombre': o['producto']
                },
                'precio': o['precio'],
                'imagen': o['imagen'],
                'url': url,
                'termino_busqueda': o.get('termino_busqueda', '')
            })
        else:
            o['url'] = url
            fixed.append(o)
            
    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(fixed, f, ensure_ascii=False, indent=2)

fix_json('ofertas_bodega.json', 'Bodega Aurrerá')
fix_json('ofertas_walmart.json', 'Walmart')
fix_json('ofertas_sams.json', 'Sams')
print("JSONs arreglados.")
