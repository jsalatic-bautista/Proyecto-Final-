"""
quiz_engine.py — Motor central de lógica y persistencia para THE TIKI TAKA.
Mantiene compatibilidad total con preguntas.json y records.json originales,
ofreciendo persistencia atómica segura, validaciones y gestión de sesiones.
"""

import json
import os
import pathlib
import random
import shutil
import sys
import threading
import uuid
from datetime import datetime


def obtener_directorio_appdata() -> pathlib.Path:
    r"""
    Retorna el directorio de datos del usuario en %APPDATA%\TheTikiTaka.
    Crea el directorio si no existe.
    """
    appdata = os.environ.get("APPDATA")
    if appdata:
        data_dir = pathlib.Path(appdata) / "TheTikiTaka"
    else:
        data_dir = pathlib.Path.home() / ".thetikitaka"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return data_dir


def inicializar_records_appdata() -> pathlib.Path:
    r"""
    Inicializa records.json en %APPDATA%\TheTikiTaka\records.json.
    La primera vez copia los récords existentes (con bau y pa) desde el bundle o raíz.
    """
    data_dir = obtener_directorio_appdata()
    dest = data_dir / "records.json"
    if not dest.exists():
        fuentes = []
        if getattr(sys, "frozen", False):
            bundle = pathlib.Path(getattr(sys, "_MEIPASS", sys.executable))
            fuentes.append(bundle / "records.json")
            fuentes.append(pathlib.Path(sys.executable).parent / "records.json")
        fuentes.append(pathlib.Path(__file__).parent / "records.json")

        copiado = False
        for f in fuentes:
            if f.exists():
                try:
                    shutil.copy2(f, dest)
                    copiado = True
                    break
                except Exception:
                    pass

        if not copiado:
            seed = []
            try:
                dest.write_text(json.dumps(seed, indent=4, ensure_ascii=False), encoding="utf-8")
            except Exception:
                pass
    return dest


# Soporte para ejecución normal y empaquetado con PyInstaller
if getattr(sys, "frozen", False):
    EXE_DIR = pathlib.Path(sys.executable).parent
    BUNDLE_DIR = pathlib.Path(getattr(sys, "_MEIPASS", EXE_DIR))
    # preguntas.json busca primero en bundle, luego junto al .exe
    PREGUNTAS_PATH = BUNDLE_DIR / "preguntas.json"
    if not PREGUNTAS_PATH.exists():
        PREGUNTAS_PATH = EXE_DIR / "preguntas.json"
    # records.json siempre en %APPDATA%\TheTikiTaka\records.json
    RECORDS_PATH = inicializar_records_appdata()
    TIKIDLE_PALABRAS_PATH = BUNDLE_DIR / "data" / "tikidle_palabras.json"
    if not TIKIDLE_PALABRAS_PATH.exists():
        TIKIDLE_PALABRAS_PATH = EXE_DIR / "data" / "tikidle_palabras.json"
    TIKIDLE_VALIDAS_PATH = BUNDLE_DIR / "data" / "tikidle_validas.json"
    if not TIKIDLE_VALIDAS_PATH.exists():
        TIKIDLE_VALIDAS_PATH = EXE_DIR / "data" / "tikidle_validas.json"
else:
    BASE_DIR = pathlib.Path(__file__).parent
    PREGUNTAS_PATH = BASE_DIR / "preguntas.json"
    TIKIDLE_PALABRAS_PATH = BASE_DIR / "data" / "tikidle_palabras.json"
    TIKIDLE_VALIDAS_PATH = BASE_DIR / "data" / "tikidle_validas.json"
    RECORDS_PATH = inicializar_records_appdata()

# Candado para sincronizar escrituras en records.json y evitar colisiones
_records_lock = threading.Lock()


