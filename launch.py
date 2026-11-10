"""Start the local bilingual generator and open it in a browser."""
import functools
import http.server
import threading
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HOST, PORT = '127.0.0.1', 8342
URL = f'http://{HOST}:{PORT}/'


def main():
    from bootstrap_runtime import ensure_runtime
    ensure_runtime()
    if not (ROOT / 'site/index.html').exists():
        from build_ru import build
        build()
    try:
        with urllib.request.urlopen(URL, timeout=2) as response:
            page = response.read().decode('utf-8')
        if 'window.__RU_PARAMETER_NAMES__' not in page:
            raise RuntimeError('Порт 8342 занят другим приложением. Закройте его и запустите снова.')
        webbrowser.open(URL)
        print('Генератор уже работает: ' + URL)
        return
    except (urllib.error.URLError, TimeoutError):
        pass
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / 'site'))
    with http.server.ThreadingHTTPServer((HOST, PORT), handler) as server:
        print('VETKA Gridfinity Plus: ' + URL)
        print('Не закрывайте это окно, пока пользуетесь генератором. Для остановки нажмите Ctrl+C.')
        threading.Timer(0.5, lambda: webbrowser.open(URL)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nСервер остановлен.')


if __name__ == '__main__':
    main()
