#!/usr/bin/env python3
"""Servidor local del Optimizador Selco. Sirve la página y guarda los archivos de corte."""
import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

APP_DIR = Path("/opt/optimizador-selco")
PORT = 8085


def documents_dir() -> Path:
    for candidate in (Path.home() / "Documentos", Path.home() / "Documents"):
        if candidate.is_dir():
            return candidate
    return Path.home()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def log_message(self, fmt, *args):
        return

    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _action(self) -> str:
        query = parse_qs(urlparse(self.path).query)
        return (query.get("action") or [""])[0]

    def do_GET(self):
        if urlparse(self.path).path == "/api.php":
            self._send_json({"success": True, "service": "Optimizador Selco", "status": "online"})
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api.php" or self._action() != "save_files":
            self._send_json({"success": False, "error": "Accion no disponible"}, 404)
            return
        length = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"success": False, "error": "Datos invalidos"}, 400)
            return
        files = data.get("files") or []
        if not files:
            self._send_json({"success": False, "error": "No se recibieron archivos"}, 400)
            return
        job_name = re.sub(r"[^a-zA-Z0-9_\-]", "", str(data.get("jobName") or "")) or "SELCO_JOB"
        job_dir = documents_dir() / "Optimizador_Selco" / "export" / job_name
        job_dir.mkdir(parents=True, exist_ok=True)
        saved = []
        for item in files:
            filename = Path(str(item.get("filename") or "")).name
            content = str(item.get("content") or "")
            if not filename or not content:
                continue
            crlf = content.replace("\r\n", "\n").replace("\n", "\r\n")
            dest = job_dir / filename
            dest.write_bytes(crlf.encode("utf-8"))
            saved.append({"filename": filename, "path": str(dest), "size": len(crlf)})
        self._send_json({
            "success": True,
            "jobName": job_name,
            "directory": str(job_dir),
            "saved": saved,
            "count": len(saved),
        })


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
