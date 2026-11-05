"""
app.py — Servidor web Flask para THE TIKI TAKA Gaming Edition.
Gestiona las rutas API, validación de sesiones, seguridad y entrega de la interfaz.
"""

import os
import pathlib
import sys
from datetime import datetime, timedelta
from flask import Flask, jsonify, render_template, request, send_from_directory

from quiz_engine import (
    SesionJuego,
    cargar_preguntas,
    cargar_records,
    obtener_estadisticas_generales,
    obtener_ranking,
    obtener_palabra_del_dia,
    evaluar_intento_tikidle,
    validar_palabra_tikidle,
)

# Soporte para ejecución en desarrollo y empaquetado PyInstaller
if getattr(sys, "frozen", False):
    BUNDLE_DIR = pathlib.Path(getattr(sys, "_MEIPASS", os.path.dirname(sys.executable)))
    TEMPLATE_DIR = BUNDLE_DIR / "templates"
    STATIC_DIR = BUNDLE_DIR / "static"
else:
    BASE_DIR = pathlib.Path(__file__).parent
    TEMPLATE_DIR = BASE_DIR / "templates"
    STATIC_DIR = BASE_DIR / "static"

app = Flask(
    __name__,
    template_folder=str(TEMPLATE_DIR),
    static_folder=str(STATIC_DIR)
)
app.config["SECRET_KEY"] = os.urandom(24)

# Almacén en memoria de partidas activas
# { session_id: SesionJuego }
partidas_activas = {}


def limpiar_sesiones_inactivas():
    """Elimina sesiones con más de 2 horas de antigüedad para liberar memoria."""
    ahora = datetime.now()
    limite = ahora - timedelta(hours=2)
    ids_a_eliminar = [
        sid for sid, s in partidas_activas.items()
        if s.creado_en < limite
    ]
    for sid in ids_a_eliminar:
        partidas_activas.pop(sid, None)


@app.after_request
def agregar_cabeceras_seguridad(response):
    """Agrega cabeceras para prevenir caching en endpoints de API y mejorar seguridad."""
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


# --- RUTAS PRINCIPALES Y PWA ---

@app.route("/")
def index():
    """Página principal de THE TIKI TAKA Gaming Edition."""
    return render_template("index.html")


@app.route("/sw.js")
def service_worker():
    """Sirve el Service Worker con el scope raíz /."""
    response = send_from_directory(str(STATIC_DIR), "sw.js")
    response.headers["Content-Type"] = "application/javascript"
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response


@app.route("/manifest.json")
def manifest():
    """Sirve el manifest.json de la PWA."""
    response = send_from_directory(str(STATIC_DIR), "manifest.json")
    response.headers["Content-Type"] = "application/manifest+json"
    return response


@app.route("/favicon.ico")
def favicon():
    """Favicon de la aplicación."""
    return send_from_directory(str(STATIC_DIR), "favicon.ico")


# --- RUTAS DE API ---

@app.route("/api/info", methods=["GET"])
def api_info():
    """Devuelve estadísticas generales para la pantalla de inicio."""
    stats = obtener_estadisticas_generales()
    return jsonify({
        "success": True,
        "estadisticas": stats
    })


@app.route("/api/game/start", methods=["POST"])
def api_game_start():
    """
    Inicia una nueva partida validando parámetros.
    No expone respuestas correctas al cliente.
    """
    limpiar_sesiones_inactivas()

    data = request.get_json(silent=True) or {}
    nombre = str(data.get("nombre", "")).strip()
    if not nombre:
        nombre = "Anónimo"

    # Sanitizar longitud del apodo
    nombre = nombre[:20]

    preguntas_disponibles = cargar_preguntas()
    total_disponibles = len(preguntas_disponibles)
    if total_disponibles == 0:
        return jsonify({
            "success": False,
            "error": "No hay preguntas cargadas en preguntas.json."
        }), 400

    # Cantidad de preguntas
    try:
        cantidad = int(data.get("cantidad", total_disponibles))
    except (ValueError, TypeError):
        cantidad = total_disponibles
    cantidad = max(1, min(cantidad, total_disponibles))

    # Temporizador
    con_tiempo = bool(data.get("con_tiempo", False))
    try:
        segundos = int(data.get("segundos", 15))
    except (ValueError, TypeError):
        segundos = 15
    segundos = max(5, min(segundos, 60))

    # Modos y filtros avanzados (Etapa 4)
    modo = str(data.get("modo", "quick"))
    fase_mundial = data.get("fase_mundial")
    categoria = data.get("categoria")
    dificultad = data.get("dificultad")

    try:
        sesion = SesionJuego(
            nombre=nombre,
            cantidad_preguntas=cantidad,
            con_tiempo=con_tiempo,
            segundos_por_pregunta=segundos,
            modo=modo,
            categoria=categoria,
            dificultad=dificultad,
            fase_mundial=fase_mundial
        )
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Error al inicializar la partida: {str(e)}"
        }), 500

    partidas_activas[sesion.id_sesion] = sesion

    primera_pregunta = sesion.obtener_pregunta_actual_publica()

    return jsonify({
        "success": True,
        "session_id": sesion.id_sesion,
        "nombre": sesion.nombre,
        "total_preguntas": sesion.total_preguntas,
        "con_tiempo": sesion.con_tiempo,
        "segundos": sesion.segundos_por_pregunta,
        "pregunta": primera_pregunta,
        "modo": sesion.modo,
        "fase_mundial": sesion.fase_mundial
    })