def cargar_preguntas(ruta=None):
    """
    Carga y valida las preguntas desde el archivo JSON.
    Conserva campos enriquecidos como categoria, dificultad, tipo, pistas y pista_var.
    Devuelve una lista de preguntas válidas.
    """
    ruta_archivo = pathlib.Path(ruta) if ruta else PREGUNTAS_PATH
    if not ruta_archivo.exists():
        return []

    try:
        contenido = ruta_archivo.read_text(encoding="utf-8").strip()
        if not contenido:
            return []
        datos = json.loads(contenido)
    except (json.JSONDecodeError, OSError):
        return []

    if not isinstance(datos, list):
        return []

    preguntas_validas = []
    for item in datos:
        if isinstance(item, dict):
            pregunta = item.get("pregunta")
            opciones = item.get("opciones")
            respuesta = item.get("respuesta")
            tipo = item.get("tipo", "multiple_choice")
            categoria = item.get("categoria", "Historia")
            dificultad = item.get("dificultad", "medio")
            pista_var = item.get("pista_var", "")
            pistas = item.get("pistas", [])
            items_ordenados = item.get("items_ordenados", [])

            if (
                isinstance(pregunta, str)
                and isinstance(opciones, list)
                and len(opciones) >= 2
                and isinstance(respuesta, str)
            ):
                opciones_limpias = [str(o).strip() for o in opciones]
                resp_limpia = str(respuesta).strip()

                es_valida = False
                if tipo == "ordenar":
                    es_valida = True
                elif resp_limpia in opciones_limpias:
                    es_valida = True

                if es_valida:
                    preguntas_validas.append({
                        "pregunta": pregunta.strip(),
                        "opciones": opciones_limpias,
                        "respuesta": resp_limpia,
                        "categoria": str(categoria).strip(),
                        "dificultad": str(dificultad).strip(),
                        "tipo": str(tipo).strip(),
                        "pista_var": str(pista_var).strip(),
                        "pistas": list(pistas) if isinstance(pistas, list) else [],
                        "items_ordenados": list(items_ordenados) if isinstance(items_ordenados, list) else []
                    })
    return preguntas_validas


def cargar_records(ruta=None):
    """
    Carga los récords de forma segura desde el archivo JSON.
    Si el archivo no existe, está vacío o es inválido, devuelve lista vacía sin fallar.
    """
    ruta_archivo = pathlib.Path(ruta) if ruta else RECORDS_PATH
    if not ruta_archivo.exists():
        return []

    with _records_lock:
        try:
            contenido = ruta_archivo.read_text(encoding="utf-8").strip()
            if not contenido:
                return []
            datos = json.loads(contenido)
            if isinstance(datos, list):
                # Validar que cada elemento tenga estructura mínima
                records_filtrados = []
                for r in datos:
                    if isinstance(r, dict) and "puntos" in r and "nombre" in r:
                        records_filtrados.append(r)
                return records_filtrados
            return []
        except (json.JSONDecodeError, OSError):
            return []


def guardar_record(nombre, puntos, total, respuestas, tiempo_segundos=None, racha_max=None, ruta=None):
    """
    Guarda un nuevo récord en records.json de forma atómica y segura.
    Conserva la estructura original del archivo JSON.
    """
    ruta_archivo = pathlib.Path(ruta) if ruta else RECORDS_PATH
    nombre_limpio = (nombre or "").strip()
    if not nombre_limpio:
        nombre_limpio = "Anónimo"
    # Limitar longitud para evitar desbordes visuales
    nombre_limpio = nombre_limpio[:20]

    # Validar rangos numéricos
    total_val = max(1, int(total))
    puntos_val = max(0, min(int(puntos), total_val))

    ahora = datetime.now()
    fecha_str = ahora.strftime("%d/%m/%Y %H:%M")

    nuevo_record = {
        "nombre": nombre_limpio,
        "puntos": puntos_val,
        "total": total_val,
        "fecha": fecha_str,
        "respuestas": respuestas
    }

    if tiempo_segundos is not None:
        nuevo_record["tiempo_segundos"] = round(float(tiempo_segundos), 1)
    if racha_max is not None:
        nuevo_record["racha_max"] = int(racha_max)

    with _records_lock:
        # Cargar existentes
        records = []
        if ruta_archivo.exists():
            try:
                txt = ruta_archivo.read_text(encoding="utf-8").strip()
                if txt:
                    candidato = json.loads(txt)
                    if isinstance(candidato, list):
                        records = candidato
            except (json.JSONDecodeError, OSError):
                records = []

        records.append(nuevo_record)

        # Escritura atómica usando archivo temporal
        ruta_tmp = ruta_archivo.with_suffix(".tmp")
        try:
            contenido_json = json.dumps(records, indent=4, ensure_ascii=False)
            ruta_tmp.write_text(contenido_json, encoding="utf-8")
            os.replace(ruta_tmp, ruta_archivo)
        except OSError:
            if ruta_tmp.exists():
                try:
                    ruta_tmp.unlink()
                except OSError:
                    pass
            raise

    return nuevo_record


