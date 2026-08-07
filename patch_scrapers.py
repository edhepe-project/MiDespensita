import re

for file, store in [('scraper_chedraui.py', 'Chedraui'), ('scraper_soriana.py', 'Soriana'), ('scraper_lacomer.py', 'La Comer')]:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'import db_manager' not in content:
        content = content.replace('import json\n', 'import json\nimport db_manager\n', 1)
        
        # Replace the success print with print + db_manager call
        content = re.sub(
            r'(print\(f"¡Éxito! \{len\(ofertas_unicas\)\} ofertas guardadas en ofertas_[^\.]+\.json"\))',
            r'\1\n        db_manager.registrar_ofertas("' + store + '", ofertas_unicas)',
            content
        )
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Patched {file}')
