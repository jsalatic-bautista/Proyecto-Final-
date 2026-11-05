"""
test_quiz.py — Suite completa de pruebas automatizadas para THE TIKI TAKA Gaming Edition.
Comprueba lógica de negocio, persistencia atómica, sesiones y API de Flask.
Utiliza archivos temporales para NO contaminar los datos reales de records.json.
"""

import json
import os
import pathlib
import tempfile
import unittest

from app import app
from quiz_engine import (
    SesionJuego,
    cargar_preguntas,
    cargar_records,
    guardar_record,
    obtener_estadisticas_generales,
    obtener_ranking,
    obtener_directorio_appdata,
    inicializar_records_appdata,
)


class TestQuizEngine(unittest.TestCase):

    def setUp(self):
        # Crear directorio temporal para pruebas aisladas
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = pathlib.Path(self.temp_dir.name)
        self.preguntas_path = self.temp_path / "preguntas.json"
        self.records_path = self.temp_path / "records.json"

        # Datos de prueba
        self.preguntas_datos = [
            {
                "pregunta": "¿Cuántos Mundiales ganó Argentina?",
                "opciones": ["2", "3", "4", "5"],
                "respuesta": "3"
            },
            {
                "pregunta": "¿En qué país se jugó el Mundial 2022?",
                "opciones": ["Rusia", "Qatar", "Brasil", "Alemania"],
                "respuesta": "Qatar"
            }
        ]
        self.preguntas_path.write_text(json.dumps(self.preguntas_datos), encoding="utf-8")

        self.records_datos = [
            {
                "nombre": "bau",
                "puntos": 5,
                "total": 5,
                "fecha": "23/10/2026 16:18",
                "respuestas": []
            },
            {
                "nombre": "pa",
                "puntos": 4,
                "total": 5,
                "fecha": "23/10/2026 16:19",
                "respuestas": []
            }
        ]
        self.records_path.write_text(json.dumps(self.records_datos), encoding="utf-8")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_cargar_preguntas_valido(self):
        preguntas = cargar_preguntas(self.preguntas_path)
        self.assertEqual(len(preguntas), 2)
        self.assertEqual(preguntas[0]["pregunta"], "¿Cuántos Mundiales ganó Argentina?")
        self.assertIn("3", preguntas[0]["opciones"])

    def test_cargar_preguntas_archivo_inexistente_o_invalido(self):
        # Inexistente
        res = cargar_preguntas(self.temp_path / "no_existe.json")
        self.assertEqual(res, [])

        # Archivo vacío
        vacio = self.temp_path / "vacio.json"
        vacio.write_text("", encoding="utf-8")
        self.assertEqual(cargar_preguntas(vacio), [])

        # Archivo con JSON corrupto
        corrupto = self.temp_path / "corrupto.json"
        corrupto.write_text("{este json no es valido", encoding="utf-8")
        self.assertEqual(cargar_preguntas(corrupto), [])

    def test_cargar_records_existentes(self):
        records = cargar_records(self.records_path)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["nombre"], "bau")
        self.assertEqual(records[1]["nombre"], "pa")

    def test_guardar_record_atomico(self):
        guardar_record(
            nombre="Tester",
            puntos=5,
            total=5,
            respuestas=[{"pregunta": "P1", "respondio": "3", "correcta": "3", "acerto": True}],
            tiempo_segundos=12.5,
            racha_max=5,
            ruta=self.records_path
        )
        records = cargar_records(self.records_path)
        self.assertEqual(len(records), 3)
        self.assertEqual(records[-1]["nombre"], "Tester")
        self.assertEqual(records[-1]["puntos"], 5)
        self.assertEqual(records[-1]["tiempo_segundos"], 12.5)

    def test_ranking_ordenado(self):
        guardar_record("Novato", 1, 5, [], ruta=self.records_path)
        guardar_record("Campeon", 5, 5, [], ruta=self.records_path)

        ranking = obtener_ranking(self.records_path)
        # El primero debe tener 5 puntos
        self.assertEqual(ranking[0]["puntos"], 5)
        # El último debe tener 1 punto
        self.assertEqual(ranking[-1]["puntos"], 1)

    def test_appdata_directorio_y_semilla(self):
        # Comprobar que obtener_directorio_appdata retorne un Path válido y existente
        data_dir = obtener_directorio_appdata()
        self.assertTrue(data_dir.exists())

        # Probar inicialización de récords en AppData
        records_appdata = inicializar_records_appdata()
        self.assertTrue(records_appdata.exists())
        records = cargar_records(records_appdata)
        self.assertIsInstance(records, list)

    def test_sesion_juego_flujo_completo(self):
        sesion = SesionJuego(
            nombre="Gamer1",
            cantidad_preguntas=2,
            con_tiempo=True,
            segundos_por_pregunta=15,
            ruta_preguntas=self.preguntas_path
        )
        self.assertEqual(sesion.total_preguntas, 2)
        self.assertEqual(sesion.nombre, "Gamer1")

        # 1. Obtener primera pregunta pública (NO debe revelar respuesta)
        p1 = sesion.obtener_pregunta_actual_publica()
        self.assertIsNotNone(p1)
        self.assertNotIn("respuesta", p1)
        self.assertIn("opciones", p1)
        self.assertEqual(p1["numero"], 1)

        # 2. Responder correctamente
        pregunta_interna = sesion.preguntas_seleccionadas[0]
        resp_correcta = pregunta_interna["respuesta"]

        res = sesion.registrar_respuesta(resp_correcta, tiempo_empleado=2.5)
        self.assertTrue(res["acerto"])
        self.assertEqual(res["puntos"], 1)
        self.assertEqual(res["racha"], 1)

        # 3. Intentar responder nuevamente a la misma pregunta (debe fallar)
        duplicada = sesion.registrar_respuesta("otra", tiempo_empleado=1.0)
        self.assertIn("error", duplicada)

        # 4. Avanzar a la siguiente pregunta
        avance = sesion.avanzar_siguiente_pregunta()
        self.assertFalse(avance["finalizado"])
        self.assertEqual(avance["pregunta"]["numero"], 2)

        # 5. Responder incorrectamente la segunda pregunta
        res2 = sesion.registrar_respuesta("RespuestaIncorrecta999", tiempo_empleado=3.0)
        self.assertFalse(res2["acerto"])
        self.assertEqual(res2["puntos"], 1)  # Mantiene 1 punto
        self.assertEqual(res2["racha"], 0)   # Racha reseteada
        self.assertTrue(res2["es_ultima"])

        # 6. Finalizar y persistir
        resumen = sesion.finalizar_y_guardar(ruta_records=self.records_path)
        self.assertEqual(resumen["puntos"], 1)
        self.assertEqual(resumen["total"], 2)
        self.assertEqual(resumen["correctas"], 1)
        self.assertEqual(resumen["incorrectas"], 1)
        self.assertEqual(resumen["porcentaje"], 50.0)

        # 7. Comprobar que no se duplica el guardado al llamar de nuevo
        sesion.finalizar_y_guardar(ruta_records=self.records_path)
        records_despues = cargar_records(self.records_path)
        # Inicialmente había 2, sumamos 1 de Gamer1 -> deben ser 3 exactamente
        self.assertEqual(len(records_despues), 3)


