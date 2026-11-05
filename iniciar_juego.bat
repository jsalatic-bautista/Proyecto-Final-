@echo off
chcp 65001 >nul
title THE TIKI TAKA — Servidor Gaming Web

echo ========================================================
echo        🎮 THE TIKI TAKA — GAMING EDITION v2.0
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Python en tu sistema.
    echo Por favor, instala Python 3.10 o superior desde:
    echo https://www.python.org/downloads/
    echo o desde la Microsoft Store, marcando "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)

echo [OK] Python detectado:
python --version
echo.

:: 2. Verificar si Flask está instalado
python -c "import flask" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] La dependencia Flask no esta instalada.
    echo Deseas instalarla automaticamente ahora con pip? (S/N)
    set /p RESP="> "
    if /i "%RESP%"=="S" (
        echo Instalando Flask...
        python -m pip install flask
        if %errorlevel% neq 0 (
            echo [ERROR] No se pudo instalar Flask. Por favor ejecuta manualmente:
            echo python -m pip install flask
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo [AVISO] Flask es necesario para el servidor web.
        echo Puedes instalarlo con: python -m pip install flask
        echo.
        pause
        exit /b 1
    )
)

echo [OK] Dependencias verificadas correctamente.
echo.
echo Iniciando servidor en http://127.0.0.1:5000 ...
echo Abriendo tu navegador web...
echo.
echo ========================================================
echo   Presiona CTRL + C en esta ventana para detener el juego
echo ========================================================
echo.

:: Abrir el navegador tras 1.5 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

:: Ejecutar la aplicación Flask
python app.py

pause
