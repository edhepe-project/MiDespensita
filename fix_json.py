import json

# Corregir nombre de tienda en ofertas_bodega.json
data = json.load(open('ofertas_bodega.json', encoding='utf-8'))
for o in data:
    if o.get('tienda') == 'bodega':
        o['tienda'] = 'Bodega Aurrerá'
json.dump(data, open('ofertas_bodega.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f"Listo. {len(data)} productos actualizados con nombre correcto de tienda.")