class TestFlaskAPI(unittest.TestCase):

    def setUp(self):
        self.app = app
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

        # Aislar records.json para pruebas de Flask y no contaminar los datos reales
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_records = pathlib.Path(self.temp_dir.name) / "records.json"
        
        # Copiar datos originales de prueba a la ruta temporal
        datos_iniciales = [
            {"nombre": "bau", "puntos": 5, "total": 5, "fecha": "23/10/2026 16:18", "respuestas": []},
            {"nombre": "pa", "puntos": 4, "total": 5, "fecha": "23/10/2026 16:19", "respuestas": []}
        ]
        self.temp_records.write_text(json.dumps(datos_iniciales), encoding="utf-8")

        import quiz_engine
        self.original_records_path = quiz_engine.RECORDS_PATH
        quiz_engine.RECORDS_PATH = self.temp_records

    def tearDown(self):
        import quiz_engine
        quiz_engine.RECORDS_PATH = self.original_records_path
        self.temp_dir.cleanup()

    def test_ruta_index(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        texto = response.get_data(as_text=True)
        self.assertIn("THE TIKI TAKA", texto)
        self.assertIn("v2.0", texto)
        # Verificar elementos de la intro cinematográfica (Objetivo 2)
        self.assertIn("introCinematic", texto)
        self.assertIn("btnStartIntro", texto)
        self.assertIn("btnSkipIntro", texto)
        self.assertIn("introCanvas", texto)
        self.assertIn("floodlight-tower", texto)
        # Verificar elementos del menú principal y progresión (Objetivo 3)
        self.assertIn("player-hud-strip", texto)
        self.assertIn("homePlayerName", texto)
        self.assertIn("hudPlayerRankBadge", texto)
        self.assertIn("hudXpFill", texto)
        self.card_ids = ["cardWorldCup", "cardPenalties", "cardQuick", "cardDaily", "cardTikidle", "cardProfile", "cardRecords", "cardConfig"]
        for cid in self.card_ids:
            self.assertIn(cid, texto)
        # Verificar íconos SVG propios de cada tarjeta (Etapa 5)
        self.assertIn("icon-trophy-svg", texto)
        self.assertIn("icon-penalties-svg", texto)
        self.assertIn("icon-quick-svg", texto)
        self.assertIn("icon-daily-svg", texto)
        self.assertIn("icon-tikidle-svg", texto)
        self.assertIn("icon-profile-svg", texto)
        self.assertIn("icon-records-svg", texto)
        self.assertIn("icon-config-svg", texto)
        self.assertIn("screenProfile", texto)
        # Verificar elementos de Modos Nuevos (Objetivo 4)
        self.assertIn("screenWorldCupArena", texto)
        self.assertIn("screenPenaltiesArena", texto)
        self.assertIn("screenTikidle", texto)
        self.assertIn("tikidleBoard", texto)
        self.assertIn("tikidleKeyboard", texto)
        self.assertIn("worldcup-bracket-bar", texto)
        self.assertIn("penalties-tv-scoreboard", texto)
        self.assertIn("powerupsDock", texto)
        self.assertIn("modalVarClue", texto)
        self.assertIn("modalCrowdVoting", texto)
        self.assertIn("btnToggleNarrator", texto)

    def test_api_info(self):
        response = self.client.get("/api/info")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("estadisticas", data)
        # El banco de preguntas debe superar ampliamente el mínimo de 80 exigido
        self.assertGreaterEqual(data["estadisticas"]["total_preguntas"], 80)

    def test_api_powerups(self):
        # Iniciar partida de prueba
        res_start = self.client.post("/api/game/start", json={
            "nombre": "PowerupTester",
            "cantidad": 3,
            "con_tiempo": True,
            "segundos": 15
        })
        self.assertEqual(res_start.status_code, 200)
        data_start = res_start.get_json()
        session_id = data_start["session_id"]

        # Probar comodín 50/50
        res_5050 = self.client.post("/api/game/powerup", json={
            "session_id": session_id,
            "comodin": "50_50"
        })
        self.assertEqual(res_5050.status_code, 200)
        data_5050 = res_5050.get_json()
        self.assertTrue(data_5050["success"])
        self.assertIn("opciones_descartadas", data_5050["resultado"])

        # Probar reuso del mismo comodín (debe rechazar con 400)
        res_5050_dup = self.client.post("/api/game/powerup", json={
            "session_id": session_id,
            "comodin": "50_50"
        })
        self.assertEqual(res_5050_dup.status_code, 400)

        # Probar comodín VAR
        res_var = self.client.post("/api/game/powerup", json={
            "session_id": session_id,
            "comodin": "var"
        })
        self.assertEqual(res_var.status_code, 200)
        data_var = res_var.get_json()
        self.assertTrue(data_var["success"])
        self.assertIn("pista", data_var["resultado"])

        # Probar comodín hinchada
        res_crowd = self.client.post("/api/game/powerup", json={
            "session_id": session_id,
            "comodin": "hinchada"
        })
        self.assertEqual(res_crowd.status_code, 200)
        data_crowd = res_crowd.get_json()
        self.assertTrue(data_crowd["success"])
        self.assertIn("distribucion", data_crowd["resultado"])

    def test_api_ciclo_completo_partida(self):
        # 1. Iniciar partida
        res_start = self.client.post("/api/game/start", json={
            "nombre": "TestBot",
            "cantidad": 2,
            "con_tiempo": False
        })
        self.assertEqual(res_start.status_code, 200)
        data_start = res_start.get_json()
        self.assertTrue(data_start["success"])
        session_id = data_start["session_id"]
        self.assertIsNotNone(session_id)
        self.assertIn("pregunta", data_start)

        # 2. Responder pregunta
        opcion_elegida = data_start["pregunta"]["opciones"][0]
        res_ans = self.client.post("/api/game/answer", json={
            "session_id": session_id,
            "opcion": opcion_elegida,
            "tiempo_empleado": 1.2
        })
        self.assertEqual(res_ans.status_code, 200)
        data_ans = res_ans.get_json()
        self.assertTrue(data_ans["success"])
        self.assertIn("acerto", data_ans["resultado"])

        # 3. Intentar responder dos veces (debe dar 400)
        res_dup = self.client.post("/api/game/answer", json={
            "session_id": session_id,
            "opcion": opcion_elegida
        })
        self.assertEqual(res_dup.status_code, 400)

        # 4. Avanzar
        res_next = self.client.post("/api/game/next", json={
            "session_id": session_id
        })
        self.assertEqual(res_next.status_code, 200)

        # 5. Finalizar partida
        res_fin = self.client.post("/api/game/finish", json={
            "session_id": session_id
        })
        self.assertEqual(res_fin.status_code, 200)
        data_fin = res_fin.get_json()
        self.assertTrue(data_fin["success"])
        self.assertEqual(data_fin["resumen"]["nombre"], "TestBot")

    def test_api_records(self):
        response = self.client.get("/api/records")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["records"], list)
        self.assertGreaterEqual(len(data["records"]), 2)  # Al menos bau y pa

    def test_rutas_pwa(self):
        # 1. Service Worker
        res_sw = self.client.get("/sw.js")
        self.assertEqual(res_sw.status_code, 200)
        self.assertIn("application/javascript", res_sw.headers.get("Content-Type", ""))
        self.assertEqual(res_sw.headers.get("Service-Worker-Allowed"), "/")

        # 2. Manifest JSON
        res_mf = self.client.get("/manifest.json")
        self.assertEqual(res_mf.status_code, 200)
        self.assertIn("application/manifest+json", res_mf.headers.get("Content-Type", ""))

        # 3. Favicon
        res_fav = self.client.get("/favicon.ico")
        self.assertEqual(res_fav.status_code, 200)

    # --- PRUEBAS UNITARIAS TIKIDLE (ETAPA 4) ---

    def test_tikidle_catalogo_palabras(self):
        """Verifica que el catálogo tenga al menos 150 palabras y todas sean de 5 letras."""
        from quiz_engine import cargar_palabras_tikidle
        palabras = cargar_palabras_tikidle()
        self.assertGreaterEqual(len(palabras), 150, "Debe haber al menos 150 palabras secretas")
        for palabra, desc in palabras.items():
            self.assertEqual(len(palabra), 5, f"La palabra '{palabra}' debe tener exactamente 5 letras")
            self.assertTrue(palabra.isalpha(), f"La palabra '{palabra}' debe contener solo letras")
            self.assertTrue(palabra.isupper(), f"La palabra '{palabra}' debe estar en mayúsculas")
            self.assertGreater(len(desc), 10, f"La palabra '{palabra}' debe tener una descripción válida")

    def test_tikidle_validar_palabra(self):
        """Comprueba las reglas de validación de 5 letras y diccionario permitido."""
        from quiz_engine import validar_palabra_tikidle

        # Palabras válidas de fútbol y español
        ok, _ = validar_palabra_tikidle("MESSI")
        self.assertTrue(ok)
        ok, _ = validar_palabra_tikidle("RIVER")
        self.assertTrue(ok)
        ok, _ = validar_palabra_tikidle("BOTIN")
        self.assertTrue(ok)
        ok, _ = validar_palabra_tikidle("TABLA")
        self.assertTrue(ok)

        # Longitud incorrecta
        ok, msg = validar_palabra_tikidle("GOL")
        self.assertFalse(ok)
        self.assertIn("5 letras", msg)
        ok, msg = validar_palabra_tikidle("PELOTA")
        self.assertFalse(ok)
        self.assertIn("5 letras", msg)

        # Caracteres inválidos
        ok, _ = validar_palabra_tikidle("G0L10")
        self.assertFalse(ok)

        # Inventada / no existente
        ok, msg = validar_palabra_tikidle("ZXQWP")
        self.assertFalse(ok)
        self.assertIn("no encontrada", msg)

    def test_tikidle_coloreo_letras_repetidas(self):
        """Verifica las reglas de coloreo de Wordle con letras repetidas."""
        from quiz_engine import evaluar_intento_tikidle

        # 1. Acierto completo
        res = evaluar_intento_tikidle("MESSI", "MESSI")
        self.assertEqual(res, ["correct", "correct", "correct", "correct", "correct"])

        # 2. Secret: MESSI, Guess: PASES
        # Pos 2 'S' coincide con secret[2] ('S') -> correct
        # 'E' está en secret (pos 1) -> present
        # La segunda 'S' en pos 4: secret tiene 2 'S's; una ya fue 'correct', queda 1 disponible -> present
        # 'P' y 'A' no están -> absent
        res = evaluar_intento_tikidle("PASES", "MESSI")
        self.assertEqual(res, ["absent", "absent", "correct", "present", "present"])

        # 3. Secret: RIVER, Guess: ROCES
        # Pos 0 'R' == secret[0] -> correct
        # Pos 3 'E' == secret[3] -> correct
        # 'O', 'C', 'S' -> absent
        res = evaluar_intento_tikidle("ROCES", "RIVER")
        self.assertEqual(res, ["correct", "absent", "absent", "correct", "absent"])

        # 4. Secret: BALON, Guess: CANOS
        # Pos 1 'A' == secret[1] -> correct
        # Pos 2 'N' está en secret (pos 4) -> present
        # Pos 3 'O' == secret[3] -> correct
        # 'C', 'S' no están -> absent
        res = evaluar_intento_tikidle("CANOS", "BALON")
        self.assertEqual(res, ["absent", "correct", "present", "correct", "absent"])

    def test_tikidle_calculo_determinista(self):
        """Verifica cálculo determinista por fecha argentina y rotación sin repeticiones inmediatas."""
        from datetime import date, timedelta
        from quiz_engine import obtener_palabra_del_dia

        fecha1 = date(2026, 10, 30)
        p1_a = obtener_palabra_del_dia(fecha1)
        p1_b = obtener_palabra_del_dia(fecha1)
        # Mismo día da exactamente la misma palabra
        self.assertEqual(p1_a["palabra"], p1_b["palabra"])
        self.assertEqual(p1_a["dia_numero"], p1_b["dia_numero"])

        # Días consecutivos deben variar sin repetir palabra en semanas consecutivas
        palabras_vistas = set()
        for offset in range(30): # 30 días seguidos
            dia = fecha1 + timedelta(days=offset)
            info = obtener_palabra_del_dia(dia)
            self.assertEqual(len(info["palabra"]), 5)
            self.assertNotIn(info["palabra"], palabras_vistas, f"Palabra '{info['palabra']}' repetida prematuramente en día {offset}")
            palabras_vistas.add(info["palabra"])

    def test_tikidle_api_endpoints(self):
        """Verifica endpoints REST de Tikidle."""
        # 1. Info del día
        res = self.client.get("/api/tikidle/today")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("dia_numero", data)
        self.assertEqual(data["longitud"], 5)
        self.assertEqual(data["max_intentos"], 6)
        self.assertNotIn("palabra", data, "No se debe filtrar la palabra secreta en /today")

        # 2. Intento inválido
        res_bad = self.client.post("/api/tikidle/check", json={"guess": "GOL", "attempt": 1})
        self.assertEqual(res_bad.status_code, 400)
        self.assertFalse(res_bad.get_json()["success"])

        # 3. Intento válido
        res_ok = self.client.post("/api/tikidle/check", json={"guess": "MESSI", "attempt": 1})
        self.assertEqual(res_ok.status_code, 200)
        data_ok = res_ok.get_json()
        self.assertTrue(data_ok["success"])
        self.assertEqual(len(data_ok["evaluation"]), 5)
        self.assertIn("won", data_ok)


if __name__ == "__main__":
    unittest.main()
