#!/bin/bash
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); tunnels = data.get('tunnels', []); print(tunnels[0]['public_url'] if tunnels else '')" 2>/dev/null)
    if [ ! -z "$URL" ]; then
        echo "✅ ngrok está corriendo"
        echo "🌐 URL: $URL"
        echo ""
        echo "Para actualizar .env.local, ejecuta:"
        echo "  sed -i '' 's|#NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$URL|' .env.local"
        echo "  # O manualmente edita .env.local y agrega:"
        echo "  # NEXT_PUBLIC_APP_URL=$URL"
    else
        echo "⚠️  ngrok está corriendo pero no se pudo obtener la URL"
        echo "Abre http://localhost:4040 para ver la URL"
    fi
else
    echo "❌ ngrok NO está corriendo"
    echo "Ejecuta: ngrok http 3000"
fi
