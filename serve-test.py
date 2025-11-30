#!/usr/bin/env python3
"""
Simple HTTP server to serve the CORS test HTML file
Run this script and then visit http://localhost:8000/cors-test.html
"""

import http.server
import socketserver
import webbrowser
import os

# Change to the directory where cors-test.html is located
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🌐 Serving CORS test page at http://localhost:{PORT}/cors-test.html")
    print(f"📱 Opening browser...")
    
    # Open the browser automatically
    webbrowser.open(f'http://localhost:{PORT}/cors-test.html')
    
    print(f"🛑 Press Ctrl+C to stop the server")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🔴 Server stopped")