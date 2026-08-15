import os

files = ["scraper_bodega.py", "scraper_walmart.py", "scraper_sams.py"]

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        lines = file.readlines()
        
    in_inner_while = False
    new_lines = []
    
    for line in lines:
        # Detect where the inner while loop starts
        if "while terminos_pendientes:" in line and "intentos_actuales =" not in line:
            in_inner_while = True
            new_lines.append(line)
            continue
            
        # Detect where the outer exception block starts
        if "except Exception as e:" in line and "Error general en" in line:
            in_inner_while = False
            
        if in_inner_while and line.strip() != "":
            # Indent if the line has exactly 12 spaces of leading whitespace (meaning it was part of the original try block)
            # Or if it has 16 spaces but was not one of the lines we explicitly added.
            # Actually, to make it perfectly robust:
            # Let's count leading spaces.
            leading_spaces = len(line) - len(line.lstrip())
            
            # The lines we added are `termino = ...` and `print(...)` which have exactly 16 spaces.
            # We don't want to indent those. We want to indent everything else by 4 spaces.
            # Wait, `url = ...` currently has 12 spaces.
            # `if "blocked"` currently has 12 spaces.
            # `soup = BeautifulSoup...` has 12 spaces.
            # So lines with 12 spaces become 16. Lines with 16 spaces become 20, etc.
            # Basically, if it's not one of our newly added lines, just add 4 spaces.
            if "termino = terminos_pendientes[0]" not in line and "Buscando en" not in line and "Buscando:" not in line:
                new_lines.append("    " + line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
            
    with open(f, "w", encoding="utf-8") as file:
        file.writelines(new_lines)
    print(f"Arreglado {f}")
