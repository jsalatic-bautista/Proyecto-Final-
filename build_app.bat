@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo     THE TIKI TAKA - GENERADOR DE EJECUTABLE WINDOWS
echo ========================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Python en el sistema.
    echo Asegurate de tener Python instalado y agregado al PATH.
    pause
    exit /b 1
)

echo [1/4] Verificando e instalando dependencias (requirements.txt)...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
)

echo [2/4] Verificando iconos y voces neuronales offline...
if not exist "icono.ico" (
    echo [INFO] Generando icono.ico...
    python tools\generar_logos_iconos.py
)
if not exist "static\audio\relator\intro_gol.mp3" (
    echo [INFO] Generando voces de relator con edge-tts...
    python tools\generar_voces.py
)

echo.
echo [3/4] Empaquetando THE TIKI TAKA en un solo archivo .exe con PyInstaller...
echo       (Esto puede demorar unos minutos, por favor espere...)
echo.

python -m PyInstaller --noconfirm --clean --onefile --windowed --noupx ^
    --version-file "version_info.txt" ^
    --name "TheTikiTaka" ^
    --icon "icono.ico" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-data "data;data" ^
    --add-data "preguntas.json;." ^
    --add-data "records.json;." ^
    desktop_app.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo la compilacion con PyInstaller.
    pause
    exit /b 1
)

echo.
echo [4/4] Verificando binario generado...
if exist "dist\TheTikiTaka.exe" (
    echo [OK] dist\TheTikiTaka.exe generado correctamente.
) else (
    echo [ERROR] No se encontro dist\TheTikiTaka.exe.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   COMPILACION FINALIZADA CON EXITO!
echo ========================================================
echo Aplicacion empaquetada en un solo archivo:
echo   dist\TheTikiTaka.exe
echo.
echo Caracteristicas incluidas:
echo   * Icono de aplicacion: icono.ico
echo   * Sin consola negra ni navegador externo (ventana nativa)
echo   * Todos los recursos incluidos (templates, static, data, audios)
echo   * Persistencia en: %%APPDATA%%\TheTikiTaka\records.json
echo ========================================================
echo.
pause
