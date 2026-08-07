"""
ml_predict.py
Fase 1: Motor de detección de ofertas basado en reglas combinadas.
Genera oferta_score.json con el score de oferta (0-100) por producto.

Definición acordada de oferta real (score >= 60):
  Señal 1 (50%): precio actual >= 10% bajo el promedio de 30 días
  Señal 2 (35%): precio actual >= 15% más barato que la competencia
  Señal 3 (15%): tendencia bajista >= 3 días consecutivos
"""
import json
import os
from ml_features import calcular_features, calcular_precio_promedio_competencia

UMBRAL_OFERTA = 60  # Score mínimo para mostrar badge 🔥

def calcular_score(f):
    """
    Calcula el score de oferta (0-100) para un producto basado en las 3 señales.
    """
    score = 0
    razones = []
    dias_historial = f.get("dias_historial", 0)

    # ── Señal 1 (peso 50): precio >= 10% bajo su promedio 30 días ──────────────
    pct_prom = f.get("pct_vs_promedio", 0)  # negativo = más barato
    if dias_historial >= 7:
        # Tenemos suficiente historial para esta señal
        if pct_prom <= -10:
            señal1 = 50  # cumple al 100% el criterio
        elif pct_prom <= -5:
            señal1 = 25  # cumple a medias
        else:
            señal1 = 0
        
        if señal1 > 0:
            razones.append(f"{abs(pct_prom):.1f}% bajo su precio habitual")
    else:
        señal1 = 0  # No hay suficiente historial

    # ── Señal 2 (peso 35): precio >= 15% más barato que competencia ────────────
    pct_comp = f.get("pct_vs_competencia", 0)  # negativo = más barato que otros
    if pct_comp <= -15:
        señal2 = 35
        razones.append(f"{abs(pct_comp):.1f}% más barato que otras tiendas")
    elif pct_comp <= -8:
        señal2 = 18  # Algo más barato pero no llega al umbral ideal
    else:
        señal2 = 0

    # ── Señal 3 (peso 15): tendencia bajista >= 3 días ─────────────────────────
    dias_bajando = f.get("dias_bajando", 0)
    if dias_bajando >= 3:
        señal3 = 15
        razones.append(f"bajando {dias_bajando} días seguidos")
    elif dias_bajando >= 2:
        señal3 = 7
    else:
        señal3 = 0

    score = señal1 + señal2 + señal3

    # Bono extra: si está en mínimo histórico de 30 días
    if dias_historial >= 7:
        pct_min = f.get("pct_vs_maximo", 0)
        if f["precio_hoy"] <= f["precio_min_30d"] * 1.01:  # está en mínimo histórico
            score = min(100, score + 10)
            razones.append("en su precio mínimo del mes")

    return round(score), razones


def generar_oferta_score():
    """
    Lee features de SQLite, calcula scores y genera oferta_score.json
    """
    print("Calculando features...")
    features = calcular_features()
    
    if not features:
        print("No hay datos para analizar.")
        return
    
    features = calcular_precio_promedio_competencia(features)
    
    resultados = []
    ofertas_detectadas = 0
    
    for f in features:
        score, razones = calcular_score(f)
        es_oferta = score >= UMBRAL_OFERTA
        
        if es_oferta:
            ofertas_detectadas += 1
        
        # Calcular descuento visible (el mayor descuento encontrado)
        descuento_prom = abs(f.get("pct_vs_promedio", 0)) if f.get("pct_vs_promedio", 0) < 0 else 0
        descuento_comp = abs(f.get("pct_vs_competencia", 0)) if f.get("pct_vs_competencia", 0) < 0 else 0
        descuento_visible = max(descuento_prom, descuento_comp)
        
        resultados.append({
            "producto_id": f["producto_id"],
            "score": score,
            "es_oferta": es_oferta,
            "descuento_pct": round(descuento_visible, 1),
            "razones": razones,
            "precio_hoy": f["precio_hoy"],
            "precio_promedio_30d": f["precio_promedio_30d"],
        })
    
    # Guardar JSON
    output = {
        "generado": __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M"),
        "total_analizados": len(resultados),
        "total_ofertas": ofertas_detectadas,
        "scores": {r["producto_id"]: r for r in resultados}
    }
    
    with open("oferta_score.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"oferta_score.json generado: {ofertas_detectadas} ofertas detectadas de {len(resultados)} productos analizados.")
    return output


if __name__ == "__main__":
    generar_oferta_score()