def obtener_ranking(ruta=None, limite=50):
    """
    Obtiene la tabla de clasificación ordenada de mayor a menor puntuación.
    En caso de empate en puntos, prioriza mayor porcentaje de acierto.
    """
    records = cargar_records(ruta)

    def criterio(r):
        pts = r.get("puntos", 0)
        tot = r.get("total", 1) or 1
        pct = pts / tot
        return (pts, pct)

    ordenados = sorted(records, key=criterio, reverse=True)
    return ordenados[:limite]


def obtener_estadisticas_generales(ruta_records=None, ruta_preguntas=None):
    """
    Calcula estadísticas acumuladas para la pantalla de inicio.
    """
    records = cargar_records(ruta_records)
    preguntas = cargar_preguntas(ruta_preguntas)

    total_partidas = len(records)
    max_puntos = 0
    mejor_jugador = "Ninguno"

    if records:
        top = max(records, key=lambda r: r.get("puntos", 0))
        max_puntos = top.get("puntos", 0)
        mejor_jugador = top.get("nombre", "Anónimo")

    return {
        "total_partidas": total_partidas,
        "max_puntos": max_puntos,
        "mejor_jugador": mejor_jugador,
        "total_preguntas": len(preguntas)
    }


class SesionJuego:
    """
    Representa una partida activa en el servidor.
    Mantiene el estado, valida respuestas y previene trampas desde el cliente.
    Soporta modos Camino al Mundial, Penales 1v1, Desafío Diario, Comodines y nuevos tipos de preguntas.
    """

    def __init__(
        self,
        nombre="Anónimo",
        cantidad_preguntas=5,
        con_tiempo=False,
        segundos_por_pregunta=15,
        ruta_preguntas=None,
        modo="quick",
        categoria=None,
        dificultad=None,
        fase_mundial=None
    ):
        self.id_sesion = str(uuid.uuid4())
        self.nombre = (nombre or "Anónimo").strip()[:20] or "Anónimo"
        self.con_tiempo = bool(con_tiempo)
        self.segundos_por_pregunta = max(5, min(int(segundos_por_pregunta), 60))
        self.creado_en = datetime.now()
        self.modo = str(modo or "quick").lower()
        self.categoria_filtro = categoria
        self.dificultad_filtro = dificultad
        self.fase_mundial = fase_mundial

        todas = cargar_preguntas(ruta_preguntas)
        if not todas:
            raise ValueError("No hay preguntas disponibles en el banco de preguntas.")

        # Filtrar preguntas según modo o filtros
        candidatas = list(todas)

        if self.modo == "worldcup" and self.fase_mundial:
            # Fases del Mundial:
            # fase_grupos: 3 faciles
            # octavos: 3 medias
            # cuartos: 3 medias
            # semifinal: 4 dificiles
            # final: 5 dificiles
            mapa_dificultad = {
                "fase_grupos": ("facil", 3),
                "octavos": ("medio", 3),
                "cuartos": ("medio", 3),
                "semifinal": ("dificil", 4),
                "final": ("dificil", 5)
            }
            if self.fase_mundial in mapa_dificultad:
                dif_requerida, cant_requerida = mapa_dificultad[self.fase_mundial]
                filtradas = [p for p in candidatas if p.get("dificultad") == dif_requerida]
                if len(filtradas) >= cant_requerida:
                    candidatas = filtradas
                cantidad_preguntas = cant_requerida

        elif self.modo == "daily":
            # Desafío Diario estilo Wordle: semilla determinista basada en la fecha YYYY-MM-DD
            fecha_hoy = datetime.now().strftime("%Y-%m-%d")
            rng_diario = random.Random(fecha_hoy)
            copia_diaria = list(candidatas)
            rng_diario.shuffle(copia_diaria)
            candidatas = copia_diaria
            cantidad_preguntas = 5

        else:
            if self.dificultad_filtro:
                filtradas = [p for p in candidatas if p.get("dificultad") == self.dificultad_filtro]
                if filtradas:
                    candidatas = filtradas
            if self.categoria_filtro:
                filtradas = [p for p in candidatas if p.get("categoria") == self.categoria_filtro]
                if filtradas:
                    candidatas = filtradas

        # Mezclar preguntas seleccionadas
        if self.modo != "daily":
            random.shuffle(candidatas)

        cantidad = max(1, min(int(cantidad_preguntas), len(candidatas)))
        self.preguntas_seleccionadas = [dict(p) for p in candidatas[:cantidad]]

        # Mezclar las opciones de cada pregunta (salvo ordenar)
        for p in self.preguntas_seleccionadas:
            opciones_mezcladas = list(p["opciones"])
            if p.get("tipo") != "verdadero_falso":
                random.shuffle(opciones_mezcladas)
            p["opciones_mezcladas"] = opciones_mezcladas

        self.indice_actual = 0
        self.puntos = 0
        self.racha_actual = 0
        self.racha_max = 0
        self.respuestas_historial = []
        self.respondio_pregunta_actual = False
        self.finalizado = False
        self.record_guardado = False
        self.tiempo_inicio = datetime.now()
        self.tiempo_total_segundos = 0

        # Comodines disponibles (1 uso de cada uno por partida)
        self.comodines_disponibles = {
            "50_50": True,
            "var": True,
            "tiempo_extra": True,
            "hinchada": True
        }

    @property
    def total_preguntas(self):
        return len(self.preguntas_seleccionadas)

    def obtener_pregunta_actual_publica(self):
        """
        Retorna la pregunta actual para el cliente sin revelar la respuesta correcta.
        """
        if self.finalizado or self.indice_actual >= self.total_preguntas:
            return None

        p = self.preguntas_seleccionadas[self.indice_actual]
        return {
            "numero": self.indice_actual + 1,
            "total": self.total_preguntas,
            "pregunta": p["pregunta"],
            "opciones": list(p["opciones_mezcladas"]),
            "con_tiempo": self.con_tiempo,
            "segundos": self.segundos_por_pregunta if self.con_tiempo else 0,
            "puntos_actuales": self.puntos,
            "racha": self.racha_actual,
            "categoria": p.get("categoria", "Historia"),
            "dificultad": p.get("dificultad", "medio"),
            "tipo": p.get("tipo", "multiple_choice"),
            "pistas": list(p.get("pistas", [])),
            "items_ordenados": list(p.get("items_ordenados", [])),
            "comodines": dict(self.comodines_disponibles),
            "modo": self.modo,
            "fase_mundial": self.fase_mundial
        }

    def usar_comodin(self, tipo_comodin):
        """
        Aplica un comodín táctico durante la partida si está disponible.
        """
        if self.finalizado or self.respondio_pregunta_actual:
            return {"error": "No se puede usar un comodín en este momento."}

        if tipo_comodin not in self.comodines_disponibles or not self.comodines_disponibles[tipo_comodin]:
            return {"error": f"El comodín {tipo_comodin} ya fue utilizado en esta partida."}

        p = self.preguntas_seleccionadas[self.indice_actual]
        respuesta_correcta = p["respuesta"]
        tipo_pregunta = p.get("tipo", "multiple_choice")

        resultado = {"tipo": tipo_comodin}

        if tipo_comodin == "50_50":
            opciones = list(p["opciones_mezcladas"])
            incorrectas = [o for o in opciones if o != respuesta_correcta]
            # Tomar hasta 2 incorrectas (o 1 si solo hay 1 incorrecta como en V/F)
            cant_a_eliminar = min(2, len(incorrectas))
            a_eliminar = random.sample(incorrectas, cant_a_eliminar) if incorrectas else []
            resultado["opciones_a_eliminar"] = a_eliminar
            resultado["opciones_descartadas"] = a_eliminar

        elif tipo_comodin == "var":
            pista = p.get("pista_var") or "El VAR confirma: jugada milimétrica y decisiva en el partido."
            resultado["pista"] = pista
            resultado["pista_var"] = pista

        elif tipo_comodin == "tiempo_extra":
            resultado["segundos_extra"] = 10

        elif tipo_comodin == "hinchada":
            # Simular votación del público
            opciones = list(p["opciones_mezcladas"])
            porcentajes = {}
            pct_correcta = random.randint(62, 82)
            porcentajes[respuesta_correcta] = pct_correcta
            restante = 100 - pct_correcta
            otras = [o for o in opciones if o != respuesta_correcta]
            if otras:
                partes = len(otras)
                base = restante // partes
                for idx, o in enumerate(otras):
                    porcentajes[o] = base + (restante % partes if idx == 0 else 0)
            resultado["porcentajes"] = porcentajes
            resultado["distribucion"] = porcentajes

        self.comodines_disponibles[tipo_comodin] = False
        resultado["comodines_restantes"] = dict(self.comodines_disponibles)
        return resultado

    def registrar_respuesta(self, opcion_elegida, tiempo_empleado=0):
        """
        Valida la respuesta elegida para la pregunta actual.
        No permite responder más de una vez a la misma pregunta.
        Soporta preguntas de opción múltiple, V/F, pistas y orden cronológico.
        """
        if self.finalizado:
            return {"error": "La partida ya ha finalizado."}

        if self.respondio_pregunta_actual:
            return {"error": "Esta pregunta ya ha sido contestada."}

        if self.indice_actual >= self.total_preguntas:
            self.finalizado = True
            return {"error": "No quedan más preguntas en esta partida."}

        p = self.preguntas_seleccionadas[self.indice_actual]
        respuesta_correcta = p["respuesta"]
        tipo_pregunta = p.get("tipo", "multiple_choice")

        opcion_str = str(opcion_elegida).strip() if opcion_elegida is not None else "Tiempo agotado"

        # Validación según tipo
        if tipo_pregunta == "ordenar":
            # Tolerar diferencias de espacios en respuestas de ordenación
            norm_elegida = opcion_str.lower().replace(" ", "")
            norm_correcta = respuesta_correcta.lower().replace(" ", "")
            acerto = (norm_elegida == norm_correcta)
        else:
            acerto = (opcion_str.lower() == respuesta_correcta.lower())

        if acerto:
            self.puntos += 1
            self.racha_actual += 1
            if self.racha_actual > self.racha_max:
                self.racha_max = self.racha_actual
        else:
            self.racha_actual = 0

        self.respuestas_historial.append({
            "pregunta": p["pregunta"],
            "respondio": opcion_str,
            "correcta": respuesta_correcta,
            "acerto": acerto,
            "tiempo": round(float(tiempo_empleado), 1),
            "categoria": p.get("categoria", "Historia"),
            "tipo": tipo_pregunta
        })

        self.respondio_pregunta_actual = True

        es_ultima = (self.indice_actual + 1 >= self.total_preguntas)
        if es_ultima:
            self.finalizado = True
            self.tiempo_total_segundos = (datetime.now() - self.tiempo_inicio).total_seconds()

        return {
            "acerto": acerto,
            "respuesta_correcta": respuesta_correcta,
            "opcion_elegida": opcion_str,
            "puntos": self.puntos,
            "racha": self.racha_actual,
            "racha_max": self.racha_max,
            "es_ultima": es_ultima,
            "tipo": tipo_pregunta
        }

    def avanzar_siguiente_pregunta(self):
        """
        Avanza al siguiente índice de pregunta tras haber sido contestada.
        """
        if not self.respondio_pregunta_actual:
            return {"error": "Debes contestar la pregunta actual antes de avanzar."}

        self.indice_actual += 1
        self.respondio_pregunta_actual = False

        if self.indice_actual >= self.total_preguntas:
            self.finalizado = True
            self.tiempo_total_segundos = (datetime.now() - self.tiempo_inicio).total_seconds()
            return {"finalizado": True}

        return {"finalizado": False, "pregunta": self.obtener_pregunta_actual_publica()}

    def finalizar_y_guardar(self, ruta_records=None):
        """
        Finaliza la partida y persiste el récord si no ha sido guardado previamente.
        Devuelve el resumen completo y si es un nuevo récord absoluto.
        """
        self.finalizado = True
        if self.tiempo_total_segundos == 0:
            self.tiempo_total_segundos = (datetime.now() - self.tiempo_inicio).total_seconds()

        # Determinar si es récord antes de guardar
        records_previos = cargar_records(ruta_records)
        record_max_anterior = max((r.get("puntos", 0) for r in records_previos), default=0)

        es_nuevo_record = False
        if not self.record_guardado:
            # Respuestas en formato exacto original de records.json
            respuestas_formato_original = [
                {
                    "pregunta": r["pregunta"],
                    "respondio": r["respondio"],
                    "correcta": r["correcta"],
                    "acerto": r["acerto"]
                }
                for r in self.respuestas_historial
            ]

            guardar_record(
                nombre=self.nombre,
                puntos=self.puntos,
                total=self.total_preguntas,
                respuestas=respuestas_formato_original,
                tiempo_segundos=self.tiempo_total_segundos,
                racha_max=self.racha_max,
                ruta=ruta_records
            )
            self.record_guardado = True

            if self.puntos > record_max_anterior and self.puntos > 0:
                es_nuevo_record = True

        correctas = self.puntos
        incorrectas = self.total_preguntas - self.puntos
        porcentaje = round((correctas / self.total_preguntas) * 100, 1) if self.total_preguntas > 0 else 0

        return {
            "nombre": self.nombre,
            "puntos": self.puntos,
            "total": self.total_preguntas,
            "correctas": correctas,
            "incorrectas": incorrectas,
            "porcentaje": porcentaje,
            "racha_max": self.racha_max,
            "tiempo_segundos": round(self.tiempo_total_segundos, 1),
            "es_nuevo_record": es_nuevo_record,
            "record_max_anterior": record_max_anterior,
            "respuestas": self.respuestas_historial
        }


