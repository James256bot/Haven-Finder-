import http.server
import socketserver
import json
import urllib.request

PORT = 3000
API = 'http://127.0.0.1:8000'

class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            try:
                req = urllib.request.Request(API + self.path)
                with urllib.request.urlopen(req, timeout=10) as r:
                    data = r.read()
                    self.send_response(r.status)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success':False,'error':str(e)}).encode())
                return
        super().do_GET()
    
    def do_POST(self):
        if self.path.startswith('/api/'):
            try:
                cl = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(cl) if cl > 0 else None
                req = urllib.request.Request(API + self.path, data=body, headers={'Content-Type':'application/json'})
                with urllib.request.urlopen(req, timeout=10) as r:
                    data = r.read()
                    self.send_response(r.status)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(data)
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error':str(e)}).encode())
                return
        super().do_POST()
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

with socketserver.ThreadingTCPServer(("", PORT), H) as httpd:
    print(f"✅ Proxy server: http://127.0.0.1:3000 → {API}")
    httpd.serve_forever()
