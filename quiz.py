"""
quiz.py — Interfaz de consola original para THE TIKI TAKA.
Permite jugar directamente en la terminal conservando la experiencia original
y utilizando las funciones seguras de persistencia de quiz_engine.
"""

import datetime
import json
import pathlib
import random
import sys

# Asegurar codificación UTF-8 en terminales Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from quiz_engine import cargar_preguntas, cargar_records, guardar_record, obtener_ranking

carpeta = pathlib.Path(__file__).parent
archivo_preguntas = carpeta / "preguntas.json"
archivo_records = carpeta / "records.json"


def jugar_consola():
    preguntas = cargar_preguntas(archivo_preguntas)
    if not preguntas:
        print("No se encontró el archivo preguntas.json o no contiene preguntas válidas.")
        print("Fijate que esté en la misma carpeta que quiz.py")
        return

    puntos = 0
    respuestas = []

    print("===== Bienvenido a THE TIKI TAKA =====")
    nombre = input("Escribí tu nombre: ").strip()
    if nombre == "":
        nombre = "Anónimo"

    random.shuffle(preguntas)

    for p in preguntas:
        print()
        print(p["pregunta"])

        opciones = list(p["opciones"])
        random.shuffle(opciones)

        for numero, opcion in enumerate(opciones, start=1):
            print(f"  {numero}) {opcion}")

        eleccion = input("Tu respuesta (número): ")

        if eleccion.isdigit() and 1 <= int(eleccion) <= len(opciones):
            elegida = opciones[int(eleccion) - 1]
        else:
            elegida = "Respuesta inválida"

        acerto = elegida == p["respuesta"]

        if acerto:
            print("¡Correcto! ✅")
            puntos += 1
        else:
            print(f"Incorrecto ❌ La respuesta era: {p['respuesta']}")

        respuestas.append({
            "pregunta": p["pregunta"],
            "respondio": elegida,
            "correcta": p["respuesta"],
            "acerto": acerto
        })

    print()
    print(f"Terminaste, {nombre}. Puntaje final: {puntos} de {len(preguntas)}")

    guardar_record(
        nombre=nombre,
        puntos=puntos,
        total=len(preguntas),
        respuestas=respuestas,
        ruta=archivo_records
    )

    ranking = obtener_ranking(archivo_records, limite=5)

    print()
    print("===== 🏆 RANKING TOP 5 =====")
    for posicion, r in enumerate(ranking[:5], start=1):
        print(f"{posicion}. {r['nombre']:<12} {r['puntos']} de {r['total']}   {r['fecha']}")

    print()
    try:
        input("Presioná Enter para salir...")
    except EOFError:
        pass


if __name__ == "__main__":
    jugar_consola()
