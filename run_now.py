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
        "scraper_sams.py",
        "scraper_farmagdl.py"
    ]
    for s in scripts:
        print(f"Ejecutando {s}...")
        subprocess.run([sys.executable, s])
        
    print("Exportando tendencias...")
    db_manager.exportar_tendencias_json()
    print("Actualización de datos completa.")
    
    print("\nIniciando subida automática a GitHub (Git Push)...")
    try:
        import datetime
        fecha = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        subprocess.run(["git", "add", "."], check=True)
        # En caso de que no haya cambios, git commit devolverá un error (exit code 1), lo ignoramos
        subprocess.run(["git", "commit", "-m", f"update: precios automáticos {fecha}"], check=False)
        subprocess.run(["git", "push"], check=True)
        print("¡Subida automática exitosa! Los precios ya están en la nube.")
    except Exception as e:
        print(f"Error al subir a Git: {e}")

if __name__ == "__main__":
    run_all()
