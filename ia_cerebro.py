"""
ia_cerebro.py
El cerebro de IA de MiDespensita.
Lee todos los datos scrapeados del día, los analiza con Gemini y genera
ia_insights.json con:
  - Top 10 ofertas del día con explicación en lenguaje natural
  - Mejor tienda de la semana y por qué
  - Alertas de productos que están subiendo de precio
  - Consejo del día personalizado
  - Análisis por categoría
"""
import json
import os
import datetime
import sqlite3
import sys
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
import db_manager

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SALIDA = "ia_insights.json"
HOY = datetime.datetime.now().strftime("%Y-%m-%d")
HORA = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

# ── Archivos de ofertas por tienda ──────────────────────────────────────────
JSONS_TIENDAS = [
    "ofertas_walmart.json",
    "ofertas_bodega.json",
    "ofertas_soriana.json",
    "ofertas_lacomer.json",
    "ofertas_sams.json",
    "ofertas_chedraui.json",
    "ofertas_farmagdl.json",
    "ofertas_fahorro.json",
]

def cargar_datos():
    """Carga todos los JSONs de tiendas y el score de ofertas."""
    catalogo = []
    for archivo in JSONS_TIENDAS:
        if Path(archivo).exists():
            with open(archivo, encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    catalogo.extend(data)
                except:
                    pass

    scores = {}
    if Path("oferta_score.json").exists():
        with open("oferta_score.json", encoding="utf-8") as f:
            try:
                sc = json.load(f)
                scores = sc.get("scores", {})
            except:
                pass

    return catalogo, scores

def resumir_catalogo(catalogo, scores):
    """
    Construye un resumen compacto del catálogo para enviar a Gemini sin exceder tokens.
    Prioriza productos con score alto (ofertas detectadas por ML).
    """
    productos_con_score = []
    for p in catalogo:
        pid = str(p.get("producto", {}).get("id", ""))
        nombre = p.get("producto", {}).get("nombre", "")
        precio = p.get("precio", 0)
        tienda = p.get("tienda", "")
        sc = scores.get(pid, {})
        score = sc.get("score", 0)
        pct_vs_promedio = sc.get("precio_promedio_30d", 0)
        descuento = sc.get("descuento_pct", 0)
        razones = sc.get("razones", [])

        productos_con_score.append({
            "nombre": nombre,
            "precio": precio,
            "tienda": tienda,
            "score_oferta": score,
            "descuento_pct": descuento,
            "razones": razones,
        })

    # Ordenar por score descendente y tomar los top 80 (suficientes para análisis rico)
    productos_con_score.sort(key=lambda x: x["score_oferta"], reverse=True)
    top = productos_con_score[:80]

    # Resumen por tienda (total de productos)
    resumen_tiendas = {}
    for p in catalogo:
        t = p.get("tienda", "Desconocida")
        resumen_tiendas[t] = resumen_tiendas.get(t, 0) + 1

    return top, resumen_tiendas

def construir_prompt(top_productos, resumen_tiendas):
    """Construye el prompt para Gemini con los datos del día."""
    productos_txt = json.dumps(top_productos, ensure_ascii=False, indent=2)
    tiendas_txt = json.dumps(resumen_tiendas, ensure_ascii=False)

    prompt = f"""
Eres el cerebro analítico de MiDespensita, una app mexicana que ayuda a las familias 
a ahorrar dinero en el supermercado comparando precios entre tiendas.

HOY ES: {HOY}
TIENDAS ANALIZADAS HOY: {tiendas_txt}

A continuación tienes los productos con sus precios, tiendas y scores de oferta (0-100):
- score_oferta >= 60: oferta real detectada 🔥
- descuento_pct: porcentaje de descuento vs su promedio histórico o competencia
- razones: por qué el algoritmo lo marcó como oferta

DATOS DEL DÍA:
{productos_txt}

Con base en estos datos, genera un análisis completo en formato JSON con exactamente esta estructura:

{{
  "fecha": "{HOY}",
  "generado": "{HORA}",
  "consejo_del_dia": "Un consejo práctico y específico de 2-3 oraciones para ahorrar esta semana, basado en los datos.",
  "top_ofertas": [
    {{
      "posicion": 1,
      "nombre": "Nombre del producto",
      "tienda": "Nombre de la tienda",
      "precio": 00.00,
      "descuento_pct": 00.0,
      "explicacion": "Por qué es una buena compra HOY, en lenguaje natural y amigable (máx 25 palabras)"
    }}
  ],
  "mejor_tienda_semana": {{
    "tienda": "Nombre de la tienda",
    "razon": "Explicación de 1-2 oraciones de por qué esta tienda conviene más esta semana"
  }},
  "alertas_subida_precio": [
    {{
      "producto": "Nombre",
      "tienda": "Tienda",
      "advertencia": "Explicación breve del alza detectada"
    }}
  ],
  "analisis_por_categoria": [
    {{
      "categoria": "Nombre de categoría (ej: Lácteos, Carnes, Higiene)",
      "resumen": "Dónde están los mejores precios en esa categoría esta semana"
    }}
  ],
  "momento_para_comprar": {{
    "productos_comprar_hoy": ["producto1", "producto2"],
    "productos_esperar": ["producto3"],
    "razon": "Explicación estratégica breve"
  }}
}}

REGLAS IMPORTANTES:
- top_ofertas: incluye exactamente los 10 mejores, ordenados de mejor a peor oferta
- alertas_subida_precio: máximo 5 productos con señales claras de precio elevado vs su promedio
- analisis_por_categoria: mínimo 4 categorías relevantes presentes en los datos
- Todo debe estar en español mexicano, tono amigable y práctico
- Responde ÚNICAMENTE con el JSON, sin texto adicional antes o después
"""
    return prompt

def llamar_gemini(prompt):
    """Llama a la API de Gemini y regresa el texto de respuesta."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "tu_api_key_aqui":
        raise ValueError("Configura tu GEMINI_API_KEY en el archivo .env")

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.4,     # Poco creativo, más fáctico
            max_output_tokens=4096,
        )
    )
    return response.text

def guardar_insights(texto_json):
    """Parsea la respuesta JSON de Gemini y la guarda en ia_insights.json."""
    # Limpiar posibles backticks de markdown que Gemini a veces añade
    texto_limpio = texto_json.strip()
    if texto_limpio.startswith("```"):
        lineas = texto_limpio.split("\n")
        texto_limpio = "\n".join(lineas[1:-1])

    data = json.loads(texto_limpio)

    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ ia_insights.json generado con:")
    print(f"   📌 {len(data.get('top_ofertas', []))} ofertas top")
    print(f"   🏪 Mejor tienda: {data.get('mejor_tienda_semana', {}).get('tienda', 'N/A')}")
    print(f"   ⚠️  {len(data.get('alertas_subida_precio', []))} alertas de subida")
    return data

def run():
    sys.stdout.reconfigure(encoding='utf-8')
    print("🧠 Iniciando cerebro de IA (Gemini)...")

    if not GEMINI_API_KEY or GEMINI_API_KEY == "tu_api_key_aqui":
        print("⚠️  GEMINI_API_KEY no configurada en .env — saltando análisis de IA.")
        return

    catalogo, scores = cargar_datos()
    if not catalogo:
        print("⚠️  No hay datos de catálogo para analizar.")
        return

    print(f"   Cargados {len(catalogo)} productos de {len(set(p.get('tienda') for p in catalogo))} tiendas.")

    top_productos, resumen_tiendas = resumir_catalogo(catalogo, scores)
    print(f"   Enviando top {len(top_productos)} productos a Gemini para análisis...")

    prompt = construir_prompt(top_productos, resumen_tiendas)

    try:
        respuesta = llamar_gemini(prompt)
        guardar_insights(respuesta)
        print(f"   Guardado en {SALIDA}")
    except json.JSONDecodeError as e:
        print(f"❌ Error al parsear respuesta de Gemini: {e}")
        # Guardar la respuesta raw para diagnóstico
        with open("ia_insights_raw.txt", "w", encoding="utf-8") as f:
            f.write(respuesta if 'respuesta' in dir() else "Sin respuesta")
    except Exception as e:
        print(f"❌ Error llamando a Gemini: {e}")

if __name__ == "__main__":
    run()
