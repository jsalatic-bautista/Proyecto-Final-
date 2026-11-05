"""
desktop_app.py — Aplicación de escritorio nativa para Windows usando pywebview.
Inicia el servidor Flask en segundo plano y muestra la ventana de escritorio con el ícono de THE TIKI TAKA.
"""

import os
import socket
import sys
import threading
import time
import urllib.request
import webview

# Asegurar rutas correctas tanto en desarrollo como empaquetado con PyInstaller
if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(sys.executable)
    BUNDLE_DIR = getattr(sys, "_MEIPASS", BASE_DIR)
else:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    BUNDLE_DIR = BASE_DIR

# Agregar BUNDLE_DIR al sys.path para importar app y quiz_engine
if BUNDLE_DIR not in sys.path:
    sys.path.insert(0, BUNDLE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
from quiz_engine import inicializar_records_appdata, obtener_directorio_appdata


def encontrar_puerto_libre(puerto_inicial=5000):
    """Encuentra un puerto libre comenzando por el 5000."""
    puerto = puerto_inicial
    while puerto < 65000:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", puerto)) != 0:
                return puerto
            puerto += 1
    return 5000


def iniciar_servidor(puerto):
    """Ejecuta el servidor Flask en un hilo independiente."""
    # Desactivar logs ruidosos de werkzeug en consola
    import logging
    log = logging.getLogger("werkzeug")
    log.setLevel(logging.ERROR)
    app.run(host="127.0.0.1", port=puerto, debug=False, use_reloader=False)


def esperar_servidor(url, timeout=10):
    """Espera a que el servidor Flask esté respondiendo."""
    inicio = time.time()
    while time.time() - inicio < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.15)
    return False


def main():
    # Asegurar directorio de datos de usuario en %APPDATA%\TheTikiTaka
    try:
        inicializar_records_appdata()
    except Exception:
        pass

    puerto = encontrar_puerto_libre(5000)
    url = f"http://127.0.0.1:{puerto}"

    # Iniciar hilo del servidor Flask
    hilo = threading.Thread(target=iniciar_servidor, args=(puerto,), daemon=True)
    hilo.start()

    # Esperar que levante
    esperar_servidor(url)

    # Determinar ruta del ícono
    posibles_iconos = [
        os.path.join(BUNDLE_DIR, "icono.ico"),
        os.path.join(BUNDLE_DIR, "static", "img", "icono.ico"),
        os.path.join(BUNDLE_DIR, "static", "icons", "icon.ico"),
        os.path.join(BASE_DIR, "icono.ico"),
        os.path.join(BASE_DIR, "static", "icons", "icon.ico"),
    ]
    ruta_icono = next((p for p in posibles_iconos if os.path.exists(p)), None)

    # Crear la ventana nativa de pywebview
    window = webview.create_window(
        title="THE TIKI TAKA",
        url=url,
        width=1180,
        height=780,
        min_size=(850, 600),
        background_color="#06070d",
        text_select=False
    )

    # Iniciar la interfaz gráfica
    webview.start(icon=ruta_icono, debug=False)


if __name__ == "__main__":
    main()