# =========================================================================
# MOTOR DEL MINIJUEGO TIKIDLE (WORDLE DE FÚTBOL)
# =========================================================================

_TIKIDLE_PALABRAS_CACHE = None
_TIKIDLE_VALIDAS_CACHE = None


def cargar_palabras_tikidle(ruta=None):
    """Carga el diccionario de palabras secretas de fútbol (5 letras con definición)."""
    global _TIKIDLE_PALABRAS_CACHE
    if _TIKIDLE_PALABRAS_CACHE is not None and ruta is None:
        return _TIKIDLE_PALABRAS_CACHE

    target = pathlib.Path(ruta) if ruta else TIKIDLE_PALABRAS_PATH
    if not target.exists():
        return {}
    try:
        with open(target, "r", encoding="utf-8") as f:
            data = json.load(f)
            res = {k.upper(): v for k, v in data.items() if len(k) == 5}
            if ruta is None:
                _TIKIDLE_PALABRAS_CACHE = res
            return res
    except Exception as e:
        print(f"[ERROR] Error cargando tikidle_palabras: {e}")
        return {}


def cargar_validas_tikidle(ruta=None):
    """Carga el conjunto de palabras válidas en español de 5 letras aceptadas como intento."""
    global _TIKIDLE_VALIDAS_CACHE
    if _TIKIDLE_VALIDAS_CACHE is not None and ruta is None:
        return _TIKIDLE_VALIDAS_CACHE

    target = pathlib.Path(ruta) if ruta else TIKIDLE_VALIDAS_PATH
    palabras_secretas = set(cargar_palabras_tikidle().keys())
    if not target.exists():
        return palabras_secretas
    try:
        with open(target, "r", encoding="utf-8") as f:
            lista = json.load(f)
            validas = {w.upper() for w in lista if len(w) == 5}
            validas.update(palabras_secretas)
            if ruta is None:
                _TIKIDLE_VALIDAS_CACHE = validas
            return validas
    except Exception as e:
        print(f"[ERROR] Error cargando tikidle_validas: {e}")
        return palabras_secretas


