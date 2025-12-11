# ✅ Verificar que ngrok Funciona

## Pasos para Verificar ngrok

### 1. Iniciar ngrok

En una terminal, ejecuta:

```bash
ngrok http 3000
```

Deberías ver algo como:

```
Session Status                online
Account                       vegaexperiences (Plan: Free)
Forwarding                    https://NUEVA-URL.ngrok-free.dev -> http://localhost:3000
```

### 2. Copiar la URL

Copia la URL que aparece en "Forwarding" (ej: `https://abc123.ngrok-free.dev`)

### 3. Verificar que ngrok Responde

Abre otra terminal y ejecuta:

```bash
curl http://localhost:4040/api/tunnels
```

O simplemente abre en tu navegador: `http://localhost:4040`

Deberías ver la interfaz web de ngrok con la información del túnel.

### 4. Probar la URL de ngrok

Abre en tu navegador la URL de ngrok (ej: `https://abc123.ngrok-free.dev`)

Deberías ver tu aplicación Next.js corriendo.

### 5. Actualizar .env.local

Una vez que tengas la URL de ngrok funcionando:

1. Abre `.env.local`
2. Descomenta y actualiza la línea:
   ```bash
   NEXT_PUBLIC_APP_URL=https://TU_URL_NGROK.ngrok-free.dev
   ```

3. Reinicia el servidor Next.js:
   ```bash
   # Detén el servidor (Ctrl+C)
   npm run dev
   ```

### 6. Verificar en los Logs

Cuando crees un pago, en los logs del servidor deberías ver:

```
[getBaseUrl] Using NEXT_PUBLIC_APP_URL: https://TU_URL_NGROK.ngrok-free.dev
[PagueloFacil Link] Creating payment link with:
  returnUrl: https://TU_URL_NGROK.ngrok-free.dev/api/payments/paguelofacil/callback
```

## 🔍 Troubleshooting

### Si ngrok no inicia:

1. Verifica que el puerto 3000 esté libre:
   ```bash
   lsof -ti:3000
   ```

2. Verifica que el servidor Next.js esté corriendo:
   ```bash
   curl http://localhost:3000
   ```

### Si la URL de ngrok no funciona:

1. Verifica que ngrok esté corriendo:
   ```bash
   ps aux | grep ngrok
   ```

2. Verifica la interfaz web de ngrok:
   ```bash
   open http://localhost:4040
   ```

### Si el callback no funciona:

1. Verifica que `.env.local` tenga la URL correcta
2. Verifica que el servidor se haya reiniciado después de cambiar `.env.local`
3. Revisa los logs del servidor para ver qué URL está usando

