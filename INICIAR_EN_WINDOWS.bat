@echo off
chcp 65001 >nul
title Optimizador Selco WNT 600 - Biesse / Optiplanning
color 0B

echo =====================================================================
echo       OPTIMIZADOR DE CORTES PARA SECCIONADORA SELCO WNT 600
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Buscar PHP en PATH
set "PHP_CMD=php"
where php >nul 2>&1
if %ERRORLEVEL% equ 0 goto start_server

:: 2. Buscar PHP en rutas comunes de Windows
if exist "C:\xampp\php\php.exe" (
    set "PHP_CMD=C:\xampp\php\php.exe"
    goto start_server
)
if exist "D:\xampp\php\php.exe" (
    set "PHP_CMD=D:\xampp\php\php.exe"
    goto start_server
)
if exist "C:\laragon\bin\php\current\php.exe" (
    set "PHP_CMD=C:\laragon\bin\php\current\php.exe"
    goto start_server
)
if exist "C:\Program Files\PHP\php.exe" (
    set "PHP_CMD=C:\Program Files\PHP\php.exe"
    goto start_server
)

:: Si no se encontró PHP automáticamente
echo [AVISO] No se encontro el ejecutable de PHP automaticamente.
echo.
echo Para ejecutar en Windows tienes 2 opciones sencillas:
echo.
echo   OPCION 1 (Recomendada con XAMPP):
echo     1. Copia esta carpeta completa en: C:\xampp\htdocs\Optimizador
echo     2. Inicia el panel de control de XAMPP y presiona "Start" en Apache.
echo     3. Abre tu navegador y entra a: http://localhost/Optimizador/
echo.
echo   OPCION 2 (Si tienes PHP portatil):
echo     Ingresa la ruta completa a php.exe (ejemplo: C:\php\php.exe)
echo.
set /p USER_PHP="Ruta de php.exe (o presiona Enter para salir): "
if "%USER_PHP%"=="" exit /b 1
if exist "%USER_PHP%" (
    set "PHP_CMD=%USER_PHP%"
    goto start_server
) else (
    echo [ERROR] No existe el archivo especificado.
    pause
    exit /b 1
)

:start_server
echo [OK] PHP detectado: "%PHP_CMD%"
echo [OK] Iniciando servidor local en http://localhost:8080 ...
echo [OK] Abriendo el navegador web...
echo.
echo =====================================================================
echo  El optimizador esta en ejecucion.
echo  Para cerrar el sistema, simplemente cierra esta ventana de comandos.
echo =====================================================================
echo.

:: Abrir navegador en 2 segundos mientras el servidor levanta
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"

:: Iniciar servidor local PHP
"%PHP_CMD%" -S localhost:8080 -t "%~dp0"

pause
