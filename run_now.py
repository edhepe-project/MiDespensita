import subprocess
import sys
import db_manager

def run_all():
    scripts = [
        "scraper_chedraui.py", 
        "scraper_walmart.py",
        "scraper_bodega.py",
        "scraper_soriana.py",
        "scraper_lacomer.py",
        "scraper_sams.py"
    ]
    for s in scripts:
        print(f"Ejecutando {s}...")
        subprocess.run([sys.executable, s])
        
    print("Exportando tendencias...")
    db_manager.exportar_tendencias_json()
    print("Actualización completa.")

if __name__ == "__main__":
    run_all()