def obtener_fecha_argentina():
    """Obtiene la fecha actual en la zona horaria de Argentina (UTC-3)."""
    from datetime import timezone, timedelta
    tz_ar = timezone(timedelta(hours=-3))
    return datetime.now(tz_ar).date()


def obtener_palabra_del_dia(fecha=None, ruta_palabras=None):
    """
    Calcula de forma determinista la palabra secreta de Tikidle para una fecha dada.
    Garantiza:
    1. Misma palabra para todos los jugadores el mismo día.
    2. Cambio automático a medianoche hora argentina.
    3. Ninguna repetición en semanas consecutivas (rotación cíclica sin reemplazo).
    """
    if fecha is None:
        fecha = obtener_fecha_argentina()
    elif isinstance(fecha, str):
        fecha = datetime.strptime(fecha, "%Y-%m-%d").date()

    palabras_dict = cargar_palabras_tikidle(ruta_palabras)
    if not palabras_dict:
        return {
            "palabra": "MESSI",
            "definicion": "Lionel Messi: Capitán campeón del mundo y leyenda absoluta.",
            "dia_numero": 1,
            "fecha": str(fecha)
        }

    claves_ordenadas = sorted(list(palabras_dict.keys()))
    total = len(claves_ordenadas)

    fecha_ancla = datetime(2026, 1, 1).date()
    dia_numero = (fecha - fecha_ancla).days
    if dia_numero < 0:
        dia_numero = abs(dia_numero)

    # Permutación pseudoaleatoria fija
    rnd = random.Random(19861218)
    indices_permutados = list(range(total))
    rnd.shuffle(indices_permutados)

    ciclo = dia_numero // total
    posicion_en_ciclo = dia_numero % total
    indice_final = (indices_permutados[posicion_en_ciclo] + ciclo * 17) % total
    palabra_elegida = claves_ordenadas[indice_final]

    return {
        "palabra": palabra_elegida,
        "definicion": palabras_dict[palabra_elegida],
        "dia_numero": dia_numero + 1,
        "fecha": str(fecha)
    }


