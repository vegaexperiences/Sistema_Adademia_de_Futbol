# 🔧 Solución: ngrok Endpoint Offline

## Problema
El error `ERR_NGROK_3200` significa que ngrok se desconectó o se detuvo.

## Solución

### 1. Reiniciar ngrok

En una nueva terminal, ejecuta:

```bash
ngrok http 3000
```

### 2. Copiar la Nueva URL

ngrok mostrará algo como:

```
Forwarding   https://NUEVA-URL.ngrok-free.dev -> http://localhost:3000
```

**Copia la URL completa** (ej: `https://abc123.ngrok-free.dev`)

### 3. Actualizar .env.local

Abre `.env.local` y actualiza la línea:

```bash
NEXT_PUBLIC_APP_URL=https://NUEVA-URL.ngrok-free.dev
```

### 4. Reiniciar el Servidor

Detén el servidor (Ctrl+C) y reinicia:

```bash
npm run dev
```

## ⚠️ Nota Importante

**Las URLs gratuitas de ngrok cambian cada vez que reinicias ngrok**. Si reinicias ngrok, necesitas actualizar `.env.local` con la nueva URL.

## Alternativa: Probar sin ngrok

Si no necesitas probar callbacks, puedes:

1. **Comentar la línea en `.env.local`:**
   ```bash
   # NEXT_PUBLIC_APP_URL=https://abrielle-nonparticipating-facially.ngrok-free.dev
   ```

2. **Reiniciar el servidor**

El sistema usará automáticamente `http://localhost:3000` y podrás probar todo excepto los callbacks.

