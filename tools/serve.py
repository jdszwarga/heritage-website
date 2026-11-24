"""Local preview that answers like GitHub Pages: /church serves church.html, and a missing page shows 404.html.

Run from the project folder:   python tools/serve.py 4871
"""
import http.server, os, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=root, **kwargs)

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        local = self.translate_path(path)
        if not os.path.exists(local) and os.path.isfile(local + ".html"):
            self.path = path + ".html" + self.path[len(path):]
        elif not os.path.exists(local):
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            body = open(os.path.join(root, "404.html"), "rb").read()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return None
        return super().send_head()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 4871
http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