@app.route("/api/game/powerup", methods=["POST"])
def api_game_powerup():
    """
    Aplica un comodín táctico durante la partida (50/50, VAR, tiempo extra o hinchada).
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    tipo_comodin = data.get("comodin")

    if not session_id or session_id not in partidas_activas:
        return jsonify({
            "success": False,
            "error": "Sesión de juego no encontrada o expirada."
        }), 404

    sesion = partidas_activas[session_id]
    resultado = sesion.usar_comodin(tipo_comodin)

    if "error" in resultado:
        return jsonify({
            "success": False,
            "error": resultado["error"]
        }), 400

    return jsonify({
        "success": True,
        "resultado": resultado
    })


@app.route("/api/game/answer", methods=["POST"])
def api_game_answer():
    """
    Comprueba la respuesta de la pregunta actual del lado del servidor.
    Evita respuestas duplicadas o respuestas arbitrarias.
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")

    if not session_id or session_id not in partidas_activas:
        return jsonify({
            "success": False,
            "error": "Sesión de juego no encontrada o expirada."
        }), 404

    sesion = partidas_activas[session_id]

    opcion_elegida = data.get("opcion")
    try:
        tiempo_empleado = float(data.get("tiempo_empleado", 0))
    except (ValueError, TypeError):
        tiempo_empleado = 0.0

    resultado = sesion.registrar_respuesta(opcion_elegida, tiempo_empleado)
    if "error" in resultado:
        return jsonify({
            "success": False,
            "error": resultado["error"]
        }), 400

    return jsonify({
        "success": True,
        "resultado": resultado
    })


@app.route("/api/game/next", methods=["POST"])
def api_game_next():
    """
    Avanza a la siguiente pregunta de la partida.
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")

    if not session_id or session_id not in partidas_activas:
        return jsonify({
            "success": False,
            "error": "Sesión de juego no encontrada o expirada."
        }), 404

    sesion = partidas_activas[session_id]
    avance = sesion.avanzar_siguiente_pregunta()

    if "error" in avance:
        return jsonify({
            "success": False,
            "error": avance["error"]
        }), 400

    return jsonify({
        "success": True,
        "avance": avance
    })


@app.route("/api/game/finish", methods=["POST"])
def api_game_finish():
    """
    Finaliza la partida y guarda el récord en records.json de forma segura.
    Es idempotente: si se invoca varias veces, no duplica el guardado.
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")

    if not session_id or session_id not in partidas_activas:
        return jsonify({
            "success": False,
            "error": "Sesión de juego no encontrada o expirada."
        }), 404

    sesion = partidas_activas[session_id]
    resumen = sesion.finalizar_y_guardar()

    return jsonify({
        "success": True,
        "resumen": resumen
    })


@app.route("/api/records", methods=["GET"])
def api_records():
    """
    Retorna la lista de récords ordenada.
    """
    try:
        limite = int(request.args.get("limite", 50))
    except (ValueError, TypeError):
        limite = 50

    ranking = obtener_ranking(limite=limite)
    return jsonify({
        "success": True,
        "records": ranking
    })


# --- ENDPOINTS MINIJUEGO TIKIDLE (WORDLE DE FÚTBOL) ---

@app.route("/api/tikidle/today", methods=["GET"])
def api_tikidle_today():
    """Retorna información del desafío Tikidle de hoy sin revelar la palabra secreta."""
    info = obtener_palabra_del_dia()
    return jsonify({
        "success": True,
        "dia_numero": info["dia_numero"],
        "fecha": info["fecha"],
        "longitud": 5,
        "max_intentos": 6
    })


@app.route("/api/tikidle/check", methods=["POST"])
def api_tikidle_check():
    """
    Valida un intento de palabra de 5 letras y devuelve el coloreo según reglas de Wordle.
    Revela la palabra y su definición futbolera únicamente si se acierta o se agotan los 6 intentos.
    """
    data = request.get_json(silent=True) or {}
    guess = data.get("guess", "").strip().upper()
    try:
        attempt = int(data.get("attempt", 1))
    except (ValueError, TypeError):
        attempt = 1

    valido, razon = validar_palabra_tikidle(guess)
    if not valido:
        return jsonify({
            "success": False,
            "error": razon
        }), 400

    info = obtener_palabra_del_dia()
    secret = info["palabra"]
    evaluation = evaluar_intento_tikidle(guess, secret)

    won = (guess == secret)
    lost = (not won and attempt >= 6)

    res = {
        "success": True,
        "guess": guess,
        "evaluation": evaluation,
        "won": won,
        "lost": lost,
        "attempt": attempt
    }

    if won or lost:
        res["palabra"] = secret
        res["definicion"] = info["definicion"]

    return jsonify(res)


@app.errorhandler(404)
def recurso_no_encontrado(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": "Recurso no encontrado"}), 404
    return render_template("index.html"), 404


@app.errorhandler(500)
def error_interno(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": "Error interno del servidor"}), 500
    return "Error interno del servidor", 500


if __name__ == "__main__":
    # Escuchar en localhost puerto 5000
    print("Iniciando THE TIKI TAKA Gaming Edition en http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=False)
