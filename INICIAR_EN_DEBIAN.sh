#!/usr/bin/env bash
# =====================================================================
# OPTIMIZADOR INDUSTRIAL DE MELAMINA - BIESSE SELCO WNT 600 (DEBIAN)
# Ejecución local sin requerir compilación (PHP o Python)
# =====================================================================

set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT=8085
URL="http://127.0.0.1:${PORT}/index.html"

echo "====================================================================="
echo "  OPTIMIZADOR DE PLACAS DE MELAMINA - SECCIONADORA SELCO WNT 600"
echo "  Esquema 2D + Orden de Trabajo + Despiece 3D Interactivo"
echo "====================================================================="
echo "Iniciando servidor local en: ${URL}"

# Si ya hay un servidor en el puerto 8085, abrir navegador directamente
if ss -tln 2>/dev/null | grep -q ":${PORT} "; then
    echo "El servidor local ya está activo en ${URL}"
else
    if command -v php >/dev/null 2>&1; then
        php -S "127.0.0.1:${PORT}" -t "$DIR" >/dev/null 2>&1 &
        SERVER_PID=$!
    elif command -v python3 >/dev/null 2>&1; then
        python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory "$DIR" >/dev/null 2>&1 &
        SERVER_PID=$!
    else
        echo "Abriendo modo directo offline..."
        xdg-open "$DIR/index.html" 2>/dev/null || true
        exit 0
    fi
    sleep 1
fi

# Abrir en navegador o modo App si está disponible
if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="$URL" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
    chromium --app="$URL" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
fi

echo "Sistema activo en: ${URL}"
echo "Presiona Ctrl+C para detener el servidor cuando termines."
if [ -n "${SERVER_PID:-}" ]; then
    wait "$SERVER_PID"
fi
