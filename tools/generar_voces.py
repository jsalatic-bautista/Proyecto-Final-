"""
tools/generar_voces.py — Generador de locuciones de relator en español argentino
utilizando edge-tts (voz neuronal es-AR-TomasNeural).
Genera los archivos .mp3 en static/audio/relator/ para permitir funcionamiento 100% offline.
"""

import asyncio
import os
import pathlib
import sys

# Asegurar directorios de salida
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "static" / "audio" / "relator"
CUSTOM_DIR = BASE_DIR / "static" / "audio" / "mis_voces"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CUSTOM_DIR.mkdir(parents=True, exist_ok=True)

VOICE = "es-AR-TomasNeural"

# Catálogo completo de frases de relator apasionado
FRASES = {
    # Intro
    "intro_gol.mp3": {
        "texto": "¡GOOOOOOOOOOL! ¡GOL, GOL, GOOOL! ¡Golazo histórico de The Tiki Taka!",
        "rate": "+12%",
        "pitch": "+12Hz"
    },
    # Aciertos (8 variantes)
    "acierto_1.mp3": {"texto": "¡Golazo!", "rate": "+15%", "pitch": "+10Hz"},
    "acierto_2.mp3": {"texto": "¡Adentro, señores!", "rate": "+15%", "pitch": "+10Hz"},
    "acierto_3.mp3": {"texto": "¡Qué definición!", "rate": "+15%", "pitch": "+10Hz"},
    "acierto_4.mp3": {"texto": "¡La clavó en el ángulo!", "rate": "+15%", "pitch": "+10Hz"},
    "acierto_5.mp3": {"texto": "¡Es un crack!", "rate": "+15%", "pitch": "+10Hz"},
    "acierto_6.mp3": {"texto": "¡Pelota al fondo de la red!", "rate": "+15%", "pitch": "+10Hz"},
    "acierto_7.mp3": {"texto": "¡Qué bombazo fenomenal!", "rate": "+15%", "pitch": "+10Hz"},
    "acierto_8.mp3": {"texto": "¡Magia pura en la cancha!", "rate": "+15%", "pitch": "+10Hz"},

    # Errores (8 variantes)
    "error_1.mp3": {"texto": "¡Afuera!", "rate": "+12%", "pitch": "+6Hz"},
    "error_2.mp3": {"texto": "¡La tiró a la tribuna!", "rate": "+12%", "pitch": "+6Hz"},
    "error_3.mp3": {"texto": "¡Uy, por poco!", "rate": "+12%", "pitch": "+6Hz"},
    "error_4.mp3": {"texto": "¡Qué se pierde!", "rate": "+12%", "pitch": "+6Hz"},
    "error_5.mp3": {"texto": "¡Desviado, le pegó con la de palo!", "rate": "+12%", "pitch": "+6Hz"},
    "error_6.mp3": {"texto": "¡Se agarran la cabeza en el banco!", "rate": "+12%", "pitch": "+6Hz"},
    "error_7.mp3": {"texto": "¡Pasó rozando el palo!", "rate": "+12%", "pitch": "+6Hz"},
    "error_8.mp3": {"texto": "¡Avisale al arquero que la pelota ya se fue!", "rate": "+12%", "pitch": "+6Hz"},

    # Racha de 3 o más aciertos
    "racha_1.mp3": {"texto": "¡Está imparable!", "rate": "+15%", "pitch": "+10Hz"},
    "racha_2.mp3": {"texto": "¡Toque, toque, toque... tiki taka!", "rate": "+15%", "pitch": "+10Hz"},
    "racha_3.mp3": {"texto": "¡Fútbol champagne, señoras y señores!", "rate": "+15%", "pitch": "+10Hz"},

    # Fin de partida y Récords
    "fin_partida.mp3": {"texto": "¡Terminó el partido! ¡Gran demostración de fútbol!", "rate": "+10%", "pitch": "+6Hz"},
    "nuevo_record.mp3": {"texto": "¡Nuevo récord histórico en el Salón de la Fama! ¡Monumental!", "rate": "+14%", "pitch": "+10Hz"},

    # Modo Camino al Mundial
    "campeon_mundo.mp3": {"texto": "¡Argentina campeón del mundo! ¡Somos campeones otra vez!", "rate": "+15%", "pitch": "+12Hz"},

    # Modo Penales 1 vs 1
    "penal_atajado.mp3": {"texto": "¡Atajó el arquero! ¡Héroe bajo los tres palos!", "rate": "+14%", "pitch": "+10Hz"},
    "penal_gol.mp3": {"texto": "¡Goooool de penal! ¡Bien pateado, fuerte y al medio!", "rate": "+14%", "pitch": "+10Hz"},

    # Tiempo Agotado
    "tiempo_agotado.mp3": {"texto": "¡Sonó el silbato! ¡Se durmió en los laureles!", "rate": "+12%", "pitch": "+6Hz"}
}


async def generar_audio(nombre_archivo, info):
    import edge_tts

    destino = OUTPUT_DIR / nombre_archivo
    texto = info["texto"]
    rate = info.get("rate", "+15%")
    pitch = info.get("pitch", "+10Hz")

    print(f"-> Generando: {nombre_archivo} ('{texto[:35]}...')...", end=" ", flush=True)
    try:
        comm = edge_tts.Communicate(texto, VOICE, rate=rate, pitch=pitch)
        await comm.save(str(destino))
        print("OK!")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False


async def main():
    print("=" * 65)
    print("THE TIKI TAKA — Generador de Voces de Relator Argentino")
    print(f"Voz: {VOICE} | Carpeta de salida: {OUTPUT_DIR}")
    print("=" * 65)

    try:
        import edge_tts
    except ImportError:
        print("Error: edge-tts no está instalado. Ejecute: pip install edge-tts")
        sys.exit(1)

    exitos = 0
    total = len(FRASES)

    for nombre, info in FRASES.items():
        ok = await generar_audio(nombre, info)
        if ok:
            exitos += 1

    print("=" * 65)
    print(f"Generación finalizada: {exitos}/{total} archivos creados correctamente.")
    print("Los audios quedan listos para funcionar offline.")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(main())
