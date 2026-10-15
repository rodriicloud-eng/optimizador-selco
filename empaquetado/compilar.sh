#!/usr/bin/env bash
# Genera el instalador de Debian (.deb) y el de Windows (.exe).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACK="${ROOT}/empaquetado"
OUT="${HOME}/Documentos/Instaladores_Optimizador_Selco"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

VERSION_FILE="${PACK}/version.txt"
if [[ ! -f "${VERSION_FILE}" ]]; then
    printf '1.0.0\n' > "${VERSION_FILE}"
fi
CURRENT="$(tr -d '[:space:]' < "${VERSION_FILE}")"
IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT}"
PATCH="$((PATCH + 1))"
VERSION="${MAJOR}.${MINOR}.${PATCH}"
printf '%s\n' "${VERSION}" > "${VERSION_FILE}"

mkdir -p "${OUT}"

cp "${ROOT}/assets/icono.png" "${WORK}/icono.png"
cp "${ROOT}/assets/icono.ico" "${WORK}/icono.ico"

stage_app() {
    local dest="$1"
    mkdir -p "${dest}"
    rsync -a \
        --exclude 'empaquetado/' \
        --exclude 'tests/' \
        --exclude '.git/' \
        "${ROOT}/" "${dest}/"
    cp "${PACK}/servidor.ps1" "${PACK}/iniciar.vbs" "${PACK}/servidor.py" "${dest}/"
    cp "${ROOT}/assets/icono.ico" "${dest}/icono.ico"
    cp "${ROOT}/assets/icono.png" "${dest}/icono.png"
}

# --- Debian ---
DEB_ROOT="${WORK}/deb"
stage_app "${DEB_ROOT}/opt/optimizador-selco"
install -d "${DEB_ROOT}/usr/bin"
install -m 755 "${PACK}/optimizador-selco" "${DEB_ROOT}/usr/bin/optimizador-selco"
install -d "${DEB_ROOT}/usr/share/applications"
install -m 644 "${PACK}/optimizador-selco.desktop" "${DEB_ROOT}/usr/share/applications/optimizador-selco.desktop"
install -d "${DEB_ROOT}/usr/share/icons/hicolor/128x128/apps"
install -d "${DEB_ROOT}/usr/share/icons/hicolor/256x256/apps"
install -d "${DEB_ROOT}/usr/share/icons/hicolor/512x512/apps"
install -m 644 "${ROOT}/assets/icono-128.png" "${DEB_ROOT}/usr/share/icons/hicolor/128x128/apps/optimizador-selco.png"
install -m 644 "${ROOT}/assets/icono.png" "${DEB_ROOT}/usr/share/icons/hicolor/256x256/apps/optimizador-selco.png"
install -m 644 "${ROOT}/assets/icono.png" "${DEB_ROOT}/usr/share/icons/hicolor/512x512/apps/optimizador-selco.png"
install -d "${DEB_ROOT}/opt/optimizador-selco/export"
chmod 1777 "${DEB_ROOT}/opt/optimizador-selco/export"
find "${DEB_ROOT}/opt/optimizador-selco" -type d -exec chmod 755 {} +
find "${DEB_ROOT}/opt/optimizador-selco" -type f -exec chmod 644 {} +
chmod 1777 "${DEB_ROOT}/opt/optimizador-selco/export"

SIZE_KB="$(du -sk "${DEB_ROOT}" | awk '{print $1}')"
install -d "${DEB_ROOT}/DEBIAN"
cat > "${DEB_ROOT}/DEBIAN/control" <<EOF
Package: optimizador-selco
Version: ${VERSION}
Section: misc
Priority: optional
Architecture: all
Installed-Size: ${SIZE_KB}
Depends: python3, xdg-utils
Maintainer: Optimizador Selco <selco@local>
Description: Optimizador de placas de melamina para Selco WNT 600
 Programa para optimizar cortes de melamina, ver el esquema 2D,
 generar la orden de trabajo y el despiece 3D, con el catalogo Masisa.
EOF
install -m 755 "${PACK}/postinst" "${DEB_ROOT}/DEBIAN/postinst"
install -m 755 "${PACK}/postrm" "${DEB_ROOT}/DEBIAN/postrm"

DEB_FILE="${OUT}/Optimizador-Selco_${VERSION}_all.deb"
dpkg-deb --root-owner-group --build "${DEB_ROOT}" "${DEB_FILE}"

# --- Windows ---
WIN_STAGE="${WORK}/win"
stage_app "${WIN_STAGE}"
# PowerShell 5.1 de Windows lee bien los acentos si el archivo lleva BOM.
python3 - <<'PY' "${WIN_STAGE}/servidor.ps1"
import pathlib, sys
p = pathlib.Path(sys.argv[1])
text = p.read_text(encoding="utf-8")
p.write_bytes(b"\xef\xbb\xbf" + text.encode("utf-8"))
PY

EXE_FILE="${OUT}/Optimizador-Selco_${VERSION}_Windows.exe"
makensis -V2 \
    -DAPP_VERSION="${VERSION}" \
    -DOUTFILE="${EXE_FILE}" \
    -DICON="${WORK}/icono.ico" \
    -DSTAGING="${WIN_STAGE}" \
    "${PACK}/instalador.nsi"

echo "DEB ${DEB_FILE}"
echo "EXE ${EXE_FILE}"
ls -lh "${DEB_FILE}" "${EXE_FILE}"
