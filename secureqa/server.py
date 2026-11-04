"""Start and stop the SecureShop demo application in a background process.

The tests (``tests/conftest.py``) and the CLI (``run.py app``) both use :class:`DemoServer`.
SecureShop is built *securely* (no intentional vulnerabilities); we run it to prove that
good defenses stay in place (defensive regression testing).
(TR: Demo uygulamayı arka planda başlatan/durduran yardımcı sınıf.)

Example / Örnek::

    from secureqa.server import DemoServer

    with DemoServer() as server:
        print("App is running at", server.base_url)
    # leaving the "with" block stops the app / blok bitince uygulama durur
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from types import TracebackType

import requests

from secureqa.config import PROJECT_ROOT


def find_free_port(host: str = "127.0.0.1") -> int:
    """Ask the operating system for an unused TCP port.

    Binding to port 0 makes the OS choose a free port; we read it and close the socket.
    (TR: İşletim sisteminden boş bir port ister; böylece 5000 doluysa çakışma olmaz.)
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def wait_for_health(base_url: str, timeout_s: float = 25.0) -> str:
    """Poll the health endpoint until the app answers; return the path that worked.

    SecureShop exposes ``GET /healthz``. We also accept the home page ``/`` as a
    fallback so the helper is robust while the app is still being built.
    (TR: Uygulama cevap verene kadar sağlık ucunu yoklar.)

    Raises:
        RuntimeError: if the app does not answer within ``timeout_s`` seconds.
    """
    deadline = time.monotonic() + timeout_s
    last_error = "no response yet"
    while time.monotonic() < deadline:
        for path in ("/healthz", "/"):
            try:
                response = requests.get(base_url + path, timeout=2)
                if response.status_code < 500:
                    return path
                last_error = f"HTTP {response.status_code} at {path}"
            except requests.RequestException as error:  # app is not up yet / henüz açılmadı
                last_error = str(error)
        time.sleep(0.25)
    raise RuntimeError(f"SecureShop did not become healthy at {base_url}: {last_error}")


class DemoServer:
    """Runs ``python -m demo_app`` (SecureShop) as a child process.

    Args:
        host: Interface to bind (always localhost for safety / güvenlik için localhost).
        port: TCP port; ``None`` means "pick a free one".
        log_file: Where the app's output goes (useful when something breaks).
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int | None = None,
        log_file: Path | None = None,
    ) -> None:
        self.host = host
        self.port = port if port is not None else find_free_port(host)
        self.log_file = log_file or (PROJECT_ROOT / "reports" / "secureshop.log")
        self.process: subprocess.Popen | None = None
        self._log_handle = None

    @property
    def base_url(self) -> str:
        """The URL tests should use, e.g. ``http://127.0.0.1:53817``."""
        return f"http://{self.host}:{self.port}"

    def start(self, timeout_s: float = 25.0) -> None:
        """Start the app and block until it is healthy (TR: başlat ve hazır olana kadar bekle)."""
        env = os.environ.copy()
        # SecureShop reads SHOP_HOST/SHOP_PORT; we also set the legacy VULNSHOP_* names.
        env["SHOP_HOST"] = self.host
        env["SHOP_PORT"] = str(self.port)
        env["VULNSHOP_HOST"] = self.host
        env["VULNSHOP_PORT"] = str(self.port)
        # Enables POST /__reset in the demo app (test helper). TR: Test için DB sıfırlamayı açar.
        env.setdefault("SHOP_TESTING", "1")
        env["PYTHONUNBUFFERED"] = "1"

        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self._log_handle = open(self.log_file, "w", encoding="utf-8")
        self.process = subprocess.Popen(
            [sys.executable, "-m", "demo_app"],
            cwd=PROJECT_ROOT,
            env=env,
            stdout=self._log_handle,
            stderr=subprocess.STDOUT,
        )
        try:
            wait_for_health(self.base_url, timeout_s=timeout_s)
        except RuntimeError:
            self.stop()
            log_tail = self.log_file.read_text(encoding="utf-8", errors="replace")[-2000:]
            raise RuntimeError(f"SecureShop failed to start. Log ({self.log_file}):\n{log_tail}") from None

    def stop(self) -> None:
        """Stop the app politely (terminate), or force it (kill) after 5 seconds."""
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        self.process = None
        if self._log_handle is not None:
            self._log_handle.close()
            self._log_handle = None

    def wait(self) -> None:
        """Block until the app exits (used by ``run.py app``; stop with Ctrl+C)."""
        if self.process is not None:
            self.process.wait()

    # "with DemoServer() as server:" support (context manager protocol)
    def __enter__(self) -> "DemoServer":
        self.start()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.stop()