def evaluar_intento_tikidle(intento, palabra_secreta):
    """
    Evalúa un intento de 5 letras contra la palabra secreta según las reglas estándar de Wordle.
    Devuelve lista de 5 estados: 'correct' (verde), 'present' (amarillo), 'absent' (gris).
    Maneja correctamente letras repetidas.
    """
    intento = intento.strip().upper()
    palabra_secreta = palabra_secreta.strip().upper()

    if len(intento) != 5 or len(palabra_secreta) != 5:
        raise ValueError("Tanto el intento como la palabra secreta deben tener exactamente 5 letras.")

    resultado = ["absent"] * 5
    conteo_secretas = {}

    # Paso 1: Coincidencias exactas (verde)
    for i in range(5):
        if intento[i] == palabra_secreta[i]:
            resultado[i] = "correct"
        else:
            c = palabra_secreta[i]
            conteo_secretas[c] = conteo_secretas.get(c, 0) + 1

    # Paso 2: Letras presentes en otra posición (amarillo)
    for i in range(5):
        if resultado[i] != "correct":
            char = intento[i]
            if conteo_secretas.get(char, 0) > 0:
                resultado[i] = "present"
                conteo_secretas[char] -= 1

    return resultado


def validar_palabra_tikidle(palabra, ruta_validas=None):
    """Verifica si la palabra tiene 5 letras y pertenece al diccionario permitido."""
    if not palabra or not isinstance(palabra, str):
        return False, "La palabra no puede estar vacía."
    p = palabra.strip().upper()
    if len(p) != 5:
        return False, "La palabra debe tener exactamente 5 letras."
    if not p.isalpha():
        return False, "La palabra solo puede contener letras."

    validas = cargar_validas_tikidle(ruta_validas)
    if p not in validas:
        return False, "Palabra no encontrada en el diccionario."

    return True, "Palabra válida"
